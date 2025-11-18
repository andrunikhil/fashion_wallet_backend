import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger, UseGuards, ForbiddenException, NotFoundException } from '@nestjs/common';
import { WsJwtAuthGuard } from '../../../shared/guards/ws-jwt-auth.guard';
import { CollaborationService } from '../services/collaboration.service';
import { DesignRepository } from '../repositories/design.repository';
import { CollaboratorRepository } from '../repositories/collaborator.repository';

/**
 * WebSocket Gateway for Design Service
 * Handles real-time collaboration and updates for design editing
 *
 * Authentication is handled by WsJwtAuthGuard
 * JWT token should be provided via:
 * - Query param: ?token=<jwt>
 * - Auth object: { auth: { token: '<jwt>' } }
 */
@WebSocketGateway({
  namespace: '/design',
  cors: {
    origin: process.env.CORS_ORIGIN || '*',
    credentials: true,
  },
  transports: ['websocket', 'polling'],
})
@UseGuards(WsJwtAuthGuard)
export class DesignGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(DesignGateway.name);

  constructor(
    private readonly collaborationService: CollaborationService,
    private readonly designRepo: DesignRepository,
    private readonly collaboratorRepo: CollaboratorRepository,
  ) {}

  /**
   * Handle client connection
   */
  async handleConnection(client: Socket) {
    try {
      // User is already authenticated by WsJwtAuthGuard
      // User data is attached to client.data by the guard
      const userId = client.data.userId;
      const user = client.data.user;

      this.logger.log(`Client connected: ${client.id} (User: ${userId})`);
    } catch (error) {
      this.logger.error(`Connection failed for ${client.id}:`, error);
      client.disconnect();
    }
  }

  /**
   * Handle client disconnection
   */
  async handleDisconnect(client: Socket) {
    const userId = client.data.userId;
    const designId = client.data.designId;

    this.logger.log(`Client disconnected: ${client.id} (User: ${userId})`);

    if (designId && userId) {
      try {
        // Remove user from design room
        await this.collaborationService.removeUserFromDesign(designId, userId);

        // Notify other users in the room
        this.server.to(`design:${designId}`).emit('user:left', {
          userId,
          timestamp: new Date(),
        });
      } catch (error) {
        this.logger.error(`Error handling disconnect for ${client.id}:`, error);
      }
    }
  }

  /**
   * Join a design room for collaboration
   */
  @SubscribeMessage('design:join')
  async handleJoinDesign(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { designId: string },
  ) {
    try {
      const userId = client.data.userId;
      const { designId } = data;

      this.logger.log(`User ${userId} joining design ${designId}`);

      // Verify user has access to the design
      await this.verifyDesignAccess(designId, userId);

      // Leave previous design room if any
      if (client.data.designId) {
        client.leave(`design:${client.data.designId}`);
      }

      // Join new design room
      client.join(`design:${designId}`);
      client.data.designId = designId;

      // Add user to collaboration tracking
      await this.collaborationService.addUserToDesign(designId, userId, client.id);

      // Get current active users
      const activeUsers = await this.collaborationService.getActiveUsers(designId);

      // Notify others that user joined
      client.to(`design:${designId}`).emit('user:joined', {
        userId,
        timestamp: new Date(),
      });

      // Send current state to the joining user
      return {
        success: true,
        activeUsers,
        timestamp: new Date(),
      };
    } catch (error) {
      this.logger.error(`Error joining design:`, error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Leave a design room
   */
  @SubscribeMessage('design:leave')
  async handleLeaveDesign(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { designId: string },
  ) {
    try {
      const userId = client.data.userId;
      const { designId } = data;

      this.logger.log(`User ${userId} leaving design ${designId}`);

      // Leave the room
      client.leave(`design:${designId}`);
      client.data.designId = null;

      // Remove from collaboration tracking
      await this.collaborationService.removeUserFromDesign(designId, userId);

      // Notify others
      this.server.to(`design:${designId}`).emit('user:left', {
        userId,
        timestamp: new Date(),
      });

      return { success: true };
    } catch (error) {
      this.logger.error(`Error leaving design:`, error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Broadcast design metadata update
   */
  @SubscribeMessage('design:updated')
  async handleDesignUpdated(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { designId: string; updates: any },
  ) {
    try {
      const userId = client.data.userId;
      const { designId, updates } = data;

      this.logger.debug(`Design ${designId} updated by ${userId}`);

      // Record the update
      await this.collaborationService.recordUpdate(designId, userId, 'design:updated', updates);

      // Broadcast to all other users in the room
      client.to(`design:${designId}`).emit('design:updated', {
        userId,
        updates,
        timestamp: new Date(),
      });

      return { success: true };
    } catch (error) {
      this.logger.error(`Error broadcasting design update:`, error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Broadcast layer added event
   */
  @SubscribeMessage('layer:added')
  async handleLayerAdded(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { designId: string; layer: any },
  ) {
    try {
      const userId = client.data.userId;
      const { designId, layer } = data;

      this.logger.debug(`Layer added to design ${designId} by ${userId}`);

      await this.collaborationService.recordUpdate(designId, userId, 'layer:added', layer);

      client.to(`design:${designId}`).emit('layer:added', {
        userId,
        layer,
        timestamp: new Date(),
      });

      return { success: true };
    } catch (error) {
      this.logger.error(`Error broadcasting layer added:`, error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Broadcast layer updated event
   */
  @SubscribeMessage('layer:updated')
  async handleLayerUpdated(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { designId: string; layerId: string; updates: any },
  ) {
    try {
      const userId = client.data.userId;
      const { designId, layerId, updates } = data;

      this.logger.debug(`Layer ${layerId} updated in design ${designId} by ${userId}`);

      // Check if layer is locked by another user
      const lockedBy = await this.collaborationService.getLayerLock(designId, layerId);
      if (lockedBy && lockedBy !== userId) {
        return {
          success: false,
          error: 'Layer is locked by another user',
          lockedBy,
        };
      }

      await this.collaborationService.recordUpdate(designId, userId, 'layer:updated', {
        layerId,
        updates,
      });

      client.to(`design:${designId}`).emit('layer:updated', {
        userId,
        layerId,
        updates,
        timestamp: new Date(),
      });

      return { success: true };
    } catch (error) {
      this.logger.error(`Error broadcasting layer update:`, error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Broadcast layer deleted event
   */
  @SubscribeMessage('layer:deleted')
  async handleLayerDeleted(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { designId: string; layerId: string },
  ) {
    try {
      const userId = client.data.userId;
      const { designId, layerId } = data;

      this.logger.debug(`Layer ${layerId} deleted from design ${designId} by ${userId}`);

      await this.collaborationService.recordUpdate(designId, userId, 'layer:deleted', { layerId });

      client.to(`design:${designId}`).emit('layer:deleted', {
        userId,
        layerId,
        timestamp: new Date(),
      });

      return { success: true };
    } catch (error) {
      this.logger.error(`Error broadcasting layer deleted:`, error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Broadcast layer reordering event
   */
  @SubscribeMessage('layer:reordered')
  async handleLayerReordered(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { designId: string; layerOrder: string[] },
  ) {
    try {
      const userId = client.data.userId;
      const { designId, layerOrder } = data;

      this.logger.debug(`Layers reordered in design ${designId} by ${userId}`);

      await this.collaborationService.recordUpdate(designId, userId, 'layer:reordered', { layerOrder });

      client.to(`design:${designId}`).emit('layer:reordered', {
        userId,
        layerOrder,
        timestamp: new Date(),
      });

      return { success: true };
    } catch (error) {
      this.logger.error(`Error broadcasting layer reordered:`, error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Broadcast canvas settings update
   */
  @SubscribeMessage('canvas:updated')
  async handleCanvasUpdated(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { designId: string; settings: any },
  ) {
    try {
      const userId = client.data.userId;
      const { designId, settings } = data;

      this.logger.debug(`Canvas settings updated in design ${designId} by ${userId}`);

      await this.collaborationService.recordUpdate(designId, userId, 'canvas:updated', settings);

      client.to(`design:${designId}`).emit('canvas:updated', {
        userId,
        settings,
        timestamp: new Date(),
      });

      return { success: true };
    } catch (error) {
      this.logger.error(`Error broadcasting canvas update:`, error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Lock a layer for editing
   */
  @SubscribeMessage('layer:lock')
  async handleLayerLock(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { designId: string; layerId: string },
  ) {
    try {
      const userId = client.data.userId;
      const { designId, layerId } = data;

      const locked = await this.collaborationService.lockLayer(designId, layerId, userId);

      if (locked) {
        client.to(`design:${designId}`).emit('layer:locked', {
          userId,
          layerId,
          timestamp: new Date(),
        });
      }

      return { success: locked };
    } catch (error) {
      this.logger.error(`Error locking layer:`, error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Unlock a layer
   */
  @SubscribeMessage('layer:unlock')
  async handleLayerUnlock(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { designId: string; layerId: string },
  ) {
    try {
      const userId = client.data.userId;
      const { designId, layerId } = data;

      await this.collaborationService.unlockLayer(designId, layerId, userId);

      client.to(`design:${designId}`).emit('layer:unlocked', {
        userId,
        layerId,
        timestamp: new Date(),
      });

      return { success: true };
    } catch (error) {
      this.logger.error(`Error unlocking layer:`, error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Update user cursor position
   */
  @SubscribeMessage('cursor:move')
  async handleCursorMove(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { designId: string; position: { x: number; y: number } },
  ) {
    try {
      const userId = client.data.userId;
      const { designId, position } = data;

      // Throttled broadcast of cursor position
      client.to(`design:${designId}`).emit('cursor:moved', {
        userId,
        position,
        timestamp: new Date(),
      });

      return { success: true };
    } catch (error) {
      // Don't log cursor errors (too noisy)
      return { success: false };
    }
  }

  /**
   * Verify user has access to design
   */
  private async verifyDesignAccess(
    designId: string,
    userId: string,
  ): Promise<void> {
    const design = await this.designRepo.findById(designId);

    if (!design) {
      throw new NotFoundException(`Design with ID ${designId} not found`);
    }

    // Owner always has full access
    if (design.userId === userId) {
      return;
    }

    // Check if design is public (allow viewing)
    if (design.visibility === 'public') {
      return;
    }

    // Check collaborators table for shared designs
    if (design.visibility === 'shared') {
      const hasAccess = await this.collaboratorRepo.hasAccess(
        designId,
        userId,
        'viewer', // WebSocket access requires at least viewer role
      );

      if (hasAccess) {
        return;
      }
    }

    throw new ForbiddenException('You do not have access to this design');
  }

}

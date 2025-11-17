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
import { Logger, UseGuards } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ProcessingUpdate } from '../../queue/interfaces/job.interface';

@WebSocketGateway({
  namespace: '/avatar',
  cors: {
    origin: process.env.FRONTEND_URL || '*',
    credentials: true,
  },
})
export class AvatarGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(AvatarGateway.name);
  private userSockets = new Map<string, Set<string>>(); // userId -> socketIds

  constructor(private readonly configService: ConfigService) {}

  async handleConnection(client: Socket) {
    try {
      // Extract user ID from handshake (assuming JWT in auth header)
      const token = client.handshake.auth.token;

      if (!token) {
        this.logger.warn(`Client ${client.id} connected without token`);
        client.disconnect();
        return;
      }

      // TODO: Verify JWT token and extract userId
      // For now, accept connection
      const userId = client.handshake.auth.userId || 'anonymous';

      client.data.userId = userId;

      // Track socket
      if (!this.userSockets.has(userId)) {
        this.userSockets.set(userId, new Set());
      }
      this.userSockets.get(userId)!.add(client.id);

      this.logger.log(`Client connected: ${client.id} (user: ${userId})`);
    } catch (error) {
      this.logger.error('Connection authentication failed:', error);
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    const userId = client.data.userId;

    if (userId && this.userSockets.has(userId)) {
      this.userSockets.get(userId)!.delete(client.id);

      if (this.userSockets.get(userId)!.size === 0) {
        this.userSockets.delete(userId);
      }
    }

    this.logger.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('avatar:subscribe')
  handleSubscribe(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { avatarId: string },
  ) {
    client.join(`avatar:${data.avatarId}`);
    this.logger.log(
      `Client ${client.id} subscribed to avatar ${data.avatarId}`,
    );

    return { event: 'subscribed', avatarId: data.avatarId };
  }

  @SubscribeMessage('avatar:unsubscribe')
  handleUnsubscribe(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { avatarId: string },
  ) {
    client.leave(`avatar:${data.avatarId}`);
    this.logger.log(
      `Client ${client.id} unsubscribed from avatar ${data.avatarId}`,
    );

    return { event: 'unsubscribed', avatarId: data.avatarId };
  }

  // Called by event listeners
  emitProcessingUpdate(avatarId: string, update: ProcessingUpdate) {
    this.server.to(`avatar:${avatarId}`).emit('avatar:processing:update', update);
    this.logger.debug(`Emitted processing update for avatar ${avatarId}`);
  }

  emitProcessingComplete(avatarId: string, data: any) {
    this.server.to(`avatar:${avatarId}`).emit('avatar:processing:complete', data);
    this.logger.log(`Emitted processing complete for avatar ${avatarId}`);
  }

  emitProcessingError(avatarId: string, error: any) {
    this.server.to(`avatar:${avatarId}`).emit('avatar:processing:error', error);
    this.logger.log(`Emitted processing error for avatar ${avatarId}`);
  }

  emitStatusUpdate(avatarId: string, status: any) {
    this.server.to(`avatar:${avatarId}`).emit('avatar:status:update', status);
    this.logger.debug(`Emitted status update for avatar ${avatarId}`);
  }

  emitToUser(userId: string, event: string, data: any) {
    const socketIds = this.userSockets.get(userId);

    if (socketIds) {
      socketIds.forEach((socketId) => {
        this.server.to(socketId).emit(event, data);
      });

      this.logger.debug(`Emitted ${event} to user ${userId}`);
    }
  }
}

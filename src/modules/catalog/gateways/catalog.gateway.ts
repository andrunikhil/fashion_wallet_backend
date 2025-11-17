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
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CatalogItem } from '../entities';

/**
 * WebSocket Gateway for real-time catalog updates
 * Provides real-time notifications for catalog changes, search updates, and recommendations
 */
@WebSocketGateway({
  namespace: '/catalog',
  cors: {
    origin: process.env.FRONTEND_URL || '*',
    credentials: true,
  },
})
export class CatalogGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(CatalogGateway.name);
  private userSockets = new Map<string, Set<string>>(); // userId -> socketIds
  private categorySubscriptions = new Map<string, Set<string>>(); // category -> socketIds

  constructor(private readonly configService: ConfigService) {}

  /**
   * Handle client connection
   */
  async handleConnection(client: Socket) {
    try {
      // Extract user ID from handshake
      const token = client.handshake.auth.token;

      if (!token) {
        this.logger.warn(`Client ${client.id} connected without token`);
        // Allow anonymous connections for catalog browsing
      }

      const userId = client.handshake.auth.userId || 'anonymous';
      client.data.userId = userId;

      // Track socket
      if (!this.userSockets.has(userId)) {
        this.userSockets.set(userId, new Set());
      }
      this.userSockets.get(userId)!.add(client.id);

      this.logger.log(`Catalog client connected: ${client.id} (user: ${userId})`);

      // Send connection acknowledgment
      client.emit('catalog:connected', {
        message: 'Connected to catalog updates',
        timestamp: new Date(),
      });
    } catch (error) {
      this.logger.error('Connection error:', error);
    }
  }

  /**
   * Handle client disconnection
   */
  handleDisconnect(client: Socket) {
    const userId = client.data.userId;

    if (userId && this.userSockets.has(userId)) {
      this.userSockets.get(userId)!.delete(client.id);

      if (this.userSockets.get(userId)!.size === 0) {
        this.userSockets.delete(userId);
      }
    }

    // Clean up category subscriptions
    for (const [category, socketIds] of this.categorySubscriptions.entries()) {
      socketIds.delete(client.id);
      if (socketIds.size === 0) {
        this.categorySubscriptions.delete(category);
      }
    }

    this.logger.log(`Catalog client disconnected: ${client.id}`);
  }

  /**
   * Subscribe to all catalog updates
   */
  @SubscribeMessage('catalog:subscribe:all')
  handleSubscribeAll(@ConnectedSocket() client: Socket) {
    client.join('catalog:updates:all');
    this.logger.debug(`Client ${client.id} subscribed to all catalog updates`);

    client.emit('catalog:subscribed', {
      channel: 'all',
      message: 'Subscribed to all catalog updates',
    });
  }

  /**
   * Subscribe to specific category updates
   */
  @SubscribeMessage('catalog:subscribe:category')
  handleSubscribeCategory(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { category: string }
  ) {
    const channel = `catalog:category:${data.category}`;
    client.join(channel);

    // Track category subscription
    if (!this.categorySubscriptions.has(data.category)) {
      this.categorySubscriptions.set(data.category, new Set());
    }
    this.categorySubscriptions.get(data.category)!.add(client.id);

    this.logger.debug(
      `Client ${client.id} subscribed to category: ${data.category}`
    );

    client.emit('catalog:subscribed', {
      channel: `category:${data.category}`,
      message: `Subscribed to ${data.category} updates`,
    });
  }

  /**
   * Subscribe to specific item updates
   */
  @SubscribeMessage('catalog:subscribe:item')
  handleSubscribeItem(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { itemId: string }
  ) {
    const channel = `catalog:item:${data.itemId}`;
    client.join(channel);

    this.logger.debug(`Client ${client.id} subscribed to item: ${data.itemId}`);

    client.emit('catalog:subscribed', {
      channel: `item:${data.itemId}`,
      message: `Subscribed to item ${data.itemId} updates`,
    });
  }

  /**
   * Subscribe to trending updates
   */
  @SubscribeMessage('catalog:subscribe:trending')
  handleSubscribeTrending(@ConnectedSocket() client: Socket) {
    client.join('catalog:trending');

    this.logger.debug(`Client ${client.id} subscribed to trending updates`);

    client.emit('catalog:subscribed', {
      channel: 'trending',
      message: 'Subscribed to trending items',
    });
  }

  /**
   * Unsubscribe from a channel
   */
  @SubscribeMessage('catalog:unsubscribe')
  handleUnsubscribe(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { channel: string }
  ) {
    client.leave(data.channel);

    this.logger.debug(`Client ${client.id} unsubscribed from: ${data.channel}`);

    client.emit('catalog:unsubscribed', {
      channel: data.channel,
    });
  }

  /**
   * Notify catalog item created
   */
  notifyCatalogItemCreated(item: CatalogItem): void {
    this.server.to('catalog:updates:all').emit('catalog:item:created', {
      item: this.sanitizeItem(item),
      timestamp: new Date(),
    });

    if (item.category) {
      this.server
        .to(`catalog:category:${item.category}`)
        .emit('catalog:item:created', {
          item: this.sanitizeItem(item),
          timestamp: new Date(),
        });
    }

    this.logger.debug(`Notified clients of item created: ${item.id}`);
  }

  /**
   * Notify catalog item updated
   */
  notifyCatalogItemUpdated(item: CatalogItem): void {
    this.server.to('catalog:updates:all').emit('catalog:item:updated', {
      item: this.sanitizeItem(item),
      timestamp: new Date(),
    });

    this.server.to(`catalog:item:${item.id}`).emit('catalog:item:updated', {
      item: this.sanitizeItem(item),
      timestamp: new Date(),
    });

    if (item.category) {
      this.server
        .to(`catalog:category:${item.category}`)
        .emit('catalog:item:updated', {
          item: this.sanitizeItem(item),
          timestamp: new Date(),
        });
    }

    this.logger.debug(`Notified clients of item updated: ${item.id}`);
  }

  /**
   * Notify catalog item deleted
   */
  notifyCatalogItemDeleted(itemId: string, category?: string): void {
    this.server.to('catalog:updates:all').emit('catalog:item:deleted', {
      itemId,
      timestamp: new Date(),
    });

    this.server.to(`catalog:item:${itemId}`).emit('catalog:item:deleted', {
      itemId,
      timestamp: new Date(),
    });

    if (category) {
      this.server
        .to(`catalog:category:${category}`)
        .emit('catalog:item:deleted', {
          itemId,
          timestamp: new Date(),
        });
    }

    this.logger.debug(`Notified clients of item deleted: ${itemId}`);
  }

  /**
   * Notify trending items update
   */
  notifyTrendingUpdate(trendingItemIds: string[]): void {
    this.server.to('catalog:trending').emit('catalog:trending:updated', {
      itemIds: trendingItemIds,
      timestamp: new Date(),
    });

    this.logger.debug(`Notified clients of trending items update`);
  }

  /**
   * Notify collection updated
   */
  notifyCollectionUpdated(collectionId: string, action: string): void {
    this.server.emit('catalog:collection:updated', {
      collectionId,
      action,
      timestamp: new Date(),
    });

    this.logger.debug(
      `Notified clients of collection ${action}: ${collectionId}`
    );
  }

  /**
   * Send personalized recommendation to user
   */
  notifyUserRecommendation(userId: string, recommendations: any[]): void {
    const userSocketIds = this.userSockets.get(userId);

    if (userSocketIds && userSocketIds.size > 0) {
      userSocketIds.forEach((socketId) => {
        this.server.to(socketId).emit('catalog:recommendation:new', {
          recommendations,
          timestamp: new Date(),
        });
      });

      this.logger.debug(`Sent recommendations to user: ${userId}`);
    }
  }

  /**
   * Broadcast search result update (e.g., when items are indexed)
   */
  notifySearchIndexUpdated(itemCount: number): void {
    this.server.emit('catalog:search:index:updated', {
      itemCount,
      timestamp: new Date(),
    });

    this.logger.debug(`Notified clients of search index update: ${itemCount} items`);
  }

  /**
   * Get connected users count
   */
  getConnectedUsersCount(): number {
    return this.userSockets.size;
  }

  /**
   * Get total connections count
   */
  getConnectionsCount(): number {
    let total = 0;
    this.userSockets.forEach((sockets) => {
      total += sockets.size;
    });
    return total;
  }

  /**
   * Sanitize item for client (remove sensitive data)
   */
  private sanitizeItem(item: CatalogItem): any {
    return {
      id: item.id,
      type: item.type,
      name: item.name,
      description: item.description,
      category: item.category,
      subcategory: item.subcategory,
      tags: item.tags,
      thumbnailUrl: item.thumbnailUrl,
      previewImages: item.previewImages,
      isActive: item.isActive,
      isFeatured: item.isFeatured,
      popularityScore: item.popularityScore,
      properties: item.properties,
    };
  }
}

import { Injectable, Logger } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { UserInteractionDto } from '../dto/recommendation.dto';
import { CatalogItemRepository } from '../repositories';

/**
 * Service for tracking user interactions with catalog items
 * Used to improve recommendations and analytics
 */
@Injectable()
export class UserInteractionService {
  private readonly logger = new Logger(UserInteractionService.name);
  private interactionBuffer: UserInteractionDto[] = [];
  private readonly BUFFER_SIZE = 100;
  private readonly FLUSH_INTERVAL = 10000; // 10 seconds

  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly catalogItemRepository: CatalogItemRepository
  ) {
    // Flush buffer periodically
    setInterval(() => this.flushInteractions(), this.FLUSH_INTERVAL);
  }

  /**
   * Track a user interaction (non-blocking)
   */
  async trackInteraction(interaction: UserInteractionDto): Promise<void> {
    this.logger.debug(
      `Tracking ${interaction.interactionType} for user ${interaction.userId} on item ${interaction.itemId}`
    );

    // Add to buffer
    this.interactionBuffer.push(interaction);

    // Update item counters asynchronously
    this.updateItemCounters(interaction).catch((err) =>
      this.logger.error('Failed to update item counters', err.stack)
    );

    // Flush if buffer is full
    if (this.interactionBuffer.length >= this.BUFFER_SIZE) {
      this.flushInteractions().catch((err) =>
        this.logger.error('Failed to flush interactions', err.stack)
      );
    }
  }

  /**
   * Track view interaction
   */
  async trackView(userId: string, itemId: string): Promise<void> {
    await this.trackInteraction({
      userId,
      itemId,
      interactionType: 'view',
    });
  }

  /**
   * Track use interaction (item added to design)
   */
  async trackUse(userId: string, itemId: string): Promise<void> {
    await this.trackInteraction({
      userId,
      itemId,
      interactionType: 'use',
    });
  }

  /**
   * Track favorite interaction
   */
  async trackFavorite(userId: string, itemId: string): Promise<void> {
    await this.trackInteraction({
      userId,
      itemId,
      interactionType: 'favorite',
    });
  }

  /**
   * Track search interaction
   */
  async trackSearch(
    userId: string,
    itemId: string,
    query?: string
  ): Promise<void> {
    await this.trackInteraction({
      userId,
      itemId,
      interactionType: 'search',
      context: { query },
    });
  }

  /**
   * Get user's recent interactions
   */
  async getUserRecentInteractions(
    userId: string,
    limit: number = 50,
    interactionType?: string
  ): Promise<any[]> {
    const query = `
      SELECT
        ia.*,
        ci.name,
        ci.type,
        ci.category
      FROM catalog.item_analytics ia
      JOIN catalog.items ci ON ia.item_id = ci.id
      WHERE ia.user_id = $1
        ${interactionType ? 'AND ia.interaction_type = $3' : ''}
      ORDER BY ia.created_at DESC
      LIMIT $2
    `;

    const params = interactionType
      ? [userId, limit, interactionType]
      : [userId, limit];

    return this.dataSource.query(query, params);
  }

  /**
   * Get most interacted items for a user
   */
  async getUserTopItems(
    userId: string,
    limit: number = 20
  ): Promise<string[]> {
    const query = `
      SELECT item_id, COUNT(*) as interaction_count
      FROM catalog.item_analytics
      WHERE user_id = $1
      GROUP BY item_id
      ORDER BY interaction_count DESC
      LIMIT $2
    `;

    const results = await this.dataSource.query(query, [userId, limit]);
    return results.map((r: any) => r.item_id);
  }

  /**
   * Update item counters based on interaction type
   */
  private async updateItemCounters(
    interaction: UserInteractionDto
  ): Promise<void> {
    switch (interaction.interactionType) {
      case 'view':
        await this.catalogItemRepository.incrementViewCount(interaction.itemId);
        break;
      case 'use':
        await this.catalogItemRepository.incrementUseCount(interaction.itemId);
        break;
      case 'favorite':
        // Favorite count is managed by UserFavoriteRepository
        break;
    }

    // Update popularity score periodically
    if (Math.random() < 0.1) {
      // 10% chance to recalculate
      await this.catalogItemRepository.updatePopularityScore(
        interaction.itemId
      );
    }
  }

  /**
   * Flush buffered interactions to database
   */
  private async flushInteractions(): Promise<void> {
    if (this.interactionBuffer.length === 0) return;

    const interactions = [...this.interactionBuffer];
    this.interactionBuffer = [];

    try {
      // Batch insert into analytics table
      const query = `
        INSERT INTO catalog.item_analytics
          (item_id, user_id, interaction_type, context, created_at)
        VALUES ${interactions.map((_, i) => `($${i * 4 + 1}, $${i * 4 + 2}, $${i * 4 + 3}, $${i * 4 + 4}::jsonb, NOW())`).join(', ')}
        ON CONFLICT DO NOTHING
      `;

      const params = interactions.flatMap((int) => [
        int.itemId,
        int.userId,
        int.interactionType,
        JSON.stringify(int.context || {}),
      ]);

      await this.dataSource.query(query, params);

      this.logger.debug(`Flushed ${interactions.length} interactions to database`);
    } catch (error) {
      this.logger.error(
        `Failed to flush interactions: ${error.message}`,
        error.stack
      );
      // Re-add failed interactions to buffer
      this.interactionBuffer.unshift(...interactions);
    }
  }

  /**
   * Get interaction statistics for an item
   */
  async getItemInteractionStats(itemId: string): Promise<{
    views: number;
    uses: number;
    favorites: number;
    shares: number;
    uniqueUsers: number;
  }> {
    const query = `
      SELECT
        COUNT(CASE WHEN interaction_type = 'view' THEN 1 END) as views,
        COUNT(CASE WHEN interaction_type = 'use' THEN 1 END) as uses,
        COUNT(CASE WHEN interaction_type = 'favorite' THEN 1 END) as favorites,
        COUNT(CASE WHEN interaction_type = 'share' THEN 1 END) as shares,
        COUNT(DISTINCT user_id) as unique_users
      FROM catalog.item_analytics
      WHERE item_id = $1
    `;

    const [result] = await this.dataSource.query(query, [itemId]);

    return {
      views: parseInt(result.views) || 0,
      uses: parseInt(result.uses) || 0,
      favorites: parseInt(result.favorites) || 0,
      shares: parseInt(result.shares) || 0,
      uniqueUsers: parseInt(result.unique_users) || 0,
    };
  }

  /**
   * Get trending items based on recent interactions
   */
  async getTrendingItems(
    days: number = 7,
    limit: number = 24
  ): Promise<string[]> {
    const query = `
      SELECT
        item_id,
        COUNT(*) as recent_interactions,
        COUNT(DISTINCT user_id) as unique_users
      FROM catalog.item_analytics
      WHERE created_at > NOW() - INTERVAL '${days} days'
      GROUP BY item_id
      ORDER BY recent_interactions DESC, unique_users DESC
      LIMIT $1
    `;

    const results = await this.dataSource.query(query, [limit]);
    return results.map((r: any) => r.item_id);
  }

  /**
   * Clear interaction buffer (useful for testing)
   */
  clearBuffer(): void {
    this.interactionBuffer = [];
  }
}

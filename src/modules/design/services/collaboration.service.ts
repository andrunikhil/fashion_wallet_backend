import { Injectable, Logger, Inject } from '@nestjs/common';
import Redis from 'ioredis';

/**
 * Collaboration Service
 * Manages real-time collaboration features for design editing
 * - User presence tracking
 * - Layer locking
 * - Update tracking
 */
@Injectable()
export class CollaborationService {
  private readonly logger = new Logger(CollaborationService.name);

  // Redis key prefixes
  private readonly ACTIVE_USERS_PREFIX = 'design:active_users:';
  private readonly LAYER_LOCK_PREFIX = 'design:layer_lock:';
  private readonly USER_SESSION_PREFIX = 'design:user_session:';
  private readonly UPDATE_LOG_PREFIX = 'design:updates:';

  // TTLs
  private readonly USER_PRESENCE_TTL = 300; // 5 minutes
  private readonly LAYER_LOCK_TTL = 600; // 10 minutes
  private readonly UPDATE_LOG_TTL = 3600; // 1 hour

  constructor(
    @Inject('REDIS_CLIENT')
    private readonly redis: Redis,
  ) {}

  /**
   * Add user to a design room
   */
  async addUserToDesign(
    designId: string,
    userId: string,
    socketId: string,
  ): Promise<void> {
    const activeUsersKey = `${this.ACTIVE_USERS_PREFIX}${designId}`;
    const userSessionKey = `${this.USER_SESSION_PREFIX}${userId}:${designId}`;

    try {
      // Add user to active users set with timestamp
      const userData = JSON.stringify({
        userId,
        socketId,
        joinedAt: new Date().toISOString(),
      });

      await this.redis.hset(activeUsersKey, userId, userData);
      await this.redis.expire(activeUsersKey, this.USER_PRESENCE_TTL);

      // Store user session
      await this.redis.setex(
        userSessionKey,
        this.USER_PRESENCE_TTL,
        JSON.stringify({ socketId, designId }),
      );

      this.logger.log(`User ${userId} added to design ${designId}`);
    } catch (error) {
      this.logger.error(`Error adding user to design:`, error);
      throw error;
    }
  }

  /**
   * Remove user from a design room
   */
  async removeUserFromDesign(designId: string, userId: string): Promise<void> {
    const activeUsersKey = `${this.ACTIVE_USERS_PREFIX}${designId}`;
    const userSessionKey = `${this.USER_SESSION_PREFIX}${userId}:${designId}`;

    try {
      // Remove user from active users
      await this.redis.hdel(activeUsersKey, userId);

      // Delete user session
      await this.redis.del(userSessionKey);

      // Release any locks held by this user
      await this.releaseUserLocks(designId, userId);

      this.logger.log(`User ${userId} removed from design ${designId}`);
    } catch (error) {
      this.logger.error(`Error removing user from design:`, error);
      throw error;
    }
  }

  /**
   * Get all active users in a design
   */
  async getActiveUsers(designId: string): Promise<Array<{
    userId: string;
    socketId: string;
    joinedAt: string;
  }>> {
    const activeUsersKey = `${this.ACTIVE_USERS_PREFIX}${designId}`;

    try {
      const usersData = await this.redis.hgetall(activeUsersKey);

      return Object.values(usersData).map(data => JSON.parse(data));
    } catch (error) {
      this.logger.error(`Error getting active users:`, error);
      return [];
    }
  }

  /**
   * Update user presence (heartbeat)
   */
  async updateUserPresence(designId: string, userId: string): Promise<void> {
    const activeUsersKey = `${this.ACTIVE_USERS_PREFIX}${designId}`;
    const userSessionKey = `${this.USER_SESSION_PREFIX}${userId}:${designId}`;

    try {
      // Extend TTL on both keys
      await this.redis.expire(activeUsersKey, this.USER_PRESENCE_TTL);
      await this.redis.expire(userSessionKey, this.USER_PRESENCE_TTL);
    } catch (error) {
      this.logger.error(`Error updating user presence:`, error);
    }
  }

  /**
   * Lock a layer for editing
   */
  async lockLayer(
    designId: string,
    layerId: string,
    userId: string,
  ): Promise<boolean> {
    const lockKey = `${this.LAYER_LOCK_PREFIX}${designId}:${layerId}`;

    try {
      // Try to acquire lock (only if key doesn't exist)
      const lockData = JSON.stringify({
        userId,
        lockedAt: new Date().toISOString(),
      });

      const result = await this.redis.set(
        lockKey,
        lockData,
        'EX',
        this.LAYER_LOCK_TTL,
        'NX', // Only set if key doesn't exist
      );

      if (result === 'OK') {
        this.logger.log(`Layer ${layerId} locked by user ${userId} in design ${designId}`);
        return true;
      }

      return false;
    } catch (error) {
      this.logger.error(`Error locking layer:`, error);
      return false;
    }
  }

  /**
   * Unlock a layer
   */
  async unlockLayer(
    designId: string,
    layerId: string,
    userId: string,
  ): Promise<void> {
    const lockKey = `${this.LAYER_LOCK_PREFIX}${designId}:${layerId}`;

    try {
      // Verify user owns the lock before releasing
      const lockData = await this.redis.get(lockKey);

      if (lockData) {
        const lock = JSON.parse(lockData);
        if (lock.userId === userId) {
          await this.redis.del(lockKey);
          this.logger.log(`Layer ${layerId} unlocked by user ${userId} in design ${designId}`);
        } else {
          this.logger.warn(`User ${userId} attempted to unlock layer ${layerId} owned by ${lock.userId}`);
        }
      }
    } catch (error) {
      this.logger.error(`Error unlocking layer:`, error);
      throw error;
    }
  }

  /**
   * Get layer lock status
   */
  async getLayerLock(designId: string, layerId: string): Promise<string | null> {
    const lockKey = `${this.LAYER_LOCK_PREFIX}${designId}:${layerId}`;

    try {
      const lockData = await this.redis.get(lockKey);

      if (lockData) {
        const lock = JSON.parse(lockData);
        return lock.userId;
      }

      return null;
    } catch (error) {
      this.logger.error(`Error getting layer lock:`, error);
      return null;
    }
  }

  /**
   * Release all locks held by a user
   */
  private async releaseUserLocks(designId: string, userId: string): Promise<void> {
    try {
      const pattern = `${this.LAYER_LOCK_PREFIX}${designId}:*`;
      const keys = await this.redis.keys(pattern);

      for (const key of keys) {
        const lockData = await this.redis.get(key);
        if (lockData) {
          const lock = JSON.parse(lockData);
          if (lock.userId === userId) {
            await this.redis.del(key);
            this.logger.log(`Released lock on ${key} for user ${userId}`);
          }
        }
      }
    } catch (error) {
      this.logger.error(`Error releasing user locks:`, error);
    }
  }

  /**
   * Record an update action
   */
  async recordUpdate(
    designId: string,
    userId: string,
    action: string,
    data: any,
  ): Promise<void> {
    const updateLogKey = `${this.UPDATE_LOG_PREFIX}${designId}`;

    try {
      const update = JSON.stringify({
        userId,
        action,
        data,
        timestamp: new Date().toISOString(),
      });

      // Add to sorted set with timestamp as score
      const score = Date.now();
      await this.redis.zadd(updateLogKey, score, update);

      // Set TTL on the log
      await this.redis.expire(updateLogKey, this.UPDATE_LOG_TTL);

      // Keep only last 100 updates
      await this.redis.zremrangebyrank(updateLogKey, 0, -101);
    } catch (error) {
      this.logger.error(`Error recording update:`, error);
    }
  }

  /**
   * Get recent updates for a design
   */
  async getRecentUpdates(
    designId: string,
    limit: number = 50,
  ): Promise<Array<{
    userId: string;
    action: string;
    data: any;
    timestamp: string;
  }>> {
    const updateLogKey = `${this.UPDATE_LOG_PREFIX}${designId}`;

    try {
      // Get last N updates (reverse chronological order)
      const updates = await this.redis.zrevrange(updateLogKey, 0, limit - 1);

      return updates.map(update => JSON.parse(update));
    } catch (error) {
      this.logger.error(`Error getting recent updates:`, error);
      return [];
    }
  }

  /**
   * Get conflict detection data
   * Returns updates since a given timestamp
   */
  async getUpdatesSince(
    designId: string,
    since: Date,
  ): Promise<Array<{
    userId: string;
    action: string;
    data: any;
    timestamp: string;
  }>> {
    const updateLogKey = `${this.UPDATE_LOG_PREFIX}${designId}`;

    try {
      const sinceScore = since.getTime();
      const updates = await this.redis.zrangebyscore(
        updateLogKey,
        sinceScore,
        '+inf',
      );

      return updates.map(update => JSON.parse(update));
    } catch (error) {
      this.logger.error(`Error getting updates since timestamp:`, error);
      return [];
    }
  }

  /**
   * Clear all collaboration data for a design
   */
  async clearDesignCollaboration(designId: string): Promise<void> {
    try {
      const keysToDelete = [
        `${this.ACTIVE_USERS_PREFIX}${designId}`,
        `${this.UPDATE_LOG_PREFIX}${designId}`,
      ];

      // Delete layer locks
      const lockPattern = `${this.LAYER_LOCK_PREFIX}${designId}:*`;
      const lockKeys = await this.redis.keys(lockPattern);
      keysToDelete.push(...lockKeys);

      if (keysToDelete.length > 0) {
        await this.redis.del(...keysToDelete);
      }

      this.logger.log(`Cleared collaboration data for design ${designId}`);
    } catch (error) {
      this.logger.error(`Error clearing design collaboration:`, error);
      throw error;
    }
  }

  /**
   * Get collaboration statistics for a design
   */
  async getCollaborationStats(designId: string): Promise<{
    activeUsers: number;
    lockedLayers: number;
    recentUpdates: number;
  }> {
    try {
      const activeUsersKey = `${this.ACTIVE_USERS_PREFIX}${designId}`;
      const updateLogKey = `${this.UPDATE_LOG_PREFIX}${designId}`;
      const lockPattern = `${this.LAYER_LOCK_PREFIX}${designId}:*`;

      const [activeUsersCount, updateCount, lockKeys] = await Promise.all([
        this.redis.hlen(activeUsersKey),
        this.redis.zcard(updateLogKey),
        this.redis.keys(lockPattern),
      ]);

      return {
        activeUsers: activeUsersCount,
        lockedLayers: lockKeys.length,
        recentUpdates: updateCount,
      };
    } catch (error) {
      this.logger.error(`Error getting collaboration stats:`, error);
      return {
        activeUsers: 0,
        lockedLayers: 0,
        recentUpdates: 0,
      };
    }
  }
}

import { Injectable, Logger, Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';

@Injectable()
export class CacheService {
  private readonly logger = new Logger(CacheService.name);

  constructor(@Inject(CACHE_MANAGER) private cacheManager: Cache) {}

  async cacheAvatar(avatarId: string, avatar: any, ttl: number = 3600): Promise<void> {
    const key = `avatar:${avatarId}:metadata`;

    try {
      await this.cacheManager.set(key, JSON.stringify(avatar), ttl * 1000);
      this.logger.debug(`Cached avatar ${avatarId} with TTL ${ttl}s`);
    } catch (error) {
      this.logger.error(`Failed to cache avatar ${avatarId}:`, error);
    }
  }

  async getCachedAvatar(avatarId: string): Promise<any | null> {
    const key = `avatar:${avatarId}:metadata`;

    try {
      const cached = await this.cacheManager.get<string>(key);

      if (cached) {
        this.logger.debug(`Cache hit for avatar ${avatarId}`);
        return JSON.parse(cached);
      }

      this.logger.debug(`Cache miss for avatar ${avatarId}`);
      return null;
    } catch (error) {
      this.logger.error(`Failed to get cached avatar ${avatarId}:`, error);
      return null;
    }
  }

  async cacheMeasurements(
    avatarId: string,
    measurements: any,
    ttl: number = 3600,
  ): Promise<void> {
    const key = `avatar:${avatarId}:measurements`;

    try {
      await this.cacheManager.set(key, JSON.stringify(measurements), ttl * 1000);
      this.logger.debug(`Cached measurements for avatar ${avatarId}`);
    } catch (error) {
      this.logger.error(`Failed to cache measurements:`, error);
    }
  }

  async getCachedMeasurements(avatarId: string): Promise<any | null> {
    const key = `avatar:${avatarId}:measurements`;

    try {
      const cached = await this.cacheManager.get<string>(key);

      if (cached) {
        return JSON.parse(cached);
      }

      return null;
    } catch (error) {
      this.logger.error(`Failed to get cached measurements:`, error);
      return null;
    }
  }

  async cacheUserAvatars(
    userId: string,
    avatarIds: string[],
    ttl: number = 1800,
  ): Promise<void> {
    const key = `user:${userId}:avatars`;

    try {
      await this.cacheManager.set(key, JSON.stringify(avatarIds), ttl * 1000);
      this.logger.debug(`Cached avatar list for user ${userId}`);
    } catch (error) {
      this.logger.error(`Failed to cache user avatars:`, error);
    }
  }

  async getCachedUserAvatars(userId: string): Promise<string[] | null> {
    const key = `user:${userId}:avatars`;

    try {
      const cached = await this.cacheManager.get<string>(key);

      if (cached) {
        return JSON.parse(cached);
      }

      return null;
    } catch (error) {
      this.logger.error(`Failed to get cached user avatars:`, error);
      return null;
    }
  }

  async invalidateAvatar(avatarId: string): Promise<void> {
    const keys = [
      `avatar:${avatarId}:metadata`,
      `avatar:${avatarId}:measurements`,
      `avatar:${avatarId}:processing`,
    ];

    try {
      for (const key of keys) {
        await this.cacheManager.del(key);
      }

      this.logger.log(`Invalidated cache for avatar ${avatarId}`);
    } catch (error) {
      this.logger.error(`Failed to invalidate avatar cache:`, error);
    }
  }

  async invalidateUserAvatars(userId: string): Promise<void> {
    const key = `user:${userId}:avatars`;

    try {
      await this.cacheManager.del(key);
      this.logger.log(`Invalidated avatar list cache for user ${userId}`);
    } catch (error) {
      this.logger.error(`Failed to invalidate user avatars cache:`, error);
    }
  }

  async clearAll(): Promise<void> {
    try {
      await this.cacheManager.reset();
      this.logger.warn('Cleared all cache');
    } catch (error) {
      this.logger.error('Failed to clear cache:', error);
    }
  }
}

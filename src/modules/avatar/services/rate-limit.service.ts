import { Injectable, Logger, Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt?: Date;
}

@Injectable()
export class RateLimitService {
  private readonly logger = new Logger(RateLimitService.name);

  constructor(@Inject(CACHE_MANAGER) private cacheManager: Cache) {}

  async checkRateLimit(
    userId: string,
    action: string,
    limit: number,
    window: number, // seconds
  ): Promise<RateLimitResult> {
    const key = `ratelimit:${action}:${userId}`;

    try {
      // Get current count
      const currentStr = await this.cacheManager.get<string>(key);
      let current = currentStr ? parseInt(currentStr, 10) : 0;

      if (isNaN(current)) {
        current = 0;
      }

      // Increment
      current += 1;

      // Set with TTL
      await this.cacheManager.set(key, current.toString(), window * 1000);

      const remaining = Math.max(0, limit - current);
      const resetAt = new Date(Date.now() + window * 1000);

      const allowed = current <= limit;

      if (!allowed) {
        this.logger.warn(
          `Rate limit exceeded for user ${userId} on action ${action} (${current}/${limit})`,
        );
      }

      return {
        allowed,
        remaining,
        resetAt,
      };
    } catch (error) {
      this.logger.error('Rate limit check failed:', error);

      // On error, allow the request
      return {
        allowed: true,
        remaining: limit,
      };
    }
  }

  async checkAvatarCreationLimit(userId: string): Promise<RateLimitResult> {
    return this.checkRateLimit(
      userId,
      'avatar:create',
      5, // 5 avatars
      3600, // per hour
    );
  }

  async checkAvatarRetrievalLimit(userId: string): Promise<RateLimitResult> {
    return this.checkRateLimit(
      userId,
      'avatar:retrieve',
      100, // 100 requests
      60, // per minute
    );
  }

  async checkModelDownloadLimit(userId: string): Promise<RateLimitResult> {
    return this.checkRateLimit(
      userId,
      'model:download',
      20, // 20 downloads
      60, // per minute
    );
  }

  async resetRateLimit(userId: string, action: string): Promise<void> {
    const key = `ratelimit:${action}:${userId}`;

    try {
      await this.cacheManager.del(key);
      this.logger.log(`Reset rate limit for user ${userId} on action ${action}`);
    } catch (error) {
      this.logger.error('Failed to reset rate limit:', error);
    }
  }
}

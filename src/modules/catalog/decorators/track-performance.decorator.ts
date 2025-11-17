import { Logger } from '@nestjs/common';

/**
 * Decorator to track performance of methods
 * Logs execution time and can be used for monitoring
 */
export function TrackPerformance(
  target: any,
  propertyKey: string,
  descriptor: PropertyDescriptor,
) {
  const originalMethod = descriptor.value;
  const logger = new Logger(target.constructor.name);

  descriptor.value = async function (...args: any[]) {
    const startTime = Date.now();
    const methodName = propertyKey;

    try {
      const result = await originalMethod.apply(this, args);
      const duration = Date.now() - startTime;

      // Log performance
      if (duration > 100) {
        logger.warn(`${methodName} took ${duration}ms`);
      } else {
        logger.debug(`${methodName} completed in ${duration}ms`);
      }

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error(`${methodName} failed after ${duration}ms: ${error.message}`);
      throw error;
    }
  };

  return descriptor;
}

/**
 * Decorator to track database query performance
 */
export function TrackDbQuery(operation: string, entity: string) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor,
  ) {
    const originalMethod = descriptor.value;
    const logger = new Logger(target.constructor.name);

    descriptor.value = async function (...args: any[]) {
      const startTime = Date.now();

      try {
        const result = await originalMethod.apply(this, args);
        const duration = Date.now() - startTime;

        // Get metrics service if available
        if (this.metricsService && typeof this.metricsService.recordDbQuery === 'function') {
          this.metricsService.recordDbQuery(operation, entity, duration / 1000);
        }

        // Log slow queries (> 50ms)
        if (duration > 50) {
          logger.warn(
            `Slow DB query: ${operation} on ${entity} took ${duration}ms`,
          );
        }

        return result;
      } catch (error) {
        const duration = Date.now() - startTime;

        // Record error if metrics service available
        if (this.metricsService && typeof this.metricsService.recordDbError === 'function') {
          this.metricsService.recordDbError(
            operation,
            entity,
            error.constructor.name,
          );
        }

        logger.error(
          `DB query failed: ${operation} on ${entity} after ${duration}ms`,
          error.stack,
        );
        throw error;
      }
    };

    return descriptor;
  };
}

/**
 * Decorator to track cache operations
 */
export function TrackCache(cacheType: string) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor,
  ) {
    const originalMethod = descriptor.value;
    const logger = new Logger(target.constructor.name);

    descriptor.value = async function (...args: any[]) {
      const startTime = Date.now();

      try {
        const result = await originalMethod.apply(this, args);
        const duration = Date.now() - startTime;

        logger.debug(`Cache ${cacheType} operation completed in ${duration}ms`);

        return result;
      } catch (error) {
        const duration = Date.now() - startTime;
        logger.error(
          `Cache ${cacheType} operation failed after ${duration}ms`,
          error.stack,
        );
        throw error;
      }
    };

    return descriptor;
  };
}

/**
 * Decorator to track search operations
 */
export function TrackSearch(searchType: string) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor,
  ) {
    const originalMethod = descriptor.value;
    const logger = new Logger(target.constructor.name);

    descriptor.value = async function (...args: any[]) {
      const startTime = Date.now();

      try {
        const result = await originalMethod.apply(this, args);
        const duration = Date.now() - startTime;

        // Get result count
        const resultCount = Array.isArray(result)
          ? result.length
          : result?.items?.length || 0;

        // Record metrics if service available
        if (this.metricsService && typeof this.metricsService.recordSearch === 'function') {
          this.metricsService.recordSearch(
            searchType,
            duration / 1000,
            resultCount,
          );
        }

        logger.debug(
          `Search ${searchType} completed in ${duration}ms, found ${resultCount} results`,
        );

        return result;
      } catch (error) {
        const duration = Date.now() - startTime;
        logger.error(
          `Search ${searchType} failed after ${duration}ms`,
          error.stack,
        );
        throw error;
      }
    };

    return descriptor;
  };
}

/**
 * Decorator to track recommendation operations
 */
export function TrackRecommendation(recommendationType: string) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor,
  ) {
    const originalMethod = descriptor.value;
    const logger = new Logger(target.constructor.name);

    descriptor.value = async function (...args: any[]) {
      const startTime = Date.now();

      try {
        const result = await originalMethod.apply(this, args);
        const duration = Date.now() - startTime;

        // Record metrics if service available
        if (this.metricsService && typeof this.metricsService.recordRecommendation === 'function') {
          this.metricsService.recordRecommendation(
            recommendationType,
            duration / 1000,
          );
        }

        logger.debug(
          `Recommendation ${recommendationType} completed in ${duration}ms`,
        );

        return result;
      } catch (error) {
        const duration = Date.now() - startTime;
        logger.error(
          `Recommendation ${recommendationType} failed after ${duration}ms`,
          error.stack,
        );
        throw error;
      }
    };

    return descriptor;
  };
}

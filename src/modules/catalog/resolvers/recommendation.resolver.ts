import { Resolver, Query, Args, ID, Subscription } from '@nestjs/graphql';
import { Logger } from '@nestjs/common';
import { PubSub } from 'graphql-subscriptions';
import { RecommendationService } from '../services/recommendation.service';
import { RecommendationRequestDto, RecommendationType } from '../dto/recommendation.dto';

const pubSub = new PubSub();

/**
 * GraphQL Resolver for Recommendation operations
 */
@Resolver('Recommendation')
export class RecommendationResolver {
  private readonly logger = new Logger(RecommendationResolver.name);

  constructor(private readonly recommendationService: RecommendationService) {}

  /**
   * Get recommendations
   */
  @Query('recommendations')
  async getRecommendations(@Args('request') request: RecommendationRequestDto) {
    this.logger.debug(`GraphQL query: getRecommendations(${request.type})`);

    return this.recommendationService.getRecommendations(request);
  }

  /**
   * Get personalized recommendations
   */
  @Query('personalizedRecommendations')
  async getPersonalizedRecommendations(
    @Args('userId', { type: () => ID }) userId: string,
    @Args('limit', { type: () => Number, nullable: true, defaultValue: 12 })
    limit: number
  ) {
    this.logger.debug(`GraphQL query: personalizedRecommendations(${userId})`);

    return this.recommendationService.getRecommendations({
      type: RecommendationType.PERSONALIZED,
      userId,
      limit,
    });
  }

  /**
   * Get trending items
   */
  @Query('trendingItems')
  async getTrendingItems(
    @Args('limit', { type: () => Number, nullable: true, defaultValue: 12 })
    limit: number,
    @Args('category', { nullable: true }) category?: string
  ) {
    this.logger.debug('GraphQL query: trendingItems');

    return this.recommendationService.getRecommendations({
      type: RecommendationType.TRENDING,
      limit,
      category: category ? [category] : undefined,
    });
  }

  /**
   * Get similar items
   */
  @Query('similarItems')
  async getSimilarItems(
    @Args('itemId', { type: () => ID }) itemId: string,
    @Args('limit', { type: () => Number, nullable: true, defaultValue: 12 })
    limit: number
  ) {
    this.logger.debug(`GraphQL query: similarItems(${itemId})`);

    return this.recommendationService.getRecommendations({
      type: RecommendationType.SIMILAR,
      itemId,
      limit,
    });
  }

  /**
   * Get complementary items
   */
  @Query('complementaryItems')
  async getComplementaryItems(
    @Args('itemId', { type: () => ID }) itemId: string,
    @Args('limit', { type: () => Number, nullable: true, defaultValue: 12 })
    limit: number
  ) {
    this.logger.debug(`GraphQL query: complementaryItems(${itemId})`);

    return this.recommendationService.getRecommendations({
      type: RecommendationType.COMPLEMENTARY,
      itemId,
      limit,
    });
  }

  /**
   * Get popular items
   */
  @Query('popularItems')
  async getPopularItems(
    @Args('limit', { type: () => Number, nullable: true, defaultValue: 12 })
    limit: number,
    @Args('category', { nullable: true }) category?: string
  ) {
    this.logger.debug('GraphQL query: popularItems');

    return this.recommendationService.getRecommendations({
      type: RecommendationType.POPULAR,
      limit,
      category: category ? [category] : undefined,
    });
  }

  /**
   * Get new arrivals
   */
  @Query('newArrivals')
  async getNewArrivals(
    @Args('limit', { type: () => Number, nullable: true, defaultValue: 12 })
    limit: number,
    @Args('category', { nullable: true }) category?: string
  ) {
    this.logger.debug('GraphQL query: newArrivals');

    return this.recommendationService.getRecommendations({
      type: RecommendationType.NEW_ARRIVALS,
      limit,
      category: category ? [category] : undefined,
    });
  }

  /**
   * Subscribe to recommendation updates for a user
   */
  @Subscription('recommendationsUpdated', {
    filter: (payload, variables) => {
      return payload.userId === variables.userId;
    },
  })
  recommendationsUpdated(@Args('userId', { type: () => ID }) userId: string) {
    this.logger.debug(`GraphQL subscription: recommendationsUpdated(${userId})`);
    return pubSub.asyncIterator('recommendationsUpdated');
  }

  /**
   * Trigger recommendation update (used internally)
   */
  static notifyRecommendationsUpdated(userId: string, recommendations: any[]): void {
    pubSub.publish('recommendationsUpdated', {
      userId,
      recommendations,
    });
  }
}

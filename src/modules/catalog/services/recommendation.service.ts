import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import {
  RecommendationType,
  RecommendationRequestDto,
  RecommendationResponseDto,
  RecommendationItemDto,
} from '../dto/recommendation.dto';
import { CatalogItemRepository, UserFavoriteRepository } from '../repositories';
import { CatalogItem } from '../entities';
import {
  IRecommendationResult,
  IUserPreferences,
  ISimilarityScore,
  IRecommendationContext,
} from '../interfaces/recommendation.interface';

/**
 * Service for generating catalog item recommendations
 * Implements multiple recommendation strategies:
 * - Personalized (collaborative + content-based)
 * - Trending (time-decay popularity)
 * - Similar (content-based similarity)
 * - Complementary (outfit matching)
 * - Popular (overall popularity)
 * - New Arrivals (recently added)
 */
@Injectable()
export class RecommendationService {
  private readonly logger = new Logger(RecommendationService.name);
  private recommendationCache = new Map<
    string,
    { data: RecommendationResponseDto; expires: number }
  >();
  private readonly CACHE_TTL = 30 * 60 * 1000; // 30 minutes

  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly catalogItemRepository: CatalogItemRepository,
    private readonly userFavoriteRepository: UserFavoriteRepository
  ) {}

  /**
   * Get recommendations based on type
   */
  async getRecommendations(
    request: RecommendationRequestDto
  ): Promise<RecommendationResponseDto> {
    const startTime = Date.now();

    // Validate request
    this.validateRequest(request);

    // Check cache
    const cacheKey = this.generateCacheKey(request);
    const cached = this.getCachedRecommendation(cacheKey);
    if (cached) {
      this.logger.debug(`Cache hit for recommendations: ${cacheKey}`);
      return cached;
    }

    // Get recommendations based on type
    let results: IRecommendationResult[];

    switch (request.type) {
      case RecommendationType.PERSONALIZED:
        results = await this.getPersonalized(request);
        break;

      case RecommendationType.TRENDING:
        results = await this.getTrending(request);
        break;

      case RecommendationType.SIMILAR:
        results = await this.getSimilar(request);
        break;

      case RecommendationType.COMPLEMENTARY:
        results = await this.getComplementary(request);
        break;

      case RecommendationType.POPULAR:
        results = await this.getPopular(request);
        break;

      case RecommendationType.NEW_ARRIVALS:
        results = await this.getNewArrivals(request);
        break;

      default:
        results = await this.getPopular(request);
    }

    // Apply diversity if requested
    if (request.includeDiversity) {
      results = this.diversifyResults(results, request.limit);
    }

    // Limit results
    results = results.slice(0, request.limit);

    // Build response
    const response: RecommendationResponseDto = {
      items: results.map((r) => this.toDto(r)),
      type: request.type,
      took: Date.now() - startTime,
      total: results.length,
    };

    // Cache response
    this.cacheRecommendation(cacheKey, response);

    this.logger.log(
      `Generated ${results.length} ${request.type} recommendations in ${response.took}ms`
    );

    return response;
  }

  /**
   * Get personalized recommendations (collaborative + content-based)
   */
  private async getPersonalized(
    request: RecommendationRequestDto
  ): Promise<IRecommendationResult[]> {
    if (!request.userId) {
      // Fallback to popular if no user ID
      return this.getPopular(request);
    }

    // Extract user preferences from interaction history
    const preferences = await this.extractUserPreferences(request.userId);

    // Get collaborative filtering recommendations
    const collaborative = await this.collaborativeFiltering(
      request.userId,
      Math.ceil(request.limit * 1.5)
    );

    // Get content-based recommendations
    const contentBased = await this.contentBasedFiltering(
      preferences,
      Math.ceil(request.limit * 1.5)
    );

    // Ensemble ranking (combine both approaches)
    const combined = this.ensembleRanking(
      collaborative,
      contentBased,
      0.6, // 60% collaborative, 40% content-based
      request.limit * 2
    );

    return combined;
  }

  /**
   * Get trending items (time-decay popularity)
   */
  private async getTrending(
    request: RecommendationRequestDto
  ): Promise<IRecommendationResult[]> {
    // Get items with recent high engagement (last 7 days)
    const query = `
      SELECT
        ci.*,
        (
          (COALESCE(SUM(CASE WHEN ia.created_at > NOW() - INTERVAL '1 day' THEN ia.view_count ELSE 0 END), 0) * 1.0) +
          (COALESCE(SUM(CASE WHEN ia.created_at > NOW() - INTERVAL '3 days' THEN ia.view_count ELSE 0 END), 0) * 0.5) +
          (COALESCE(SUM(CASE WHEN ia.created_at > NOW() - INTERVAL '7 days' THEN ia.view_count ELSE 0 END), 0) * 0.25)
        ) as trend_score
      FROM catalog.items ci
      LEFT JOIN catalog.item_analytics ia ON ci.id = ia.item_id
      WHERE ci.is_active = true
        AND ci.deleted_at IS NULL
        ${request.category ? 'AND ci.category = ANY($1)' : ''}
      GROUP BY ci.id
      HAVING trend_score > 0
      ORDER BY trend_score DESC
      LIMIT $${request.category ? '2' : '1'}
    `;

    const params = request.category
      ? [request.category, request.limit * 2]
      : [request.limit * 2];

    const items = await this.dataSource.query(query, params);

    return items.map((item: any) => ({
      item,
      score: item.trend_score || 0,
      reason: 'Trending now based on recent engagement',
      algorithm: 'trending',
    }));
  }

  /**
   * Get similar items (content-based similarity)
   */
  private async getSimilar(
    request: RecommendationRequestDto
  ): Promise<IRecommendationResult[]> {
    if (!request.itemId) {
      throw new BadRequestException(
        'itemId is required for similar recommendations'
      );
    }

    // Get the reference item
    const referenceItem = await this.catalogItemRepository.findOne({
      where: { id: request.itemId },
    });

    if (!referenceItem) {
      throw new BadRequestException('Item not found');
    }

    // Calculate similarity scores
    const similarityScores = await this.calculateSimilarity(
      referenceItem,
      request.limit * 3
    );

    // Get items
    const itemIds = similarityScores.map((s) => s.itemId);
    const items = await this.catalogItemRepository.findByIds(itemIds);

    // Map to recommendations
    return similarityScores.map((score) => {
      const item = items.find((i) => i.id === score.itemId);
      return {
        item,
        score: score.score,
        reason: `Similar ${score.matchedFeatures.join(', ')}`,
        algorithm: 'content_similarity',
      };
    });
  }

  /**
   * Get complementary items (outfit matching)
   */
  private async getComplementary(
    request: RecommendationRequestDto
  ): Promise<IRecommendationResult[]> {
    if (!request.itemId) {
      throw new BadRequestException(
        'itemId is required for complementary recommendations'
      );
    }

    // Get the reference item
    const referenceItem = await this.catalogItemRepository.findOne({
      where: { id: request.itemId },
    });

    if (!referenceItem) {
      throw new BadRequestException('Item not found');
    }

    // Find complementary items based on outfit rules
    const complementaryItems = await this.findComplementaryItems(
      referenceItem,
      request.limit * 2
    );

    return complementaryItems;
  }

  /**
   * Get popular items (overall popularity)
   */
  private async getPopular(
    request: RecommendationRequestDto
  ): Promise<IRecommendationResult[]> {
    const queryBuilder = this.catalogItemRepository
      .createQueryBuilder('item')
      .where('item.isActive = :isActive', { isActive: true })
      .andWhere('item.deletedAt IS NULL')
      .orderBy('item.popularityScore', 'DESC')
      .addOrderBy('item.favoriteCount', 'DESC')
      .addOrderBy('item.useCount', 'DESC')
      .take(request.limit * 2);

    if (request.category) {
      queryBuilder.andWhere('item.category IN (:...categories)', {
        categories: request.category,
      });
    }

    const items = await queryBuilder.getMany();

    return items.map((item, index) => ({
      item,
      score: 100 - index * 2, // Decreasing score
      reason: 'Popular item in the catalog',
      algorithm: 'popularity',
    }));
  }

  /**
   * Get new arrivals (recently added)
   */
  private async getNewArrivals(
    request: RecommendationRequestDto
  ): Promise<IRecommendationResult[]> {
    const queryBuilder = this.catalogItemRepository
      .createQueryBuilder('item')
      .where('item.isActive = :isActive', { isActive: true })
      .andWhere('item.deletedAt IS NULL')
      .andWhere('item.createdAt > :since', {
        since: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
      })
      .orderBy('item.createdAt', 'DESC')
      .addOrderBy('item.isFeatured', 'DESC')
      .take(request.limit * 2);

    if (request.category) {
      queryBuilder.andWhere('item.category IN (:...categories)', {
        categories: request.category,
      });
    }

    const items = await queryBuilder.getMany();

    return items.map((item, index) => ({
      item,
      score: 100 - index,
      reason: 'Recently added to catalog',
      algorithm: 'new_arrivals',
    }));
  }

  /**
   * Extract user preferences from interaction history
   */
  private async extractUserPreferences(
    userId: string
  ): Promise<IUserPreferences> {
    // Get user's favorite items
    const favorites = await this.userFavoriteRepository.find({
      where: { userId },
      relations: ['catalogItem'],
      take: 50,
    });

    const preferences: IUserPreferences = {
      favoriteCategories: new Map(),
      favoriteTags: new Map(),
      favoriteColors: new Map(),
      favoriteOccasions: new Map(),
      favoriteSeasons: new Map(),
      favoriteStyles: new Map(),
      recentlyViewed: [],
      recentlyUsed: [],
      favorites: favorites.map((f) => f.catalogItemId),
    };

    // Extract preferences from favorites
    favorites.forEach((fav) => {
      const item = fav.catalogItem;
      if (!item) return;

      // Categories
      if (item.category) {
        preferences.favoriteCategories.set(
          item.category,
          (preferences.favoriteCategories.get(item.category) || 0) + 1
        );
      }

      // Tags
      item.tags?.forEach((tag) => {
        preferences.favoriteTags.set(
          tag,
          (preferences.favoriteTags.get(tag) || 0) + 1
        );
      });

      // Colors, occasions, seasons, styles from properties
      if (item.properties) {
        const props = item.properties as any;

        props.colors?.forEach((color: any) => {
          preferences.favoriteColors.set(
            color.name,
            (preferences.favoriteColors.get(color.name) || 0) + 1
          );
        });

        props.occasions?.forEach((occasion: string) => {
          preferences.favoriteOccasions.set(
            occasion,
            (preferences.favoriteOccasions.get(occasion) || 0) + 1
          );
        });

        props.seasons?.forEach((season: string) => {
          preferences.favoriteSeasons.set(
            season,
            (preferences.favoriteSeasons.get(season) || 0) + 1
          );
        });

        props.styles?.forEach((style: string) => {
          preferences.favoriteStyles.set(
            style,
            (preferences.favoriteStyles.get(style) || 0) + 1
          );
        });
      }
    });

    return preferences;
  }

  /**
   * Collaborative filtering (user-based)
   */
  private async collaborativeFiltering(
    userId: string,
    limit: number
  ): Promise<IRecommendationResult[]> {
    // Find similar users based on shared favorites
    const query = `
      WITH user_favorites AS (
        SELECT catalog_item_id FROM catalog.user_favorites WHERE user_id = $1
      ),
      similar_users AS (
        SELECT
          uf.user_id,
          COUNT(*) as shared_items
        FROM catalog.user_favorites uf
        WHERE uf.catalog_item_id IN (SELECT catalog_item_id FROM user_favorites)
          AND uf.user_id != $1
        GROUP BY uf.user_id
        HAVING COUNT(*) >= 2
        ORDER BY shared_items DESC
        LIMIT 10
      )
      SELECT
        ci.*,
        COUNT(DISTINCT uf.user_id) as recommendation_strength
      FROM catalog.items ci
      JOIN catalog.user_favorites uf ON ci.id = uf.catalog_item_id
      WHERE uf.user_id IN (SELECT user_id FROM similar_users)
        AND ci.id NOT IN (SELECT catalog_item_id FROM user_favorites)
        AND ci.is_active = true
        AND ci.deleted_at IS NULL
      GROUP BY ci.id
      ORDER BY recommendation_strength DESC, ci.popularity_score DESC
      LIMIT $2
    `;

    const items = await this.dataSource.query(query, [userId, limit]);

    return items.map((item: any) => ({
      item,
      score: item.recommendation_strength * 10,
      reason: 'Users with similar taste also liked this',
      algorithm: 'collaborative_filtering',
    }));
  }

  /**
   * Content-based filtering
   */
  private async contentBasedFiltering(
    preferences: IUserPreferences,
    limit: number
  ): Promise<IRecommendationResult[]> {
    // Get top preferences
    const topCategories = Array.from(preferences.favoriteCategories.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map((e) => e[0]);

    const topTags = Array.from(preferences.favoriteTags.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map((e) => e[0]);

    // Build query
    const queryBuilder = this.catalogItemRepository
      .createQueryBuilder('item')
      .where('item.isActive = :isActive', { isActive: true })
      .andWhere('item.deletedAt IS NULL');

    if (preferences.favorites.length > 0) {
      queryBuilder.andWhere('item.id NOT IN (:...excludeIds)', {
        excludeIds: preferences.favorites,
      });
    }

    if (topCategories.length > 0) {
      queryBuilder.andWhere('item.category IN (:...categories)', {
        categories: topCategories,
      });
    }

    if (topTags.length > 0) {
      queryBuilder.andWhere('item.tags && :tags', { tags: topTags });
    }

    queryBuilder
      .orderBy('item.popularityScore', 'DESC')
      .addOrderBy('item.isFeatured', 'DESC')
      .take(limit);

    const items = await queryBuilder.getMany();

    return items.map((item, index) => ({
      item,
      score: 90 - index,
      reason: 'Matches your preferences',
      algorithm: 'content_based',
    }));
  }

  /**
   * Ensemble ranking (combine multiple recommendation strategies)
   */
  private ensembleRanking(
    strategy1: IRecommendationResult[],
    strategy2: IRecommendationResult[],
    weight1: number,
    totalLimit: number
  ): IRecommendationResult[] {
    const weight2 = 1 - weight1;
    const combined = new Map<string, IRecommendationResult>();

    // Add strategy 1 results
    strategy1.forEach((result) => {
      combined.set(result.item.id, {
        ...result,
        score: result.score * weight1,
      });
    });

    // Add strategy 2 results (merge if exists)
    strategy2.forEach((result) => {
      const existing = combined.get(result.item.id);
      if (existing) {
        existing.score += result.score * weight2;
        existing.algorithm = 'ensemble';
        existing.reason = 'Multiple recommendation signals';
      } else {
        combined.set(result.item.id, {
          ...result,
          score: result.score * weight2,
        });
      }
    });

    // Sort by combined score
    return Array.from(combined.values())
      .sort((a, b) => b.score - a.score)
      .slice(0, totalLimit);
  }

  /**
   * Calculate similarity between reference item and other items
   */
  private async calculateSimilarity(
    referenceItem: CatalogItem,
    limit: number
  ): Promise<ISimilarityScore[]> {
    const queryBuilder = this.catalogItemRepository
      .createQueryBuilder('item')
      .where('item.id != :refId', { refId: referenceItem.id })
      .andWhere('item.isActive = :isActive', { isActive: true })
      .andWhere('item.deletedAt IS NULL')
      .take(limit * 5);

    // Same type gets higher priority
    if (referenceItem.type) {
      queryBuilder.andWhere('item.type = :type', { type: referenceItem.type });
    }

    const candidates = await queryBuilder.getMany();

    // Calculate similarity scores
    const scores: ISimilarityScore[] = candidates.map((candidate) => {
      let score = 0;
      const matchedFeatures: string[] = [];

      // Category match (30 points)
      if (candidate.category === referenceItem.category) {
        score += 30;
        matchedFeatures.push('category');
      }

      // Tag overlap (20 points)
      const tagOverlap = this.calculateArrayOverlap(
        candidate.tags || [],
        referenceItem.tags || []
      );
      if (tagOverlap > 0) {
        score += tagOverlap * 20;
        matchedFeatures.push('tags');
      }

      // Color overlap (15 points)
      const candidateColors =
        (candidate.properties as any)?.colors?.map((c: any) => c.name) || [];
      const refColors =
        (referenceItem.properties as any)?.colors?.map((c: any) => c.name) ||
        [];
      const colorOverlap = this.calculateArrayOverlap(candidateColors, refColors);
      if (colorOverlap > 0) {
        score += colorOverlap * 15;
        matchedFeatures.push('colors');
      }

      // Occasion overlap (15 points)
      const candidateOccasions =
        (candidate.properties as any)?.occasions || [];
      const refOccasions = (referenceItem.properties as any)?.occasions || [];
      const occasionOverlap = this.calculateArrayOverlap(
        candidateOccasions,
        refOccasions
      );
      if (occasionOverlap > 0) {
        score += occasionOverlap * 15;
        matchedFeatures.push('occasions');
      }

      // Season overlap (10 points)
      const candidateSeasons = (candidate.properties as any)?.seasons || [];
      const refSeasons = (referenceItem.properties as any)?.seasons || [];
      const seasonOverlap = this.calculateArrayOverlap(
        candidateSeasons,
        refSeasons
      );
      if (seasonOverlap > 0) {
        score += seasonOverlap * 10;
        matchedFeatures.push('seasons');
      }

      // Style overlap (10 points)
      const candidateStyles = (candidate.properties as any)?.styles || [];
      const refStyles = (referenceItem.properties as any)?.styles || [];
      const styleOverlap = this.calculateArrayOverlap(
        candidateStyles,
        refStyles
      );
      if (styleOverlap > 0) {
        score += styleOverlap * 10;
        matchedFeatures.push('styles');
      }

      return {
        itemId: candidate.id,
        score,
        matchedFeatures,
      };
    });

    // Sort by score and return top results
    return scores.sort((a, b) => b.score - a.score).slice(0, limit);
  }

  /**
   * Find complementary items (outfit matching)
   */
  private async findComplementaryItems(
    referenceItem: CatalogItem,
    limit: number
  ): Promise<IRecommendationResult[]> {
    // Complementary rules based on category
    const complementaryCategories = this.getComplementaryCategories(
      referenceItem.category
    );

    if (complementaryCategories.length === 0) {
      // Fallback to similar items
      return this.getSimilar({
        type: RecommendationType.SIMILAR,
        itemId: referenceItem.id,
        limit,
      } as any);
    }

    const queryBuilder = this.catalogItemRepository
      .createQueryBuilder('item')
      .where('item.category IN (:...categories)', {
        categories: complementaryCategories,
      })
      .andWhere('item.isActive = :isActive', { isActive: true })
      .andWhere('item.deletedAt IS NULL')
      .orderBy('item.popularityScore', 'DESC')
      .take(limit * 2);

    // Match occasions and seasons if available
    const refOccasions = (referenceItem.properties as any)?.occasions || [];
    const refSeasons = (referenceItem.properties as any)?.seasons || [];

    const items = await queryBuilder.getMany();

    // Score based on occasion/season match
    const scored = items.map((item) => {
      let score = 50; // Base score
      const matchReasons: string[] = [];

      const itemOccasions = (item.properties as any)?.occasions || [];
      const itemSeasons = (item.properties as any)?.seasons || [];

      // Occasion match
      const occasionMatch = refOccasions.some((o: string) =>
        itemOccasions.includes(o)
      );
      if (occasionMatch) {
        score += 25;
        matchReasons.push('matching occasion');
      }

      // Season match
      const seasonMatch = refSeasons.some((s: string) =>
        itemSeasons.includes(s)
      );
      if (seasonMatch) {
        score += 25;
        matchReasons.push('matching season');
      }

      return {
        item,
        score,
        reason: `Complements your ${referenceItem.category}${matchReasons.length > 0 ? ` (${matchReasons.join(', ')})` : ''}`,
        algorithm: 'complementary',
      };
    });

    return scored.sort((a, b) => b.score - a.score).slice(0, limit);
  }

  /**
   * Get complementary categories for outfit matching
   */
  private getComplementaryCategories(category: string): string[] {
    const rules: Record<string, string[]> = {
      tops: ['bottoms', 'skirts', 'pants', 'shorts'],
      dresses: ['outerwear', 'jackets', 'cardigans', 'accessories'],
      bottoms: ['tops', 'blouses', 'shirts'],
      pants: ['tops', 'blouses', 'shirts', 'sweaters'],
      skirts: ['tops', 'blouses', 'shirts', 'sweaters'],
      outerwear: ['tops', 'bottoms', 'dresses'],
      jackets: ['tops', 'bottoms', 'dresses'],
    };

    return rules[category?.toLowerCase()] || [];
  }

  /**
   * Diversify results to avoid redundancy
   */
  private diversifyResults(
    results: IRecommendationResult[],
    targetCount: number
  ): IRecommendationResult[] {
    if (results.length <= targetCount) {
      return results;
    }

    const diversified: IRecommendationResult[] = [];
    const usedCategories = new Set<string>();
    const usedTypes = new Set<string>();

    // First pass: pick top items with diverse categories
    for (const result of results) {
      if (diversified.length >= targetCount) break;

      const category = result.item.category;
      const type = result.item.type;

      // Prefer items from new categories/types
      if (!usedCategories.has(category) || !usedTypes.has(type)) {
        diversified.push(result);
        usedCategories.add(category);
        usedTypes.add(type);
      }
    }

    // Second pass: fill remaining slots with top-scored items
    if (diversified.length < targetCount) {
      for (const result of results) {
        if (diversified.length >= targetCount) break;
        if (!diversified.includes(result)) {
          diversified.push(result);
        }
      }
    }

    return diversified;
  }

  /**
   * Calculate array overlap ratio
   */
  private calculateArrayOverlap(arr1: string[], arr2: string[]): number {
    if (arr1.length === 0 || arr2.length === 0) return 0;

    const set1 = new Set(arr1);
    const set2 = new Set(arr2);
    const intersection = new Set([...set1].filter((x) => set2.has(x)));

    return intersection.size / Math.max(set1.size, set2.size);
  }

  /**
   * Validate recommendation request
   */
  private validateRequest(request: RecommendationRequestDto): void {
    if (
      request.type === RecommendationType.SIMILAR &&
      !request.itemId
    ) {
      throw new BadRequestException(
        'itemId is required for similar recommendations'
      );
    }

    if (
      request.type === RecommendationType.COMPLEMENTARY &&
      !request.itemId
    ) {
      throw new BadRequestException(
        'itemId is required for complementary recommendations'
      );
    }
  }

  /**
   * Convert to DTO
   */
  private toDto(result: IRecommendationResult): RecommendationItemDto {
    return {
      item: result.item,
      score: Math.round(result.score * 10) / 10,
      reason: result.reason,
      algorithm: result.algorithm,
    };
  }

  /**
   * Generate cache key
   */
  private generateCacheKey(request: RecommendationRequestDto): string {
    return JSON.stringify(request);
  }

  /**
   * Get cached recommendation
   */
  private getCachedRecommendation(
    cacheKey: string
  ): RecommendationResponseDto | null {
    const cached = this.recommendationCache.get(cacheKey);
    if (cached && cached.expires > Date.now()) {
      return cached.data;
    }
    if (cached) {
      this.recommendationCache.delete(cacheKey);
    }
    return null;
  }

  /**
   * Cache recommendation
   */
  private cacheRecommendation(
    cacheKey: string,
    data: RecommendationResponseDto
  ): void {
    this.recommendationCache.set(cacheKey, {
      data,
      expires: Date.now() + this.CACHE_TTL,
    });

    // Cleanup old cache entries
    if (this.recommendationCache.size > 500) {
      this.cleanupCache();
    }
  }

  /**
   * Clean up expired cache entries
   */
  private cleanupCache(): void {
    const now = Date.now();
    let removed = 0;

    for (const [key, value] of this.recommendationCache.entries()) {
      if (value.expires < now) {
        this.recommendationCache.delete(key);
        removed++;
      }
    }

    this.logger.debug(`Cache cleanup: removed ${removed} expired entries`);
  }

  /**
   * Clear all recommendation cache
   */
  clearCache(): void {
    this.recommendationCache.clear();
    this.logger.log('Recommendation cache cleared');
  }
}

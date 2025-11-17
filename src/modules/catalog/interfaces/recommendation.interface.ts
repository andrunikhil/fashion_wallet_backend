import { CatalogItem } from '../entities';
import { RecommendationType } from '../dto/recommendation.dto';

/**
 * Recommendation result
 */
export interface IRecommendationResult {
  item: CatalogItem;
  score: number;
  reason: string;
  algorithm: string;
}

/**
 * User preferences extracted from interactions
 */
export interface IUserPreferences {
  favoriteCategories: Map<string, number>;
  favoriteTags: Map<string, number>;
  favoriteColors: Map<string, number>;
  favoriteOccasions: Map<string, number>;
  favoriteSeasons: Map<string, number>;
  favoriteStyles: Map<string, number>;
  recentlyViewed: string[];
  recentlyUsed: string[];
  favorites: string[];
}

/**
 * Item similarity score
 */
export interface ISimilarityScore {
  itemId: string;
  score: number;
  matchedFeatures: string[];
}

/**
 * Recommendation context
 */
export interface IRecommendationContext {
  userId?: string;
  itemId?: string;
  type: RecommendationType;
  limit: number;
  filters?: {
    category?: string[];
    type?: string;
  };
  includeDiversity: boolean;
}

/**
 * User interaction
 */
export interface IUserInteraction {
  userId: string;
  itemId: string;
  interactionType: 'view' | 'use' | 'favorite' | 'search' | 'share';
  timestamp: Date;
  context?: Record<string, any>;
}

/**
 * Trending item data
 */
export interface ITrendingItem {
  item: CatalogItem;
  trendScore: number;
  viewCount: number;
  useCount: number;
  favoriteCount: number;
}

/**
 * Recommendation strategy result
 */
export interface IRecommendationStrategy {
  recommendations: IRecommendationResult[];
  algorithm: string;
  confidence: number;
}

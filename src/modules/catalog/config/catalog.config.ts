import { registerAs } from '@nestjs/config';

export const catalogConfig = registerAs('catalog', () => ({
  // Search configuration
  search: {
    defaultLimit: parseInt(process.env.CATALOG_SEARCH_LIMIT || '24', 10),
    maxLimit: parseInt(process.env.CATALOG_SEARCH_MAX_LIMIT || '100', 10),
    responseTimeTarget: 200, // milliseconds
  },

  // Visual search configuration
  visualSearch: {
    enabled: process.env.VISUAL_SEARCH_ENABLED === 'true' || false,
    modelPath: process.env.FEATURE_EXTRACTOR_MODEL_PATH || './models/resnet50',
    topK: parseInt(process.env.VISUAL_SEARCH_TOP_K || '50', 10),
    responseTimeTarget: 2000, // milliseconds
  },

  // Recommendation configuration
  recommendations: {
    enabled: process.env.RECOMMENDATIONS_ENABLED === 'true' || true,
    defaultLimit: parseInt(process.env.RECOMMENDATIONS_LIMIT || '12', 10),
    diversityThreshold: parseFloat(process.env.RECOMMENDATIONS_DIVERSITY || '0.3'),
    responseTimeTarget: 500, // milliseconds
  },

  // Caching configuration
  cache: {
    itemTTL: parseInt(process.env.CACHE_ITEM_TTL || '3600', 10), // 1 hour
    listTTL: parseInt(process.env.CACHE_LIST_TTL || '900', 10), // 15 minutes
    searchTTL: parseInt(process.env.CACHE_SEARCH_TTL || '900', 10), // 15 minutes
    recommendationTTL: parseInt(process.env.CACHE_RECOMMENDATION_TTL || '1800', 10), // 30 minutes
  },

  // Indexing configuration
  indexing: {
    batchSize: parseInt(process.env.INDEX_BATCH_SIZE || '100', 10),
    asyncIndexing: process.env.ASYNC_INDEXING === 'true' || true,
  },

  // Analytics configuration
  analytics: {
    enabled: process.env.ANALYTICS_ENABLED === 'true' || true,
    trackViews: true,
    trackSearches: true,
    trackRecommendations: true,
  },

  // Brand partnership configuration
  brandPartnership: {
    enabled: process.env.BRAND_PARTNERSHIP_ENABLED === 'true' || true,
    requireApproval: process.env.BRAND_REQUIRE_APPROVAL === 'true' || true,
  },

  // Item limits
  limits: {
    maxTagsPerItem: parseInt(process.env.MAX_TAGS_PER_ITEM || '20', 10),
    maxImagesPerItem: parseInt(process.env.MAX_IMAGES_PER_ITEM || '10', 10),
    maxDescriptionLength: parseInt(process.env.MAX_DESCRIPTION_LENGTH || '5000', 10),
  },

  // Feature flags
  features: {
    collections: process.env.FEATURE_COLLECTIONS === 'true' || true,
    favorites: process.env.FEATURE_FAVORITES === 'true' || true,
    visualSearch: process.env.FEATURE_VISUAL_SEARCH === 'true' || false,
    recommendations: process.env.FEATURE_RECOMMENDATIONS === 'true' || true,
    graphql: process.env.FEATURE_GRAPHQL === 'true' || false,
    websockets: process.env.FEATURE_WEBSOCKETS === 'true' || false,
  },
}));

# Architecture Specification: Catalog Service

## Document Overview

**Version**: 1.0
**Last Updated**: November 2025
**Document Type**: Architecture Specification
**Status**: Draft
**Spec ID**: spec-arch-02

---

## 1. Executive Summary

The Catalog Service is a high-performance microservice that manages the comprehensive repository of fashion items including silhouettes, fabrics, patterns, and design elements. It provides advanced search, discovery, and recommendation capabilities to enable users to find and utilize catalog items in their designs.

### 1.1 Architecture Goals

- **Performance**: Search results in under 200ms
- **Scalability**: Support 10,000+ catalog items with 1000+ concurrent searches
- **Discoverability**: Advanced filtering and visual search capabilities
- **Extensibility**: Easy addition of new catalog item types
- **Reliability**: 99.9% uptime with distributed caching

---

## 2. System Architecture Overview

### 2.1 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Client Layer                             │
│  (Web App, Mobile App, API Clients)                             │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                      API Gateway Layer                           │
│  - Authentication/Authorization                                  │
│  - Rate Limiting                                                 │
│  - Request Validation                                            │
│  - Response Compression                                          │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                   Catalog Service (Node.js)                      │
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │   REST API   │  │   GraphQL    │  │  WebSocket   │         │
│  │  Controllers │  │   Resolver   │  │   Handler    │         │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘         │
│         │                  │                  │                  │
│         └──────────────────┼──────────────────┘                  │
│                            │                                     │
│  ┌─────────────────────────┴─────────────────────────┐          │
│  │           Business Logic Layer                     │          │
│  │  ┌──────────────┐  ┌──────────────┐               │          │
│  │  │Search Service│  │Recommendation│               │          │
│  │  │              │  │Service       │               │          │
│  │  └──────┬───────┘  └──────┬───────┘               │          │
│  │         │                  │                        │          │
│  │  ┌──────┴───────┐  ┌──────┴───────┐               │          │
│  │  │Catalog Mgmt  │  │Brand Partner │               │          │
│  │  │Service       │  │Service       │               │          │
│  │  └──────────────┘  └──────────────┘               │          │
│  └───────────────────────────────────────────────────┘          │
│                            │                                     │
│  ┌─────────────────────────┴─────────────────────────┐          │
│  │           Data Access Layer                        │          │
│  │  ┌──────────────┐  ┌──────────────┐               │          │
│  │  │Catalog Repo  │  │Collection    │               │          │
│  │  │              │  │Repo          │               │          │
│  │  └──────────────┘  └──────────────┘               │          │
│  └────────────────────────────────────────────────────┘          │
└────────────────────────┬────────────────────────────────────────┘
                         │
         ┌───────────────┼───────────────┬──────────────┐
         │               │               │              │
         ▼               ▼               ▼              ▼
┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐
│ PostgreSQL  │ │  MongoDB    │ │Elasticsearch│ │   Redis     │
│ (Metadata)  │ │ (Flex Data) │ │  (Search)   │ │  (Cache)    │
└─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘
         │               │               │              │
         └───────────────┼───────────────┴──────────────┘
                         │
         ┌───────────────┼───────────────┬──────────────┐
         │               │               │              │
         ▼               ▼               ▼              ▼
┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐
│     S3      │ │   BullMQ    │ │   Algolia   │ │  Pinecone   │
│ (Assets)    │ │  (Queue)    │ │ (Alt Search)│ │(Vector DB)  │
└─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘
```

### 2.2 Component Responsibilities

#### 2.2.1 API Layer
- **REST API Controllers**: CRUD operations, search, filtering
- **GraphQL Resolver**: Flexible data queries, nested relationships
- **WebSocket Handler**: Real-time catalog updates

#### 2.2.2 Business Logic Layer
- **Search Service**: Full-text search, filtering, faceting
- **Recommendation Service**: Personalized recommendations, trending items
- **Catalog Management Service**: Admin operations, bulk imports
- **Brand Partner Service**: Partner catalog management

#### 2.2.3 Data Layer
- **PostgreSQL**: Structured catalog metadata, relationships
- **MongoDB**: Flexible nested data, complex schemas
- **Elasticsearch**: Full-text search, aggregations
- **Redis**: Caching, search result caching
- **S3**: 3D models, textures, images
- **Pinecone**: Vector search for visual similarity

---

## 3. Component Architecture

### 3.1 Search Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Search Pipeline                       │
│                                                          │
│  User Query                                              │
│       ↓                                                  │
│  ┌─────────────────────┐                                │
│  │ Query Parser        │ - Parse search query           │
│  │                     │ - Extract filters              │
│  │                     │ - Validate parameters          │
│  └──────────┬──────────┘                                │
│             ↓                                            │
│  ┌─────────────────────┐                                │
│  │ Cache Check         │ - Check Redis for results      │
│  │                     │ - Cache key: hash(query)       │
│  └──────────┬──────────┘                                │
│             ↓                                            │
│         Cache Hit? ──YES──→ Return Cached Results       │
│             │                                            │
│            NO                                            │
│             ↓                                            │
│  ┌─────────────────────┐                                │
│  │ Elasticsearch Query │ - Build ES query               │
│  │                     │ - Apply filters                │
│  │                     │ - Add aggregations             │
│  │                     │ - Execute search               │
│  └──────────┬──────────┘                                │
│             ↓                                            │
│  ┌─────────────────────┐                                │
│  │ Result Processing   │ - Extract item IDs             │
│  │                     │ - Build facets                 │
│  │                     │ - Calculate relevance          │
│  └──────────┬──────────┘                                │
│             ↓                                            │
│  ┌─────────────────────┐                                │
│  │ Data Enrichment     │ - Fetch from PostgreSQL        │
│  │                     │ - Add MongoDB data             │
│  │                     │ - Apply user permissions       │
│  └──────────┬──────────┘                                │
│             ↓                                            │
│  ┌─────────────────────┐                                │
│  │ Cache Results       │ - Store in Redis               │
│  │                     │ - TTL: 15 minutes              │
│  └──────────┬──────────┘                                │
│             ↓                                            │
│  ┌─────────────────────┐                                │
│  │ Return Response     │ - Format response              │
│  │                     │ - Add metadata                 │
│  └─────────────────────┘                                │
└──────────────────────────────────────────────────────────┘
```

#### 3.1.1 Elasticsearch Index Structure

```json
{
  "settings": {
    "number_of_shards": 3,
    "number_of_replicas": 2,
    "analysis": {
      "analyzer": {
        "catalog_analyzer": {
          "type": "custom",
          "tokenizer": "standard",
          "filter": [
            "lowercase",
            "asciifolding",
            "catalog_synonym",
            "edge_ngram_filter"
          ]
        }
      },
      "filter": {
        "edge_ngram_filter": {
          "type": "edge_ngram",
          "min_gram": 2,
          "max_gram": 10
        },
        "catalog_synonym": {
          "type": "synonym",
          "synonyms": [
            "tshirt, t-shirt, tee",
            "jean, denim",
            "shirt, blouse"
          ]
        }
      }
    }
  },
  "mappings": {
    "properties": {
      "id": { "type": "keyword" },
      "type": { "type": "keyword" },
      "name": {
        "type": "text",
        "analyzer": "catalog_analyzer",
        "fields": {
          "keyword": { "type": "keyword" },
          "suggest": {
            "type": "completion"
          }
        }
      },
      "description": {
        "type": "text",
        "analyzer": "catalog_analyzer"
      },
      "category": { "type": "keyword" },
      "subcategory": { "type": "keyword" },
      "tags": { "type": "keyword" },
      "colors": {
        "type": "nested",
        "properties": {
          "name": { "type": "keyword" },
          "hex": { "type": "keyword" }
        }
      },
      "occasions": { "type": "keyword" },
      "seasons": { "type": "keyword" },
      "styles": { "type": "keyword" },
      "brand_partner": { "type": "keyword" },
      "is_active": { "type": "boolean" },
      "is_featured": { "type": "boolean" },
      "popularity_score": { "type": "float" },
      "created_at": { "type": "date" },
      "updated_at": { "type": "date" },
      "price_range": {
        "type": "integer_range"
      }
    }
  }
}
```

#### 3.1.2 Search Query Builder

```typescript
class CatalogSearchService {
  async search(request: SearchRequest): Promise<SearchResponse> {
    // 1. Build Elasticsearch query
    const esQuery = this.buildElasticsearchQuery(request);

    // 2. Execute search
    const esResults = await this.elasticsearch.search({
      index: 'catalog-items',
      body: esQuery
    });

    // 3. Extract item IDs
    const itemIds = esResults.hits.hits.map(hit => hit._id);

    // 4. Fetch full items from database/cache
    const items = await this.getCatalogItems(itemIds);

    // 5. Build facets from aggregations
    const facets = this.buildFacets(esResults.aggregations);

    // 6. Get search suggestions
    const suggestions = await this.getSuggestions(request.query);

    return {
      items,
      pagination: {
        total: esResults.hits.total.value,
        page: request.page || 1,
        limit: request.limit || 24,
        totalPages: Math.ceil(esResults.hits.total.value / (request.limit || 24))
      },
      facets,
      suggestions
    };
  }

  private buildElasticsearchQuery(request: SearchRequest): any {
    const must: any[] = [];
    const filter: any[] = [];
    const should: any[] = [];

    // Text search with boost
    if (request.query) {
      must.push({
        multi_match: {
          query: request.query,
          fields: [
            'name^3',          // Name most important
            'description^2',   // Description second
            'tags',            // Tags normal weight
            'category',
            'brand_partner'
          ],
          fuzziness: 'AUTO',
          operator: 'and'
        }
      });

      // Boost exact matches
      should.push({
        match_phrase: {
          name: {
            query: request.query,
            boost: 10
          }
        }
      });
    }

    // Category filter
    if (request.filters.category?.length) {
      filter.push({
        terms: { category: request.filters.category }
      });
    }

    // Tags filter
    if (request.filters.tags?.length) {
      filter.push({
        terms: { tags: request.filters.tags }
      });
    }

    // Color filter
    if (request.filters.colors?.length) {
      filter.push({
        nested: {
          path: 'colors',
          query: {
            terms: { 'colors.hex': request.filters.colors }
          }
        }
      });
    }

    // Occasion filter
    if (request.filters.occasion?.length) {
      filter.push({
        terms: { occasions: request.filters.occasion }
      });
    }

    // Season filter
    if (request.filters.season?.length) {
      filter.push({
        terms: { seasons: request.filters.season }
      });
    }

    // Price range filter
    if (request.filters.priceRange) {
      filter.push({
        range: {
          price_range: {
            gte: request.filters.priceRange.min,
            lte: request.filters.priceRange.max
          }
        }
      });
    }

    // Always filter active items only
    filter.push({ term: { is_active: true } });

    // Featured items boost
    should.push({
      term: {
        is_featured: {
          value: true,
          boost: 2
        }
      }
    });

    return {
      query: {
        bool: {
          must: must.length > 0 ? must : [{ match_all: {} }],
          filter,
          should,
          minimum_should_match: should.length > 0 ? 0 : undefined
        }
      },
      sort: this.buildSort(request.sortBy, request.sortOrder),
      from: ((request.page || 1) - 1) * (request.limit || 24),
      size: request.limit || 24,
      aggs: this.buildAggregations(),
      highlight: {
        fields: {
          name: {},
          description: {}
        }
      }
    };
  }

  private buildAggregations(): any {
    return {
      categories: {
        terms: {
          field: 'category',
          size: 50
        }
      },
      colors: {
        nested: {
          path: 'colors'
        },
        aggs: {
          color_names: {
            terms: {
              field: 'colors.name',
              size: 100
            }
          }
        }
      },
      occasions: {
        terms: {
          field: 'occasions',
          size: 20
        }
      },
      seasons: {
        terms: {
          field: 'seasons',
          size: 10
        }
      },
      brands: {
        terms: {
          field: 'brand_partner',
          size: 50
        }
      },
      price_stats: {
        stats: {
          field: 'price_range'
        }
      }
    };
  }

  private buildSort(sortBy?: SortField, sortOrder: 'asc' | 'desc' = 'desc'): any[] {
    const sortMap = {
      [SortField.RELEVANCE]: { _score: { order: 'desc' } },
      [SortField.POPULARITY]: { popularity_score: { order: sortOrder } },
      [SortField.NEWEST]: { created_at: { order: sortOrder } },
      [SortField.NAME]: { 'name.keyword': { order: sortOrder } },
      [SortField.VIEWS]: { view_count: { order: sortOrder } },
      [SortField.USES]: { use_count: { order: sortOrder } }
    };

    if (!sortBy || sortBy === SortField.RELEVANCE) {
      return [
        { _score: { order: 'desc' } },
        { popularity_score: { order: 'desc' } }
      ];
    }

    return [sortMap[sortBy]];
  }
}
```

### 3.2 Visual Search Architecture

```
┌─────────────────────────────────────────────────────────┐
│                  Visual Search Pipeline                  │
│                                                          │
│  Image Upload                                            │
│       ↓                                                  │
│  ┌─────────────────────┐                                │
│  │ Image Processing    │ - Resize to 224x224            │
│  │                     │ - Normalize pixels             │
│  │                     │ - Convert to tensor            │
│  └──────────┬──────────┘                                │
│             ↓                                            │
│  ┌─────────────────────┐                                │
│  │ Feature Extraction  │ - CNN model (ResNet50)         │
│  │                     │ - Extract 2048-dim vector      │
│  │                     │ - Normalize vector             │
│  └──────────┬──────────┘                                │
│             ↓                                            │
│  ┌─────────────────────┐                                │
│  │ Vector Search       │ - Query Pinecone               │
│  │ (Pinecone)          │ - Cosine similarity            │
│  │                     │ - Top K results (K=50)         │
│  └──────────┬──────────┘                                │
│             ↓                                            │
│  ┌─────────────────────┐                                │
│  │ Re-ranking          │ - Apply user filters           │
│  │                     │ - Boost active items           │
│  │                     │ - Calculate final scores       │
│  └──────────┬──────────┘                                │
│             ↓                                            │
│  ┌─────────────────────┐                                │
│  │ Data Enrichment     │ - Fetch full item data         │
│  │                     │ - Add metadata                 │
│  └──────────┬──────────┘                                │
│             ↓                                            │
│       Return Results                                     │
└──────────────────────────────────────────────────────────┘
```

#### 3.2.1 Visual Search Implementation

```typescript
class VisualSearchService {
  private pinecone: PineconeClient;
  private featureExtractor: FeatureExtractor;

  async searchByImage(
    imageBuffer: Buffer,
    filters?: SearchFilters
  ): Promise<VisualSearchResponse> {

    // 1. Preprocess image
    const preprocessed = await this.preprocessImage(imageBuffer);

    // 2. Extract features using CNN
    const featureVector = await this.featureExtractor.extract(preprocessed);

    // 3. Query Pinecone vector database
    const results = await this.pinecone.query({
      vector: featureVector,
      topK: 50,
      includeMetadata: true,
      filter: this.buildPineconeFilter(filters)
    });

    // 4. Re-rank results
    const reranked = this.rerankResults(results, filters);

    // 5. Fetch full item data
    const items = await this.enrichResults(reranked);

    return {
      items: items.map(item => ({
        item: item.catalogItem,
        similarity: item.score * 100,
        matchReason: this.explainMatch(item)
      }))
    };
  }

  private async preprocessImage(buffer: Buffer): Promise<Tensor> {
    // Resize to 224x224
    const resized = await sharp(buffer)
      .resize(224, 224)
      .toBuffer();

    // Convert to tensor and normalize
    const tensor = tf.node.decodeImage(resized, 3)
      .div(255.0)
      .sub([0.485, 0.456, 0.406])
      .div([0.229, 0.224, 0.225])
      .expandDims(0);

    return tensor;
  }

  private buildPineconeFilter(filters?: SearchFilters): any {
    if (!filters) return undefined;

    const pineconeFilter: any = {};

    if (filters.category) {
      pineconeFilter.category = { $in: filters.category };
    }

    if (filters.occasion) {
      pineconeFilter.occasions = { $in: filters.occasion };
    }

    if (filters.season) {
      pineconeFilter.seasons = { $in: filters.season };
    }

    pineconeFilter.is_active = { $eq: true };

    return Object.keys(pineconeFilter).length > 0 ? pineconeFilter : undefined;
  }
}
```

### 3.3 Recommendation Engine Architecture

```
┌─────────────────────────────────────────────────────────┐
│               Recommendation Engine                      │
│                                                          │
│  ┌─────────────────────────────────────────────────┐   │
│  │         User Profile Builder                     │   │
│  │  - Collect user interactions                     │   │
│  │  - Analyze design history                        │   │
│  │  - Extract preferences                           │   │
│  └──────────────────┬───────────────────────────────┘   │
│                     ↓                                    │
│  ┌─────────────────────────────────────────────────┐   │
│  │         Recommendation Strategies                │   │
│  │                                                   │   │
│  │  ┌────────────────┐  ┌────────────────┐         │   │
│  │  │Collaborative   │  │Content-Based   │         │   │
│  │  │Filtering       │  │Filtering       │         │   │
│  │  └───────┬────────┘  └────────┬───────┘         │   │
│  │          │                     │                  │   │
│  │  ┌───────┴────────┐  ┌────────┴───────┐         │   │
│  │  │Trending Items  │  │Similar Items   │         │   │
│  │  └───────┬────────┘  └────────┬───────┘         │   │
│  │          │                     │                  │   │
│  │          └──────────┬──────────┘                  │   │
│  └─────────────────────┼─────────────────────────────┘   │
│                        ↓                                  │
│  ┌─────────────────────────────────────────────────┐   │
│  │         Ensemble & Ranking                       │   │
│  │  - Combine recommendation scores                 │   │
│  │  - Apply business rules                          │   │
│  │  - Diversify results                             │   │
│  │  - Personalization boost                         │   │
│  └──────────────────┬───────────────────────────────┘   │
│                     ↓                                    │
│             Final Recommendations                        │
└──────────────────────────────────────────────────────────┘
```

#### 3.3.1 Recommendation Implementation

```typescript
class RecommendationService {
  async getRecommendations(
    request: RecommendationRequest
  ): Promise<RecommendationResponse> {

    switch (request.type) {
      case RecommendationType.TRENDING:
        return this.getTrending(request);

      case RecommendationType.PERSONALIZED:
        return this.getPersonalized(request);

      case RecommendationType.SIMILAR:
        return this.getSimilar(request);

      case RecommendationType.COMPLEMENTARY:
        return this.getComplementary(request);

      default:
        return this.getPopular(request);
    }
  }

  private async getPersonalized(
    request: RecommendationRequest
  ): Promise<RecommendationResponse> {

    // 1. Get user history and preferences
    const userHistory = await this.getUserHistory(request.userId);
    const preferences = this.extractPreferences(userHistory);

    // 2. Collaborative filtering (user-user similarity)
    const collaborativeResults = await this.collaborativeFiltering(
      request.userId,
      preferences,
      request.limit
    );

    // 3. Content-based filtering (item similarity)
    const contentResults = await this.contentBasedFiltering(
      preferences,
      request.context,
      request.limit
    );

    // 4. Trending items
    const trendingResults = await this.getTrendingItems(request.limit);

    // 5. Combine and rank
    const combined = this.ensembleRanking({
      collaborative: collaborativeResults,
      content: contentResults,
      trending: trendingResults
    }, {
      collaborativeWeight: 0.4,
      contentWeight: 0.4,
      trendingWeight: 0.2
    });

    // 6. Diversify results
    const diversified = this.diversifyResults(combined, preferences);

    // 7. Apply business rules
    const final = this.applyBusinessRules(diversified, request.userId);

    return {
      items: final.slice(0, request.limit || 12).map(item => ({
        item: item.catalogItem,
        score: item.score,
        reason: item.reason
      }))
    };
  }

  private extractPreferences(history: UserHistory): UserPreferences {
    const categoryFreq = new Map<string, number>();
    const colorFreq = new Map<string, number>();
    const styleFreq = new Map<string, number>();

    // Analyze user interactions
    for (const interaction of history.interactions) {
      // Count category preferences
      categoryFreq.set(
        interaction.category,
        (categoryFreq.get(interaction.category) || 0) + interaction.weight
      );

      // Count color preferences
      for (const color of interaction.colors || []) {
        colorFreq.set(
          color,
          (colorFreq.get(color) || 0) + interaction.weight
        );
      }

      // Count style preferences
      for (const style of interaction.styles || []) {
        styleFreq.set(
          style,
          (styleFreq.get(style) || 0) + interaction.weight
        );
      }
    }

    // Convert to preference arrays
    return {
      categories: this.topN(categoryFreq, 5),
      colors: this.topN(colorFreq, 10),
      styles: this.topN(styleFreq, 5),
      occasions: this.extractOccasionPreferences(history),
      fitTypes: this.extractFitPreferences(history)
    };
  }

  private async collaborativeFiltering(
    userId: string,
    preferences: UserPreferences,
    limit: number
  ): Promise<ScoredItem[]> {

    // 1. Find similar users
    const similarUsers = await this.findSimilarUsers(userId, preferences);

    // 2. Get items liked by similar users
    const candidateItems = await this.getItemsFromUsers(similarUsers);

    // 3. Filter out items user already interacted with
    const userItems = await this.getUserItems(userId);
    const filtered = candidateItems.filter(
      item => !userItems.includes(item.id)
    );

    // 4. Score based on similarity
    const scored = filtered.map(item => ({
      ...item,
      score: this.calculateCollaborativeScore(item, similarUsers)
    }));

    return scored.sort((a, b) => b.score - a.score).slice(0, limit);
  }

  private async contentBasedFiltering(
    preferences: UserPreferences,
    context: any,
    limit: number
  ): Promise<ScoredItem[]> {

    // Build query based on preferences
    const query = {
      bool: {
        should: [
          // Category match
          {
            terms: {
              category: preferences.categories.map(c => c.value),
              boost: 2.0
            }
          },
          // Color match
          {
            nested: {
              path: 'colors',
              query: {
                terms: {
                  'colors.name': preferences.colors.map(c => c.value)
                }
              },
              boost: 1.5
            }
          },
          // Style match
          {
            terms: {
              styles: preferences.styles.map(s => s.value),
              boost: 1.8
            }
          }
        ],
        minimum_should_match: 1
      }
    };

    // Execute search
    const results = await this.elasticsearch.search({
      index: 'catalog-items',
      body: {
        query,
        size: limit * 2  // Get extra for filtering
      }
    });

    return results.hits.hits.map(hit => ({
      id: hit._id,
      score: hit._score,
      catalogItem: hit._source,
      reason: this.explainContentScore(hit, preferences)
    }));
  }

  private diversifyResults(
    items: ScoredItem[],
    preferences: UserPreferences
  ): ScoredItem[] {

    const diversified: ScoredItem[] = [];
    const categories = new Set<string>();
    const colors = new Set<string>();

    for (const item of items) {
      // Ensure category diversity
      if (categories.size < 3 || !categories.has(item.catalogItem.category)) {
        categories.add(item.catalogItem.category);
        diversified.push(item);
        continue;
      }

      // Ensure color diversity
      const itemColors = item.catalogItem.colors?.map(c => c.name) || [];
      const hasNewColor = itemColors.some(c => !colors.has(c));

      if (hasNewColor) {
        itemColors.forEach(c => colors.add(c));
        diversified.push(item);
        continue;
      }

      // Add if high score despite lack of diversity
      if (item.score > 0.8) {
        diversified.push(item);
      }

      // Stop when we have enough
      if (diversified.length >= items.length * 0.7) {
        break;
      }
    }

    return diversified;
  }
}
```

### 3.4 Data Architecture

#### 3.4.1 PostgreSQL Schema

```sql
-- Schema: catalog

-- Main catalog items table
CREATE TABLE catalog.items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type VARCHAR(50) NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,

  -- Categorization
  category VARCHAR(100),
  subcategory VARCHAR(100),
  tags TEXT[],

  -- Files
  model_url TEXT,
  thumbnail_url TEXT,
  preview_images JSONB,

  -- Type-specific properties
  properties JSONB DEFAULT '{}'::jsonb,

  -- Metadata
  designer_name VARCHAR(255),
  brand_partner_id UUID REFERENCES catalog.brand_partners(id),
  is_exclusive BOOLEAN DEFAULT false,
  release_date DATE,

  -- Availability
  is_active BOOLEAN DEFAULT true,
  is_featured BOOLEAN DEFAULT false,
  required_tier VARCHAR(50),

  -- Analytics
  popularity_score DECIMAL(10,2) DEFAULT 0,
  view_count INTEGER DEFAULT 0,
  use_count INTEGER DEFAULT 0,
  favorite_count INTEGER DEFAULT 0,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,

  CONSTRAINT chk_type CHECK (type IN ('silhouette', 'fabric', 'pattern', 'element'))
);

-- Indexes for performance
CREATE INDEX idx_catalog_items_type ON catalog.items(type) WHERE deleted_at IS NULL;
CREATE INDEX idx_catalog_items_category ON catalog.items(category) WHERE deleted_at IS NULL;
CREATE INDEX idx_catalog_items_tags ON catalog.items USING GIN(tags);
CREATE INDEX idx_catalog_items_active ON catalog.items(is_active, is_featured) WHERE deleted_at IS NULL;
CREATE INDEX idx_catalog_items_popularity ON catalog.items(popularity_score DESC);
CREATE INDEX idx_catalog_items_brand ON catalog.items(brand_partner_id) WHERE deleted_at IS NULL;

-- Full-text search index (fallback for Elasticsearch)
CREATE INDEX idx_catalog_items_search ON catalog.items
  USING GIN(to_tsvector('english', name || ' ' || COALESCE(description, '')));

-- Silhouette-specific table
CREATE TABLE catalog.silhouettes (
  id UUID PRIMARY KEY REFERENCES catalog.items(id) ON DELETE CASCADE,
  available_sizes TEXT[],
  fit_type VARCHAR(50),
  size_chart_id UUID REFERENCES catalog.size_charts(id),
  poly_count INTEGER,
  uv_mapping_info JSONB,
  lod_levels JSONB,
  compatible_with UUID[],
  incompatible_with UUID[],
  layer_position INTEGER,
  occasions TEXT[],
  seasons TEXT[],

  CONSTRAINT chk_fit_type CHECK (fit_type IN ('slim', 'regular', 'loose', 'oversized', 'tailored'))
);

CREATE INDEX idx_silhouettes_fit_type ON catalog.silhouettes(fit_type);
CREATE INDEX idx_silhouettes_occasions ON catalog.silhouettes USING GIN(occasions);

-- Fabric-specific table
CREATE TABLE catalog.fabrics (
  id UUID PRIMARY KEY REFERENCES catalog.items(id) ON DELETE CASCADE,
  fabric_type VARCHAR(50),
  fabric_category VARCHAR(50),

  -- Texture maps
  diffuse_map_url TEXT,
  normal_map_url TEXT,
  roughness_map_url TEXT,
  metallic_map_url TEXT,
  ao_map_url TEXT,

  -- Material properties
  shine INTEGER CHECK (shine >= 0 AND shine <= 100),
  stretch INTEGER CHECK (stretch >= 0 AND stretch <= 100),
  drape VARCHAR(50),
  transparency INTEGER CHECK (transparency >= 0 AND transparency <= 100),

  -- Physical properties
  gsm INTEGER,
  breathability INTEGER,
  durability INTEGER,
  wrinkle_resistance INTEGER,

  -- Sustainability
  sustainability_certifications TEXT[],
  eco_score INTEGER,

  -- Color variants
  color_variants JSONB,
  is_color_customizable BOOLEAN DEFAULT false,

  CONSTRAINT chk_fabric_type CHECK (fabric_type IN ('solid', 'texture', 'knit', 'technical', 'specialty')),
  CONSTRAINT chk_drape CHECK (drape IN ('stiff', 'medium', 'fluid', 'structured'))
);

-- Pattern-specific table
CREATE TABLE catalog.patterns (
  id UUID PRIMARY KEY REFERENCES catalog.items(id) ON DELETE CASCADE,
  pattern_type VARCHAR(50),
  texture_url TEXT NOT NULL,

  is_tileable BOOLEAN DEFAULT true,
  repeat_width DECIMAL(10,2),
  repeat_height DECIMAL(10,2),
  scale_min DECIMAL(10,2),
  scale_max DECIMAL(10,2),
  scale_default DECIMAL(10,2),

  color_channels INTEGER,
  is_color_customizable BOOLEAN DEFAULT false,
  pattern_colors JSONB,

  applicable_to_categories TEXT[],
  occasions TEXT[],
  seasons TEXT[],
  styles TEXT[],

  CONSTRAINT chk_pattern_type CHECK (pattern_type IN ('print', 'stripe', 'check', 'dot', 'abstract', 'traditional', 'animal', 'custom'))
);

-- Design element-specific table
CREATE TABLE catalog.elements (
  id UUID PRIMARY KEY REFERENCES catalog.items(id) ON DELETE CASCADE,
  element_category VARCHAR(50),
  element_type VARCHAR(100),

  variants JSONB,
  placement_rules JSONB,
  applicable_to TEXT[],

  available_materials TEXT[],
  is_color_customizable BOOLEAN DEFAULT false,
  default_color VARCHAR(7),

  size_min DECIMAL(10,2),
  size_max DECIMAL(10,2),
  size_default DECIMAL(10,2),

  CONSTRAINT chk_element_category CHECK (element_category IN ('trim', 'decorative', 'structural', 'hardware'))
);

-- Collections
CREATE TABLE catalog.collections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  cover_image_url TEXT,

  curated_by VARCHAR(255),
  curation_type VARCHAR(50),

  tags TEXT[],
  season VARCHAR(50),
  occasion VARCHAR(50),
  style VARCHAR(50),

  is_public BOOLEAN DEFAULT true,
  is_featured BOOLEAN DEFAULT false,

  start_date DATE,
  end_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT chk_curation_type CHECK (curation_type IN ('editorial', 'seasonal', 'brand', 'designer', 'trending', 'occasion', 'style'))
);

CREATE INDEX idx_collections_featured ON catalog.collections(is_featured) WHERE is_public = true;

-- Collection items (many-to-many)
CREATE TABLE catalog.collection_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  collection_id UUID NOT NULL REFERENCES catalog.collections(id) ON DELETE CASCADE,
  catalog_item_id UUID NOT NULL REFERENCES catalog.items(id) ON DELETE CASCADE,
  order_index INTEGER NOT NULL,
  is_featured BOOLEAN DEFAULT false,
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(collection_id, catalog_item_id)
);

CREATE INDEX idx_collection_items_collection ON catalog.collection_items(collection_id, order_index);

-- Brand partnerships
CREATE TABLE catalog.brand_partners (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  brand_name VARCHAR(255) NOT NULL,
  logo_url TEXT,
  description TEXT,

  partnership_type VARCHAR(50),
  start_date DATE NOT NULL,
  end_date DATE,

  is_exclusive BOOLEAN DEFAULT false,
  required_tier VARCHAR(50),

  brand_colors TEXT[],
  brand_assets JSONB,

  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT chk_partnership_type CHECK (partnership_type IN ('official', 'collaboration', 'licensed', 'sponsored'))
);

-- User favorites
CREATE TABLE catalog.user_favorites (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES shared.users(id) ON DELETE CASCADE,
  catalog_item_id UUID NOT NULL REFERENCES catalog.items(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(user_id, catalog_item_id)
);

CREATE INDEX idx_user_favorites_user ON catalog.user_favorites(user_id);

-- Item analytics (partitioned)
CREATE TABLE catalog.item_analytics (
  id BIGSERIAL,
  catalog_item_id UUID NOT NULL REFERENCES catalog.items(id) ON DELETE CASCADE,
  event_type VARCHAR(50) NOT NULL,
  event_data JSONB,
  user_id UUID REFERENCES shared.users(id),
  session_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
) PARTITION BY RANGE (created_at);

-- Create monthly partitions
CREATE TABLE catalog.item_analytics_2025_11
  PARTITION OF catalog.item_analytics
  FOR VALUES FROM ('2025-11-01') TO ('2025-12-01');

CREATE INDEX idx_item_analytics_item ON catalog.item_analytics(catalog_item_id, created_at);
CREATE INDEX idx_item_analytics_event ON catalog.item_analytics(event_type, created_at);
```

#### 3.4.2 MongoDB Collections

```javascript
// Collection: catalog_items_flexible
// Stores complex nested data and binary assets

{
  _id: ObjectId,
  catalogId: UUID,  // Reference to PostgreSQL
  type: String,     // 'silhouette', 'fabric', 'pattern', 'element'

  // Type-specific data (flexible schema)
  data: {
    // For silhouettes
    meshData: BinData,
    lodModels: [
      {
        level: Number,
        vertices: BinData,
        faces: BinData
      }
    ],

    // For fabrics
    textureData: {
      diffuse: { url: String, data: BinData },
      normal: { url: String, data: BinData },
      roughness: { url: String, data: BinData }
    },

    // For patterns
    patternDefinition: {
      tileData: BinData,
      colorMask: BinData
    }
  },

  // Search optimization
  searchTerms: [String],
  colorTags: [String],

  // Analytics cache
  analytics: {
    views: Number,
    uses: Number,
    favorites: Number,
    rating: Number,
    lastUpdated: Date
  },

  createdAt: Date,
  updatedAt: Date
}

// Indexes
db.catalog_items_flexible.createIndex({ catalogId: 1 }, { unique: true });
db.catalog_items_flexible.createIndex({ type: 1, "analytics.popularity": -1 });
db.catalog_items_flexible.createIndex({ searchTerms: "text" });
db.catalog_items_flexible.createIndex({ colorTags: 1 });
```

#### 3.4.3 Pinecone Vector Database

```typescript
// Vector index for visual search
interface PineconeVector {
  id: string;                    // Catalog item ID
  values: number[];              // 2048-dim feature vector
  metadata: {
    type: string;                // Item type
    category: string;
    colors: string[];
    occasions: string[];
    seasons: string[];
    is_active: boolean;
    popularity_score: number;
  };
}

// Index configuration
const pineconeConfig = {
  name: 'catalog-visual-search',
  dimension: 2048,               // ResNet50 output dimension
  metric: 'cosine',              // Cosine similarity
  pods: 1,
  replicas: 2,
  podType: 'p1.x1'              // Performance optimized
};
```

---

## 4. Technology Stack

### 4.1 Backend Services

```yaml
Runtime:
  - Node.js: v20.x LTS
  - TypeScript: 5.x
  - Python: 3.11 (ML services)

Framework:
  - Express.js: REST API
  - Apollo Server: GraphQL
  - Socket.io: WebSocket

Database:
  - PostgreSQL: 15.x
  - MongoDB: 7.x
  - Elasticsearch: 8.x
  - Redis: 7.x
  - Pinecone: Vector database

Storage:
  - AWS S3: File storage
  - CloudFront: CDN

Search:
  - Elasticsearch: Primary search
  - Algolia: Alternative/backup
  - Pinecone: Visual search

ML/AI:
  - TensorFlow: Image processing
  - PyTorch: Feature extraction
  - Sentence Transformers: Text embeddings
```

---

## 5. Performance Optimization

### 5.1 Caching Strategy

```typescript
// Multi-layer caching
class CatalogCacheStrategy {
  // L1: In-memory (Node.js process)
  private memoryCache = new LRU({
    max: 5000,
    ttl: 1000 * 60 * 5  // 5 minutes
  });

  // L2: Redis
  private redisCache: Redis;

  // L3: Database
  private database: CatalogRepository;

  async getCatalogItem(itemId: string): Promise<CatalogItem> {
    // Check L1
    let item = this.memoryCache.get(itemId);
    if (item) return item;

    // Check L2
    const cached = await this.redisCache.get(`catalog:item:${itemId}`);
    if (cached) {
      item = JSON.parse(cached);
      this.memoryCache.set(itemId, item);
      return item;
    }

    // Fetch from database
    item = await this.database.findById(itemId);

    // Populate caches
    await this.redisCache.setex(
      `catalog:item:${itemId}`,
      3600,  // 1 hour
      JSON.stringify(item)
    );
    this.memoryCache.set(itemId, item);

    return item;
  }

  // Search result caching
  async cacheSearchResults(
    queryHash: string,
    results: SearchResponse
  ): Promise<void> {
    await this.redisCache.setex(
      `catalog:search:${queryHash}`,
      900,  // 15 minutes
      JSON.stringify(results)
    );
  }
}
```

### 5.2 Database Optimization

```sql
-- Materialized views for popular queries
CREATE MATERIALIZED VIEW catalog.popular_items AS
SELECT
  i.id,
  i.name,
  i.type,
  i.category,
  i.thumbnail_url,
  i.popularity_score,
  i.view_count,
  i.use_count,
  COUNT(f.id) as favorite_count
FROM catalog.items i
LEFT JOIN catalog.user_favorites f ON f.catalog_item_id = i.id
WHERE i.is_active = true AND i.deleted_at IS NULL
GROUP BY i.id
ORDER BY i.popularity_score DESC, favorite_count DESC
LIMIT 1000;

CREATE UNIQUE INDEX idx_popular_items_id ON catalog.popular_items(id);

-- Refresh every hour
REFRESH MATERIALIZED VIEW CONCURRENTLY catalog.popular_items;

-- Aggregated analytics view
CREATE MATERIALIZED VIEW catalog.daily_item_stats AS
SELECT
  catalog_item_id,
  DATE(created_at) as date,
  event_type,
  COUNT(*) as event_count,
  COUNT(DISTINCT user_id) as unique_users
FROM catalog.item_analytics
WHERE created_at >= NOW() - INTERVAL '90 days'
GROUP BY catalog_item_id, DATE(created_at), event_type;

CREATE INDEX idx_daily_item_stats ON catalog.daily_item_stats(catalog_item_id, date);
```

### 5.3 CDN Configuration

```yaml
CloudFront Distribution:
  Origins:
    - S3: catalog-models-prod
    - S3: catalog-textures-prod
    - S3: catalog-images-prod

  Cache Behaviors:
    Models:
      Path: /models/*
      TTL: 1 year
      Compress: Yes
      Viewer Protocol: redirect-to-https

    Textures:
      Path: /textures/*
      TTL: 1 year
      Compress: Yes
      Optimize Images: Yes

    Thumbnails:
      Path: /thumbnails/*
      TTL: 1 month
      Compress: Yes
      Image Resizing: Yes

  Lambda@Edge:
    - Image resizing on-the-fly
    - WebP conversion for supported browsers
```

---

## 6. Monitoring & Observability

### 6.1 Key Metrics

```yaml
Search Metrics:
  - catalog_search_duration_ms (histogram)
  - catalog_search_results_count (histogram)
  - catalog_search_cache_hit_rate (gauge)
  - elasticsearch_query_duration_ms (histogram)

Catalog Metrics:
  - catalog_items_total (gauge)
  - catalog_items_by_type (gauge)
  - catalog_item_views_total (counter)
  - catalog_item_uses_total (counter)
  - catalog_favorites_total (counter)

Recommendation Metrics:
  - recommendation_duration_ms (histogram)
  - recommendation_click_through_rate (gauge)
  - recommendation_conversion_rate (gauge)

Performance Metrics:
  - api_response_time_ms (histogram)
  - cache_hit_rate (gauge)
  - database_query_duration_ms (histogram)
```

---

## Document Metadata

**Version**: 1.0
**Author**: Fashion Wallet Architecture Team
**Status**: Draft
**Review Cycle**: Bi-weekly
**Next Review**: December 2025

**Dependencies**:
- spec-infra-00 (Database Infrastructure)
- spec-infra-01 (Storage Infrastructure)
- spec-infra-03 (Caching & Queue Infrastructure)
- spec-infra-04 (API Infrastructure)

**Related Documents**:
- spec-feature-02 (Catalog Service Features)
- spec-arch-01 (Avatar Service Architecture)
- spec-arch-03 (Design Service Architecture)

---

**End of Catalog Service Architecture Specification**

import { Injectable, Logger } from '@nestjs/common';
import { ElasticsearchService } from './elasticsearch.service';
import {
  SearchRequestDto,
  SearchResponseDto,
  SearchFacetsDto,
  PaginationDto,
  SearchFacetDto,
  PriceRangeStatsDto,
} from '../dto/search.dto';
import { SortField } from '../dto/catalog-filter.dto';

/**
 * Service for catalog search operations using Elasticsearch
 * Provides full-text search, faceted search, and autocomplete
 */
@Injectable()
export class CatalogSearchService {
  private readonly logger = new Logger(CatalogSearchService.name);
  private searchCache = new Map<string, { data: SearchResponseDto; expires: number }>();
  private readonly CACHE_TTL = 15 * 60 * 1000; // 15 minutes

  constructor(private readonly elasticsearchService: ElasticsearchService) {}

  /**
   * Search catalog items with filters and facets
   */
  async search(searchRequest: SearchRequestDto): Promise<SearchResponseDto> {
    const startTime = Date.now();

    // Check cache first
    const cacheKey = this.generateCacheKey(searchRequest);
    const cached = this.getCachedSearch(cacheKey);
    if (cached) {
      this.logger.debug(`Cache hit for search: ${cacheKey}`);
      return cached;
    }

    try {
      // Build Elasticsearch query
      const esQuery = this.buildElasticsearchQuery(searchRequest);

      // Execute search
      const response = await this.elasticsearchService.search(esQuery);

      // Transform response
      const searchResponse = this.transformSearchResponse(
        response,
        searchRequest,
        Date.now() - startTime
      );

      // Cache the result
      this.cacheSearch(cacheKey, searchResponse);

      this.logger.log(
        `Search completed: query="${searchRequest.query}", results=${searchResponse.items.length}, took=${searchResponse.took}ms`
      );

      return searchResponse;
    } catch (error) {
      this.logger.error(`Search failed: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Get autocomplete suggestions
   */
  async autocomplete(prefix: string, limit: number = 10): Promise<string[]> {
    try {
      const suggestions = await this.elasticsearchService.suggest(prefix, limit);
      this.logger.debug(`Autocomplete for "${prefix}": ${suggestions.length} suggestions`);
      return suggestions;
    } catch (error) {
      this.logger.error(`Autocomplete failed: ${error.message}`, error.stack);
      return [];
    }
  }

  /**
   * Build Elasticsearch query from search request
   */
  private buildElasticsearchQuery(searchRequest: SearchRequestDto): any {
    const {
      query,
      page = 1,
      limit = 24,
      category,
      tags,
      colors,
      occasions,
      seasons,
      styles,
      priceRange,
      brandPartner,
      type,
      isFeatured,
      isActive,
      sortBy,
      sortOrder,
      includeFacets,
    } = searchRequest;

    // Calculate pagination
    const from = (page - 1) * limit;

    // Build the query
    const mustQueries: any[] = [];
    const filterQueries: any[] = [];

    // Full-text search
    if (query) {
      mustQueries.push({
        multi_match: {
          query,
          fields: ['name^3', 'description^2', 'tags', 'category'],
          type: 'best_fields',
          fuzziness: 'AUTO',
          prefix_length: 2,
          operator: 'or',
        },
      });
    }

    // Filter by active status (default: true)
    if (isActive !== undefined) {
      filterQueries.push({ term: { is_active: isActive } });
    }

    // Filter by type
    if (type) {
      filterQueries.push({ term: { type } });
    }

    // Filter by categories
    if (category && category.length > 0) {
      filterQueries.push({ terms: { category } });
    }

    // Filter by tags
    if (tags && tags.length > 0) {
      filterQueries.push({ terms: { tags } });
    }

    // Filter by colors (nested query)
    if (colors && colors.length > 0) {
      filterQueries.push({
        nested: {
          path: 'colors',
          query: {
            terms: { 'colors.name': colors },
          },
        },
      });
    }

    // Filter by occasions
    if (occasions && occasions.length > 0) {
      filterQueries.push({ terms: { occasions } });
    }

    // Filter by seasons
    if (seasons && seasons.length > 0) {
      filterQueries.push({ terms: { seasons } });
    }

    // Filter by styles
    if (styles && styles.length > 0) {
      filterQueries.push({ terms: { styles } });
    }

    // Filter by brand partner
    if (brandPartner) {
      filterQueries.push({ term: { brand_partner: brandPartner } });
    }

    // Filter by featured
    if (isFeatured !== undefined) {
      filterQueries.push({ term: { is_featured: isFeatured } });
    }

    // Filter by price range
    if (priceRange && (priceRange.min !== undefined || priceRange.max !== undefined)) {
      const rangeQuery: any = {};
      if (priceRange.min !== undefined) {
        rangeQuery.gte = priceRange.min;
      }
      if (priceRange.max !== undefined) {
        rangeQuery.lte = priceRange.max;
      }
      filterQueries.push({
        range: {
          'price_range.gte': rangeQuery,
        },
      });
    }

    // Build the complete query
    const esQuery: any = {
      from,
      size: limit,
      query: {
        bool: {
          must: mustQueries.length > 0 ? mustQueries : [{ match_all: {} }],
          filter: filterQueries,
        },
      },
    };

    // Add sorting
    esQuery.sort = this.buildSortQuery(sortBy, sortOrder, query);

    // Add aggregations for facets
    if (includeFacets) {
      esQuery.aggs = this.buildAggregations();
    }

    return esQuery;
  }

  /**
   * Build sort query based on sort field and order
   */
  private buildSortQuery(
    sortBy?: SortField,
    sortOrder: string = 'desc',
    hasQuery?: string
  ): any[] {
    const sort: any[] = [];

    switch (sortBy) {
      case SortField.RELEVANCE:
        if (hasQuery) {
          sort.push({ _score: { order: 'desc' } });
        } else {
          // If no query, sort by popularity instead
          sort.push({ popularity_score: { order: 'desc' } });
        }
        break;

      case SortField.POPULARITY:
        sort.push({ popularity_score: { order: sortOrder } });
        break;

      case SortField.NEWEST:
        sort.push({ created_at: { order: sortOrder } });
        break;

      case SortField.NAME:
        sort.push({ 'name.keyword': { order: sortOrder } });
        break;

      default:
        // Default to relevance or popularity
        if (hasQuery) {
          sort.push({ _score: { order: 'desc' } });
        } else {
          sort.push({ popularity_score: { order: 'desc' } });
        }
    }

    // Always add a tie-breaker
    sort.push({ id: { order: 'asc' } });

    return sort;
  }

  /**
   * Build aggregations for faceted search
   */
  private buildAggregations(): any {
    return {
      categories: {
        terms: {
          field: 'category',
          size: 50,
        },
      },
      colors: {
        nested: {
          path: 'colors',
        },
        aggs: {
          color_names: {
            terms: {
              field: 'colors.name',
              size: 50,
            },
          },
        },
      },
      occasions: {
        terms: {
          field: 'occasions',
          size: 50,
        },
      },
      seasons: {
        terms: {
          field: 'seasons',
          size: 50,
        },
      },
      styles: {
        terms: {
          field: 'styles',
          size: 50,
        },
      },
      brands: {
        terms: {
          field: 'brand_partner',
          size: 50,
        },
      },
      price_stats: {
        stats: {
          field: 'price_range.gte',
        },
      },
    };
  }

  /**
   * Transform Elasticsearch response to SearchResponseDto
   */
  private transformSearchResponse(
    esResponse: any,
    searchRequest: SearchRequestDto,
    took: number
  ): SearchResponseDto {
    const { page = 1, limit = 24, includeFacets } = searchRequest;

    // Extract hits
    const hits = esResponse.hits?.hits || [];
    const total = esResponse.hits?.total?.value || 0;

    // Transform items
    const items = hits.map((hit: any) => ({
      id: hit._id,
      score: hit._score,
      ...hit._source,
    }));

    // Build pagination
    const totalPages = Math.ceil(total / limit);
    const pagination: PaginationDto = {
      total,
      page,
      limit,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    };

    // Build response
    const response: SearchResponseDto = {
      items,
      pagination,
      took,
    };

    // Add facets if requested
    if (includeFacets && esResponse.aggregations) {
      response.facets = this.transformAggregations(esResponse.aggregations);
    }

    return response;
  }

  /**
   * Transform Elasticsearch aggregations to SearchFacetsDto
   */
  private transformAggregations(aggregations: any): SearchFacetsDto {
    const facets: SearchFacetsDto = {
      categories: this.transformBuckets(aggregations.categories?.buckets || []),
      colors: this.transformBuckets(
        aggregations.colors?.color_names?.buckets || []
      ),
      occasions: this.transformBuckets(aggregations.occasions?.buckets || []),
      seasons: this.transformBuckets(aggregations.seasons?.buckets || []),
      brands: this.transformBuckets(aggregations.brands?.buckets || []),
      styles: this.transformBuckets(aggregations.styles?.buckets || []),
    };

    // Add price range stats if available
    if (aggregations.price_stats) {
      const stats = aggregations.price_stats;
      if (stats.count > 0) {
        facets.priceRange = {
          min: Math.floor(stats.min || 0),
          max: Math.ceil(stats.max || 0),
          avg: Math.round(stats.avg || 0),
        } as PriceRangeStatsDto;
      }
    }

    return facets;
  }

  /**
   * Transform Elasticsearch buckets to SearchFacetDto array
   */
  private transformBuckets(buckets: any[]): SearchFacetDto[] {
    return buckets.map((bucket) => ({
      value: bucket.key,
      count: bucket.doc_count,
    }));
  }

  /**
   * Generate cache key from search request
   */
  private generateCacheKey(searchRequest: SearchRequestDto): string {
    return JSON.stringify(searchRequest);
  }

  /**
   * Get cached search result if not expired
   */
  private getCachedSearch(cacheKey: string): SearchResponseDto | null {
    const cached = this.searchCache.get(cacheKey);
    if (cached && cached.expires > Date.now()) {
      return cached.data;
    }
    // Remove expired cache
    if (cached) {
      this.searchCache.delete(cacheKey);
    }
    return null;
  }

  /**
   * Cache search result
   */
  private cacheSearch(cacheKey: string, data: SearchResponseDto): void {
    this.searchCache.set(cacheKey, {
      data,
      expires: Date.now() + this.CACHE_TTL,
    });

    // Cleanup old cache entries periodically
    if (this.searchCache.size > 1000) {
      this.cleanupCache();
    }
  }

  /**
   * Remove expired cache entries
   */
  private cleanupCache(): void {
    const now = Date.now();
    let removed = 0;

    for (const [key, value] of this.searchCache.entries()) {
      if (value.expires < now) {
        this.searchCache.delete(key);
        removed++;
      }
    }

    this.logger.debug(`Cache cleanup: removed ${removed} expired entries`);
  }

  /**
   * Clear all search cache
   */
  clearCache(): void {
    this.searchCache.clear();
    this.logger.log('Search cache cleared');
  }
}

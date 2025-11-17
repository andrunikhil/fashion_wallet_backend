import { Resolver, Query, Args } from '@nestjs/graphql';
import { Logger } from '@nestjs/common';
import { CatalogSearchService } from '../services/catalog-search.service';
import { SearchRequestDto } from '../dto/search.dto';

/**
 * GraphQL Resolver for Search operations
 */
@Resolver('CatalogSearch')
export class SearchResolver {
  private readonly logger = new Logger(SearchResolver.name);

  constructor(private readonly catalogSearchService: CatalogSearchService) {}

  /**
   * Search catalog items
   */
  @Query('searchCatalog')
  async searchCatalog(@Args('request') request: SearchRequestDto) {
    this.logger.debug('GraphQL query: searchCatalog');

    return this.catalogSearchService.search(request);
  }

  /**
   * Get autocomplete suggestions
   */
  @Query('catalogSuggestions')
  async getCatalogSuggestions(
    @Args('prefix') prefix: string,
    @Args('limit', { type: () => Number, nullable: true, defaultValue: 10 })
    limit: number
  ) {
    this.logger.debug(`GraphQL query: catalogSuggestions(${prefix})`);

    const suggestions = await this.catalogSearchService.autocomplete(prefix, limit);

    return {
      suggestions,
      took: 0, // Calculate if needed
    };
  }
}

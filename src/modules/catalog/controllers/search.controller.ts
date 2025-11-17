import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  HttpCode,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiQuery,
} from '@nestjs/swagger';
import { CatalogSearchService } from '../services/catalog-search.service';
import {
  SearchRequestDto,
  SearchResponseDto,
  AutocompleteRequestDto,
  AutocompleteResponseDto,
} from '../dto/search.dto';

/**
 * Controller for catalog search operations
 * Provides full-text search, faceted search, and autocomplete endpoints
 */
@ApiTags('Catalog Search')
@Controller('catalog/search')
export class SearchController {
  private readonly logger = new Logger(SearchController.name);

  constructor(private readonly catalogSearchService: CatalogSearchService) {}

  /**
   * Search catalog items with filters and facets
   * POST /catalog/search
   */
  @Post()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Search catalog items',
    description:
      'Full-text search with faceted filtering. Supports pagination, sorting, and facets for refined search.',
  })
  @ApiBody({ type: SearchRequestDto })
  @ApiResponse({
    status: 200,
    description: 'Search results with pagination and facets',
    type: SearchResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid search parameters',
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error',
  })
  async search(@Body() searchRequest: SearchRequestDto): Promise<SearchResponseDto> {
    this.logger.log(`Search request: query="${searchRequest.query}"`);

    const startTime = Date.now();
    const result = await this.catalogSearchService.search(searchRequest);

    this.logger.log(
      `Search completed: ${result.items.length} results in ${Date.now() - startTime}ms`
    );

    return result;
  }

  /**
   * Get autocomplete suggestions
   * GET /catalog/search/autocomplete
   */
  @Get('autocomplete')
  @ApiOperation({
    summary: 'Get autocomplete suggestions',
    description:
      'Returns autocomplete suggestions based on the provided prefix for catalog item names.',
  })
  @ApiQuery({
    name: 'prefix',
    description: 'Search prefix for autocomplete',
    example: 'sum',
    required: true,
  })
  @ApiQuery({
    name: 'limit',
    description: 'Maximum number of suggestions',
    example: 10,
    required: false,
  })
  @ApiResponse({
    status: 200,
    description: 'Autocomplete suggestions',
    type: AutocompleteResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid parameters',
  })
  async autocomplete(
    @Query('prefix') prefix: string,
    @Query('limit') limit?: number
  ): Promise<AutocompleteResponseDto> {
    this.logger.debug(`Autocomplete request: prefix="${prefix}"`);

    const startTime = Date.now();
    const suggestions = await this.catalogSearchService.autocomplete(
      prefix,
      limit ? parseInt(limit.toString(), 10) : 10
    );

    return {
      suggestions,
      took: Date.now() - startTime,
    };
  }

  /**
   * Quick search using GET (for simple queries without complex filters)
   * GET /catalog/search
   */
  @Get()
  @ApiOperation({
    summary: 'Quick search catalog items',
    description:
      'Simple GET endpoint for quick searches. For advanced filtering, use POST /catalog/search.',
  })
  @ApiQuery({
    name: 'q',
    description: 'Search query',
    example: 'summer dress',
    required: false,
  })
  @ApiQuery({
    name: 'page',
    description: 'Page number (1-indexed)',
    example: 1,
    required: false,
  })
  @ApiQuery({
    name: 'limit',
    description: 'Items per page',
    example: 24,
    required: false,
  })
  @ApiQuery({
    name: 'sortBy',
    description: 'Sort field',
    enum: ['relevance', 'popularity', 'newest', 'name'],
    required: false,
  })
  @ApiResponse({
    status: 200,
    description: 'Search results',
    type: SearchResponseDto,
  })
  async quickSearch(
    @Query('q') query?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('sortBy') sortBy?: string,
    @Query('category') category?: string,
    @Query('tags') tags?: string
  ): Promise<SearchResponseDto> {
    this.logger.log(`Quick search: query="${query}"`);

    const searchRequest: SearchRequestDto = {
      query,
      page: page ? parseInt(page.toString(), 10) : 1,
      limit: limit ? parseInt(limit.toString(), 10) : 24,
      sortBy: sortBy as any,
      category: category ? category.split(',') : undefined,
      tags: tags ? tags.split(',') : undefined,
    };

    return this.catalogSearchService.search(searchRequest);
  }
}

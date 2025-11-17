import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  Param,
  HttpCode,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiQuery,
  ApiParam,
} from '@nestjs/swagger';
import { RecommendationService } from '../services/recommendation.service';
import { UserInteractionService } from '../services/user-interaction.service';
import {
  RecommendationRequestDto,
  RecommendationResponseDto,
  RecommendationType,
  UserInteractionDto,
} from '../dto/recommendation.dto';

/**
 * Controller for catalog recommendations and user interactions
 */
@ApiTags('Catalog Recommendations')
@Controller('catalog/recommendations')
export class RecommendationController {
  private readonly logger = new Logger(RecommendationController.name);

  constructor(
    private readonly recommendationService: RecommendationService,
    private readonly userInteractionService: UserInteractionService
  ) {}

  /**
   * Get recommendations
   * POST /catalog/recommendations
   */
  @Post()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get catalog item recommendations',
    description:
      'Returns recommendations based on type: personalized, trending, similar, complementary, popular, or new arrivals',
  })
  @ApiResponse({
    status: 200,
    description: 'Recommendations retrieved successfully',
    type: RecommendationResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid request parameters',
  })
  async getRecommendations(
    @Body() request: RecommendationRequestDto
  ): Promise<RecommendationResponseDto> {
    this.logger.log(`Recommendations request: type=${request.type}`);

    const startTime = Date.now();
    const result = await this.recommendationService.getRecommendations(request);

    this.logger.log(
      `Recommendations completed: ${result.items.length} items in ${Date.now() - startTime}ms`
    );

    return result;
  }

  /**
   * Get personalized recommendations for a user
   * GET /catalog/recommendations/personalized/:userId
   */
  @Get('personalized/:userId')
  @ApiOperation({
    summary: 'Get personalized recommendations',
    description: 'Returns personalized recommendations based on user history and preferences',
  })
  @ApiParam({
    name: 'userId',
    description: 'User ID',
    example: 'uuid-here',
  })
  @ApiQuery({
    name: 'limit',
    description: 'Number of recommendations',
    example: 12,
    required: false,
  })
  @ApiResponse({
    status: 200,
    description: 'Personalized recommendations',
    type: RecommendationResponseDto,
  })
  async getPersonalized(
    @Param('userId') userId: string,
    @Query('limit') limit?: number
  ): Promise<RecommendationResponseDto> {
    return this.recommendationService.getRecommendations({
      type: RecommendationType.PERSONALIZED,
      userId,
      limit: limit ? parseInt(limit.toString(), 10) : 12,
    });
  }

  /**
   * Get trending items
   * GET /catalog/recommendations/trending
   */
  @Get('trending')
  @ApiOperation({
    summary: 'Get trending items',
    description: 'Returns items that are currently trending based on recent engagement',
  })
  @ApiQuery({
    name: 'limit',
    description: 'Number of recommendations',
    example: 12,
    required: false,
  })
  @ApiQuery({
    name: 'category',
    description: 'Filter by category',
    example: 'dresses',
    required: false,
  })
  @ApiResponse({
    status: 200,
    description: 'Trending items',
    type: RecommendationResponseDto,
  })
  async getTrending(
    @Query('limit') limit?: number,
    @Query('category') category?: string
  ): Promise<RecommendationResponseDto> {
    return this.recommendationService.getRecommendations({
      type: RecommendationType.TRENDING,
      limit: limit ? parseInt(limit.toString(), 10) : 12,
      category: category ? [category] : undefined,
    });
  }

  /**
   * Get similar items
   * GET /catalog/recommendations/similar/:itemId
   */
  @Get('similar/:itemId')
  @ApiOperation({
    summary: 'Get similar items',
    description: 'Returns items similar to the specified item based on attributes',
  })
  @ApiParam({
    name: 'itemId',
    description: 'Catalog item ID',
    example: 'uuid-here',
  })
  @ApiQuery({
    name: 'limit',
    description: 'Number of recommendations',
    example: 12,
    required: false,
  })
  @ApiResponse({
    status: 200,
    description: 'Similar items',
    type: RecommendationResponseDto,
  })
  async getSimilar(
    @Param('itemId') itemId: string,
    @Query('limit') limit?: number
  ): Promise<RecommendationResponseDto> {
    return this.recommendationService.getRecommendations({
      type: RecommendationType.SIMILAR,
      itemId,
      limit: limit ? parseInt(limit.toString(), 10) : 12,
    });
  }

  /**
   * Get complementary items
   * GET /catalog/recommendations/complementary/:itemId
   */
  @Get('complementary/:itemId')
  @ApiOperation({
    summary: 'Get complementary items',
    description:
      'Returns items that complement the specified item (outfit matching)',
  })
  @ApiParam({
    name: 'itemId',
    description: 'Catalog item ID',
    example: 'uuid-here',
  })
  @ApiQuery({
    name: 'limit',
    description: 'Number of recommendations',
    example: 12,
    required: false,
  })
  @ApiResponse({
    status: 200,
    description: 'Complementary items',
    type: RecommendationResponseDto,
  })
  async getComplementary(
    @Param('itemId') itemId: string,
    @Query('limit') limit?: number
  ): Promise<RecommendationResponseDto> {
    return this.recommendationService.getRecommendations({
      type: RecommendationType.COMPLEMENTARY,
      itemId,
      limit: limit ? parseInt(limit.toString(), 10) : 12,
    });
  }

  /**
   * Get popular items
   * GET /catalog/recommendations/popular
   */
  @Get('popular')
  @ApiOperation({
    summary: 'Get popular items',
    description: 'Returns most popular items overall',
  })
  @ApiQuery({
    name: 'limit',
    description: 'Number of recommendations',
    example: 12,
    required: false,
  })
  @ApiQuery({
    name: 'category',
    description: 'Filter by category',
    example: 'dresses',
    required: false,
  })
  @ApiResponse({
    status: 200,
    description: 'Popular items',
    type: RecommendationResponseDto,
  })
  async getPopular(
    @Query('limit') limit?: number,
    @Query('category') category?: string
  ): Promise<RecommendationResponseDto> {
    return this.recommendationService.getRecommendations({
      type: RecommendationType.POPULAR,
      limit: limit ? parseInt(limit.toString(), 10) : 12,
      category: category ? [category] : undefined,
    });
  }

  /**
   * Get new arrivals
   * GET /catalog/recommendations/new-arrivals
   */
  @Get('new-arrivals')
  @ApiOperation({
    summary: 'Get new arrivals',
    description: 'Returns recently added items to the catalog',
  })
  @ApiQuery({
    name: 'limit',
    description: 'Number of recommendations',
    example: 12,
    required: false,
  })
  @ApiQuery({
    name: 'category',
    description: 'Filter by category',
    example: 'dresses',
    required: false,
  })
  @ApiResponse({
    status: 200,
    description: 'New arrival items',
    type: RecommendationResponseDto,
  })
  async getNewArrivals(
    @Query('limit') limit?: number,
    @Query('category') category?: string
  ): Promise<RecommendationResponseDto> {
    return this.recommendationService.getRecommendations({
      type: RecommendationType.NEW_ARRIVALS,
      limit: limit ? parseInt(limit.toString(), 10) : 12,
      category: category ? [category] : undefined,
    });
  }

  /**
   * Track user interaction
   * POST /catalog/recommendations/track
   */
  @Post('track')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Track user interaction',
    description:
      'Track user interactions with catalog items for improving recommendations',
  })
  @ApiResponse({
    status: 204,
    description: 'Interaction tracked successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid interaction data',
  })
  async trackInteraction(@Body() interaction: UserInteractionDto): Promise<void> {
    this.logger.debug(
      `Tracking ${interaction.interactionType}: user=${interaction.userId}, item=${interaction.itemId}`
    );

    await this.userInteractionService.trackInteraction(interaction);
  }

  /**
   * Get user's interaction history
   * GET /catalog/recommendations/interactions/:userId
   */
  @Get('interactions/:userId')
  @ApiOperation({
    summary: 'Get user interaction history',
    description: 'Returns recent interactions for a user',
  })
  @ApiParam({
    name: 'userId',
    description: 'User ID',
    example: 'uuid-here',
  })
  @ApiQuery({
    name: 'limit',
    description: 'Number of interactions',
    example: 50,
    required: false,
  })
  @ApiQuery({
    name: 'type',
    description: 'Filter by interaction type',
    example: 'view',
    required: false,
  })
  @ApiResponse({
    status: 200,
    description: 'User interaction history',
  })
  async getUserInteractions(
    @Param('userId') userId: string,
    @Query('limit') limit?: number,
    @Query('type') type?: string
  ): Promise<any[]> {
    return this.userInteractionService.getUserRecentInteractions(
      userId,
      limit ? parseInt(limit.toString(), 10) : 50,
      type
    );
  }
}

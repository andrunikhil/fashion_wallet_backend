import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { CollectionService } from '../services/collection.service';
import {
  CreateCollectionDto,
  UpdateCollectionDto,
  AddCollectionItemDto,
  ReorderItemsDto,
  PaginatedResultDto,
} from '../dto';
import { Collection, CollectionItem } from '../entities';
import { JwtAuthGuard, RolesGuard } from '../../auth/guards';
import { Roles } from '../../auth/decorators';

@Controller('catalog/collections')
@ApiTags('Collections')
@ApiBearerAuth()
export class CollectionController {
  constructor(private readonly collectionService: CollectionService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'catalog_manager')
  @ApiOperation({ summary: 'Create a new collection (Admin only)' })
  @ApiResponse({
    status: 201,
    description: 'Collection created successfully',
    type: Collection,
  })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @ApiResponse({ status: 409, description: 'Collection with same name exists' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async createCollection(@Body() dto: CreateCollectionDto): Promise<Collection> {
    return this.collectionService.createCollection(dto);
  }

  @Get('featured')
  @ApiOperation({ summary: 'Get featured collections' })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Number of collections to return',
    example: 10,
  })
  @ApiResponse({
    status: 200,
    description: 'Featured collections retrieved successfully',
    type: [Collection],
  })
  async getFeaturedCollections(
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
  ): Promise<Collection[]> {
    return this.collectionService.getFeaturedCollections(limit);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get collection by ID with items' })
  @ApiParam({ name: 'id', description: 'Collection UUID' })
  @ApiResponse({
    status: 200,
    description: 'Collection found',
    type: Collection,
  })
  @ApiResponse({ status: 404, description: 'Collection not found' })
  async getCollection(@Param('id', ParseUUIDPipe) id: string): Promise<Collection> {
    return this.collectionService.getCollection(id);
  }

  @Get()
  @ApiOperation({ summary: 'List collections with pagination' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number', example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Items per page', example: 24 })
  @ApiQuery({ name: 'public', required: false, type: Boolean, description: 'Filter public collections only' })
  @ApiResponse({
    status: 200,
    description: 'Collections retrieved successfully',
  })
  async listCollections(
    @Query('page', new ParseIntPipe({ optional: true })) page?: number,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
    @Query('public') isPublic?: string,
  ): Promise<PaginatedResultDto<Collection>> {
    const publicFilter = isPublic === 'true' ? true : isPublic === 'false' ? false : undefined;
    return this.collectionService.listCollections(page, limit, publicFilter);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'catalog_manager')
  @ApiOperation({ summary: 'Update collection (Admin only)' })
  @ApiParam({ name: 'id', description: 'Collection UUID' })
  @ApiResponse({
    status: 200,
    description: 'Collection updated successfully',
    type: Collection,
  })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @ApiResponse({ status: 404, description: 'Collection not found' })
  @ApiResponse({ status: 409, description: 'Collection with same name exists' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async updateCollection(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCollectionDto,
  ): Promise<Collection> {
    return this.collectionService.updateCollection(id, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete collection (Admin only)' })
  @ApiParam({ name: 'id', description: 'Collection UUID' })
  @ApiResponse({ status: 204, description: 'Collection deleted successfully' })
  @ApiResponse({ status: 404, description: 'Collection not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - admin only' })
  async deleteCollection(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    await this.collectionService.deleteCollection(id);
  }

  // ===== Collection Item Management =====

  @Post(':id/items')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'catalog_manager')
  @ApiOperation({ summary: 'Add item to collection (Admin only)' })
  @ApiParam({ name: 'id', description: 'Collection UUID' })
  @ApiResponse({
    status: 201,
    description: 'Item added to collection successfully',
    type: CollectionItem,
  })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @ApiResponse({ status: 404, description: 'Collection or catalog item not found' })
  @ApiResponse({ status: 409, description: 'Item already in collection' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async addItemToCollection(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AddCollectionItemDto,
  ): Promise<CollectionItem> {
    return this.collectionService.addItemToCollection(id, dto);
  }

  @Delete(':id/items/:itemId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'catalog_manager')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove item from collection (Admin only)' })
  @ApiParam({ name: 'id', description: 'Collection UUID' })
  @ApiParam({ name: 'itemId', description: 'Catalog item UUID' })
  @ApiResponse({ status: 204, description: 'Item removed from collection successfully' })
  @ApiResponse({ status: 404, description: 'Collection or item not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async removeItemFromCollection(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('itemId', ParseUUIDPipe) itemId: string,
  ): Promise<void> {
    await this.collectionService.removeItemFromCollection(id, itemId);
  }

  @Put(':id/items/reorder')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'catalog_manager')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Reorder items in collection (Admin only)' })
  @ApiParam({ name: 'id', description: 'Collection UUID' })
  @ApiResponse({ status: 204, description: 'Items reordered successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @ApiResponse({ status: 404, description: 'Collection not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async reorderItems(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ReorderItemsDto,
  ): Promise<void> {
    await this.collectionService.reorderCollectionItems(id, dto);
  }
}

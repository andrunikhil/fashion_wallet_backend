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
import { CatalogManagementService } from '../services/catalog-management.service';
import {
  CreateCatalogItemDto,
  UpdateCatalogItemDto,
  CatalogFilterDto,
  PaginatedResultDto,
  CatalogItemType,
  CreateSilhouetteDto,
  CreateFabricDto,
  CreatePatternDto,
  CreateElementDto,
} from '../dto';
import { CatalogItem } from '../entities';
import { JwtAuthGuard, RolesGuard } from '../../auth/guards';
import { Roles } from '../../auth/decorators';

@Controller('catalog')
@ApiTags('Catalog')
@ApiBearerAuth()
export class CatalogController {
  constructor(
    private readonly catalogManagementService: CatalogManagementService,
  ) {}

  // ===== CRUD Operations =====

  @Post('items')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'catalog_manager')
  @ApiOperation({ summary: 'Create a new catalog item (Admin only)' })
  @ApiResponse({
    status: 201,
    description: 'Catalog item created successfully',
    type: CatalogItem,
  })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @ApiResponse({ status: 409, description: 'Duplicate item exists' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - insufficient permissions' })
  async createCatalogItem(
    @Body() dto: CreateCatalogItemDto,
  ): Promise<CatalogItem> {
    return this.catalogManagementService.createCatalogItem(dto);
  }

  @Get('items/:id')
  @ApiOperation({ summary: 'Get catalog item by ID' })
  @ApiParam({ name: 'id', description: 'Catalog item UUID' })
  @ApiResponse({
    status: 200,
    description: 'Catalog item found',
    type: CatalogItem,
  })
  @ApiResponse({ status: 404, description: 'Catalog item not found' })
  async getCatalogItem(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<CatalogItem> {
    return this.catalogManagementService.getCatalogItem(id);
  }

  @Get('items')
  @ApiOperation({ summary: 'List catalog items with filters and pagination' })
  @ApiResponse({
    status: 200,
    description: 'Catalog items retrieved successfully',
  })
  async listCatalogItems(
    @Query() filters: CatalogFilterDto,
  ): Promise<PaginatedResultDto<CatalogItem>> {
    return this.catalogManagementService.listCatalogItems(filters);
  }

  @Put('items/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'catalog_manager')
  @ApiOperation({ summary: 'Update catalog item (Admin only)' })
  @ApiParam({ name: 'id', description: 'Catalog item UUID' })
  @ApiResponse({
    status: 200,
    description: 'Catalog item updated successfully',
    type: CatalogItem,
  })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @ApiResponse({ status: 404, description: 'Catalog item not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - insufficient permissions' })
  async updateCatalogItem(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCatalogItemDto,
  ): Promise<CatalogItem> {
    return this.catalogManagementService.updateCatalogItem(id, dto);
  }

  @Delete('items/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete catalog item (Admin only)' })
  @ApiParam({ name: 'id', description: 'Catalog item UUID' })
  @ApiResponse({ status: 204, description: 'Catalog item deleted successfully' })
  @ApiResponse({ status: 404, description: 'Catalog item not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - admin only' })
  async deleteCatalogItem(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    await this.catalogManagementService.deleteCatalogItem(id);
  }

  // ===== Type-specific List Endpoints =====

  @Get('silhouettes')
  @ApiOperation({ summary: 'List silhouettes with pagination' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Items per page' })
  @ApiResponse({
    status: 200,
    description: 'Silhouettes retrieved successfully',
  })
  async listSilhouettes(
    @Query() filters: CatalogFilterDto,
  ): Promise<PaginatedResultDto<CatalogItem>> {
    return this.catalogManagementService.getCatalogItemsByType(
      CatalogItemType.SILHOUETTE,
      filters.page,
      filters.limit,
    );
  }

  @Get('fabrics')
  @ApiOperation({ summary: 'List fabrics with pagination' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Items per page' })
  @ApiResponse({
    status: 200,
    description: 'Fabrics retrieved successfully',
  })
  async listFabrics(
    @Query() filters: CatalogFilterDto,
  ): Promise<PaginatedResultDto<CatalogItem>> {
    return this.catalogManagementService.getCatalogItemsByType(
      CatalogItemType.FABRIC,
      filters.page,
      filters.limit,
    );
  }

  @Get('patterns')
  @ApiOperation({ summary: 'List patterns with pagination' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Items per page' })
  @ApiResponse({
    status: 200,
    description: 'Patterns retrieved successfully',
  })
  async listPatterns(
    @Query() filters: CatalogFilterDto,
  ): Promise<PaginatedResultDto<CatalogItem>> {
    return this.catalogManagementService.getCatalogItemsByType(
      CatalogItemType.PATTERN,
      filters.page,
      filters.limit,
    );
  }

  @Get('elements')
  @ApiOperation({ summary: 'List design elements with pagination' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Items per page' })
  @ApiResponse({
    status: 200,
    description: 'Elements retrieved successfully',
  })
  async listElements(
    @Query() filters: CatalogFilterDto,
  ): Promise<PaginatedResultDto<CatalogItem>> {
    return this.catalogManagementService.getCatalogItemsByType(
      CatalogItemType.ELEMENT,
      filters.page,
      filters.limit,
    );
  }

  // ===== Type-specific Creation Endpoints (Optional - for better type safety) =====

  @Post('silhouettes')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'catalog_manager')
  @ApiOperation({ summary: 'Create a new silhouette (Admin only)' })
  @ApiResponse({
    status: 201,
    description: 'Silhouette created successfully',
    type: CatalogItem,
  })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @ApiResponse({ status: 409, description: 'Duplicate item exists' })
  async createSilhouette(
    @Body() dto: CreateSilhouetteDto,
  ): Promise<CatalogItem> {
    return this.catalogManagementService.createCatalogItem(dto);
  }

  @Post('fabrics')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'catalog_manager')
  @ApiOperation({ summary: 'Create a new fabric (Admin only)' })
  @ApiResponse({
    status: 201,
    description: 'Fabric created successfully',
    type: CatalogItem,
  })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @ApiResponse({ status: 409, description: 'Duplicate item exists' })
  async createFabric(
    @Body() dto: CreateFabricDto,
  ): Promise<CatalogItem> {
    return this.catalogManagementService.createCatalogItem(dto);
  }

  @Post('patterns')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'catalog_manager')
  @ApiOperation({ summary: 'Create a new pattern (Admin only)' })
  @ApiResponse({
    status: 201,
    description: 'Pattern created successfully',
    type: CatalogItem,
  })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @ApiResponse({ status: 409, description: 'Duplicate item exists' })
  async createPattern(
    @Body() dto: CreatePatternDto,
  ): Promise<CatalogItem> {
    return this.catalogManagementService.createCatalogItem(dto);
  }

  @Post('elements')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'catalog_manager')
  @ApiOperation({ summary: 'Create a new design element (Admin only)' })
  @ApiResponse({
    status: 201,
    description: 'Element created successfully',
    type: CatalogItem,
  })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @ApiResponse({ status: 409, description: 'Duplicate item exists' })
  async createElement(
    @Body() dto: CreateElementDto,
  ): Promise<CatalogItem> {
    return this.catalogManagementService.createCatalogItem(dto);
  }
}

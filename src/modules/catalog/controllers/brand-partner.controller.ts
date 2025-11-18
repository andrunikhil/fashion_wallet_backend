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
import { BrandPartnerService } from '../services/brand-partner.service';
import {
  CreateBrandPartnerDto,
  UpdateBrandPartnerDto,
  PaginatedResultDto,
  PartnershipType,
} from '../dto';
import { BrandPartner, CatalogItem } from '../entities';
import { JwtAuthGuard, RolesGuard } from '../../auth/guards';
import { Roles } from '../../auth/decorators';

@Controller('catalog/brand-partners')
@ApiTags('Brand Partners')
@ApiBearerAuth()
export class BrandPartnerController {
  constructor(private readonly brandPartnerService: BrandPartnerService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'catalog_manager')
  @ApiOperation({ summary: 'Create a new brand partner (Admin only)' })
  @ApiResponse({
    status: 201,
    description: 'Brand partner created successfully',
    type: BrandPartner,
  })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @ApiResponse({ status: 409, description: 'Brand partner with same name exists' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async createBrandPartner(@Body() dto: CreateBrandPartnerDto): Promise<BrandPartner> {
    return this.brandPartnerService.createBrandPartner(dto);
  }

  @Get('active')
  @ApiOperation({ summary: 'Get all active brand partners' })
  @ApiResponse({
    status: 200,
    description: 'Active brand partners retrieved successfully',
    type: [BrandPartner],
  })
  async getActiveBrandPartners(): Promise<BrandPartner[]> {
    return this.brandPartnerService.getActiveBrandPartners();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get brand partner by ID' })
  @ApiParam({ name: 'id', description: 'Brand partner UUID' })
  @ApiResponse({
    status: 200,
    description: 'Brand partner found',
    type: BrandPartner,
  })
  @ApiResponse({ status: 404, description: 'Brand partner not found' })
  async getBrandPartner(@Param('id', ParseUUIDPipe) id: string): Promise<BrandPartner> {
    return this.brandPartnerService.getBrandPartner(id);
  }

  @Get()
  @ApiOperation({ summary: 'List brand partners with pagination' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number', example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Items per page', example: 24 })
  @ApiQuery({ name: 'activeOnly', required: false, type: Boolean, description: 'Filter active partners only' })
  @ApiResponse({
    status: 200,
    description: 'Brand partners retrieved successfully',
  })
  async listBrandPartners(
    @Query('page', new ParseIntPipe({ optional: true })) page?: number,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
    @Query('activeOnly') activeOnly?: string,
  ): Promise<PaginatedResultDto<BrandPartner>> {
    const activeFilter = activeOnly === 'true';
    return this.brandPartnerService.listBrandPartners(page, limit, activeFilter);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'catalog_manager')
  @ApiOperation({ summary: 'Update brand partner (Admin only)' })
  @ApiParam({ name: 'id', description: 'Brand partner UUID' })
  @ApiResponse({
    status: 200,
    description: 'Brand partner updated successfully',
    type: BrandPartner,
  })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @ApiResponse({ status: 404, description: 'Brand partner not found' })
  @ApiResponse({ status: 409, description: 'Brand partner with same name exists' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async updateBrandPartner(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateBrandPartnerDto,
  ): Promise<BrandPartner> {
    return this.brandPartnerService.updateBrandPartner(id, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete brand partner (Admin only)' })
  @ApiParam({ name: 'id', description: 'Brand partner UUID' })
  @ApiResponse({ status: 204, description: 'Brand partner deleted successfully' })
  @ApiResponse({ status: 404, description: 'Brand partner not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - admin only' })
  async deleteBrandPartner(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    await this.brandPartnerService.deleteBrandPartner(id);
  }

  @Get(':id/items')
  @ApiOperation({ summary: 'Get catalog items from a brand partner' })
  @ApiParam({ name: 'id', description: 'Brand partner UUID' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number', example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Items per page', example: 24 })
  @ApiResponse({
    status: 200,
    description: 'Brand catalog items retrieved successfully',
  })
  @ApiResponse({ status: 404, description: 'Brand partner not found' })
  async getBrandCatalogItems(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('page', new ParseIntPipe({ optional: true })) page?: number,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
  ): Promise<PaginatedResultDto<CatalogItem>> {
    return this.brandPartnerService.getBrandCatalogItems(id, page, limit);
  }
}

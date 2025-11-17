import {
  Injectable,
  NotFoundException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { IsNull } from 'typeorm';
import {
  CreateBrandPartnerDto,
  UpdateBrandPartnerDto,
  PaginatedResultDto,
  PartnershipType,
} from '../dto';
import { BrandPartner, CatalogItem } from '../entities';
import { BrandPartnerRepository, CatalogItemRepository } from '../repositories';

@Injectable()
export class BrandPartnerService {
  private readonly logger = new Logger(BrandPartnerService.name);
  // Simple in-memory cache
  private readonly cache = new Map<string, { data: any; expiry: number }>();

  constructor(
    private readonly brandPartnerRepository: BrandPartnerRepository,
    private readonly catalogItemRepository: CatalogItemRepository,
  ) {}

  /**
   * Create a new brand partner
   */
  async createBrandPartner(dto: CreateBrandPartnerDto): Promise<BrandPartner> {
    this.logger.log(`Creating brand partner: ${dto.name}`);

    // Check for duplicate name
    const existing = await this.brandPartnerRepository.findOne({
      where: { name: dto.name, deletedAt: IsNull() },
    });

    if (existing) {
      throw new ConflictException(`Brand partner with name "${dto.name}" already exists`);
    }

    const brandPartner = this.brandPartnerRepository.create(dto);
    const saved = await this.brandPartnerRepository.save(brandPartner);

    // Clear active partners cache
    this.deleteFromCache('brand-partners:active');

    this.logger.log(`Successfully created brand partner: ${saved.id}`);
    return saved;
  }

  /**
   * Get a brand partner by ID
   */
  async getBrandPartner(id: string): Promise<BrandPartner> {
    this.logger.debug(`Fetching brand partner: ${id}`);

    // Check cache
    const cached = this.getFromCache<BrandPartner>(`brand-partner:${id}`);
    if (cached) {
      this.logger.debug(`Cache hit for brand partner: ${id}`);
      return cached;
    }

    const partner = await this.brandPartnerRepository.findById(id);
    if (!partner) {
      throw new NotFoundException(`Brand partner with ID ${id} not found`);
    }

    // Cache result (1 hour TTL)
    this.setCache(`brand-partner:${id}`, partner, 3600);

    return partner;
  }

  /**
   * Update a brand partner
   */
  async updateBrandPartner(id: string, dto: UpdateBrandPartnerDto): Promise<BrandPartner> {
    this.logger.log(`Updating brand partner: ${id}`);

    // Get existing
    const existing = await this.brandPartnerRepository.findOne({
      where: { id, deletedAt: IsNull() },
    });

    if (!existing) {
      throw new NotFoundException(`Brand partner with ID ${id} not found`);
    }

    // Check for duplicate name if changing name
    if (dto.name && dto.name !== existing.name) {
      const duplicate = await this.brandPartnerRepository.findOne({
        where: { name: dto.name, deletedAt: IsNull() },
      });

      if (duplicate) {
        throw new ConflictException(`Brand partner with name "${dto.name}" already exists`);
      }
    }

    // Update
    const updated = await this.brandPartnerRepository.save({
      ...existing,
      ...dto,
      id, // Ensure ID doesn't change
      updatedAt: new Date(),
    });

    // Clear caches
    this.deleteFromCache(`brand-partner:${id}`);
    this.deleteFromCache('brand-partners:active');

    this.logger.log(`Successfully updated brand partner: ${id}`);
    return updated;
  }

  /**
   * Soft delete a brand partner
   */
  async deleteBrandPartner(id: string): Promise<void> {
    this.logger.log(`Deleting brand partner: ${id}`);

    // Verify exists
    const partner = await this.brandPartnerRepository.findOne({
      where: { id, deletedAt: IsNull() },
    });

    if (!partner) {
      throw new NotFoundException(`Brand partner with ID ${id} not found`);
    }

    // Soft delete
    await this.brandPartnerRepository.softDelete(id);

    // Clear caches
    this.deleteFromCache(`brand-partner:${id}`);
    this.deleteFromCache('brand-partners:active');

    this.logger.log(`Successfully deleted brand partner: ${id}`);
  }

  /**
   * List all brand partners with pagination
   */
  async listBrandPartners(
    page: number = 1,
    limit: number = 24,
    activeOnly: boolean = false,
  ): Promise<PaginatedResultDto<BrandPartner>> {
    this.logger.debug(`Listing brand partners (page: ${page}, limit: ${limit}, activeOnly: ${activeOnly})`);

    const whereClause: any = { deletedAt: IsNull() };
    if (activeOnly) {
      whereClause.isActive = true;
    }

    const [partners, total] = await this.brandPartnerRepository.findAndCount({
      where: whereClause,
      order: { name: 'ASC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return new PaginatedResultDto(partners, page, limit, total);
  }

  /**
   * Get active brand partners
   */
  async getActiveBrandPartners(): Promise<BrandPartner[]> {
    this.logger.debug('Fetching active brand partners');

    // Check cache
    const cached = this.getFromCache<BrandPartner[]>('brand-partners:active');
    if (cached) {
      this.logger.debug('Cache hit for active brand partners');
      return cached;
    }

    const partners = await this.brandPartnerRepository.findActive();

    // Cache for 1 hour
    this.setCache('brand-partners:active', partners, 3600);

    return partners;
  }

  /**
   * Get brand partner's catalog items
   */
  async getBrandCatalogItems(
    id: string,
    page: number = 1,
    limit: number = 24,
  ): Promise<PaginatedResultDto<CatalogItem>> {
    this.logger.debug(`Fetching catalog items for brand partner: ${id}`);

    // Verify brand partner exists
    await this.getBrandPartner(id);

    // Fetch catalog items
    const [items, total] = await this.catalogItemRepository.findAndCount({
      where: {
        brandPartnerId: id,
        isActive: true,
        deletedAt: IsNull(),
      },
      relations: ['brandPartner'],
      order: {
        popularityScore: 'DESC',
        createdAt: 'DESC',
      },
      skip: (page - 1) * limit,
      take: limit,
    });

    return new PaginatedResultDto(items, page, limit, total);
  }

  /**
   * Get brand partners by partnership type
   */
  async getBrandPartnersByType(type: PartnershipType): Promise<BrandPartner[]> {
    this.logger.debug(`Fetching brand partners of type: ${type}`);

    // Check cache
    const cacheKey = `brand-partners:type:${type}`;
    const cached = this.getFromCache<BrandPartner[]>(cacheKey);
    if (cached) {
      this.logger.debug(`Cache hit for brand partners type: ${type}`);
      return cached;
    }

    const partners = await this.brandPartnerRepository.findByPartnershipType(type);

    // Cache for 1 hour
    this.setCache(cacheKey, partners, 3600);

    return partners;
  }

  /**
   * Simple cache get
   */
  private getFromCache<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    if (Date.now() > entry.expiry) {
      this.cache.delete(key);
      return null;
    }

    return entry.data as T;
  }

  /**
   * Simple cache set
   */
  private setCache(key: string, data: any, ttlSeconds: number): void {
    this.cache.set(key, {
      data,
      expiry: Date.now() + ttlSeconds * 1000,
    });
  }

  /**
   * Simple cache delete
   */
  private deleteFromCache(key: string): void {
    this.cache.delete(key);
  }
}

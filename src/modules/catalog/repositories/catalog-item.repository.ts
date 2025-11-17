import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, Repository, IsNull } from 'typeorm';
import { CatalogItem } from '../entities/catalog-item.entity';

export interface CatalogFilters {
  type?: 'silhouette' | 'fabric' | 'pattern' | 'element';
  category?: string[];
  subcategory?: string[];
  tags?: string[];
  brandPartnerId?: string;
  isActive?: boolean;
  isFeatured?: boolean;
  requiredTier?: string;
}

@Injectable()
export class CatalogItemRepository extends Repository<CatalogItem> {
  constructor(
    @InjectDataSource() private dataSource: DataSource,
  ) {
    super(CatalogItem, dataSource.createEntityManager());
  }

  async findByIdWithRelations(id: string): Promise<CatalogItem | null> {
    return this.findOne({
      where: { id, deletedAt: IsNull() },
      relations: ['brandPartner'],
    });
  }

  async findAllPaginated(
    page: number = 1,
    limit: number = 24,
    filters?: CatalogFilters,
  ): Promise<{ items: CatalogItem[]; total: number }> {
    const queryBuilder = this.createQueryBuilder('item')
      .leftJoinAndSelect('item.brandPartner', 'brandPartner')
      .where('item.deletedAt IS NULL');

    if (filters?.type) {
      queryBuilder.andWhere('item.type = :type', { type: filters.type });
    }

    if (filters?.category && filters.category.length > 0) {
      queryBuilder.andWhere('item.category IN (:...categories)', {
        categories: filters.category,
      });
    }

    if (filters?.subcategory && filters.subcategory.length > 0) {
      queryBuilder.andWhere('item.subcategory IN (:...subcategories)', {
        subcategories: filters.subcategory,
      });
    }

    if (filters?.tags && filters.tags.length > 0) {
      queryBuilder.andWhere('item.tags && :tags', { tags: filters.tags });
    }

    if (filters?.brandPartnerId) {
      queryBuilder.andWhere('item.brandPartnerId = :brandPartnerId', {
        brandPartnerId: filters.brandPartnerId,
      });
    }

    if (filters?.isActive !== undefined) {
      queryBuilder.andWhere('item.isActive = :isActive', {
        isActive: filters.isActive,
      });
    }

    if (filters?.isFeatured !== undefined) {
      queryBuilder.andWhere('item.isFeatured = :isFeatured', {
        isFeatured: filters.isFeatured,
      });
    }

    if (filters?.requiredTier) {
      queryBuilder.andWhere('item.requiredTier = :requiredTier', {
        requiredTier: filters.requiredTier,
      });
    }

    const [items, total] = await queryBuilder
      .orderBy('item.popularityScore', 'DESC')
      .addOrderBy('item.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return { items, total };
  }

  async findByIds(ids: string[]): Promise<CatalogItem[]> {
    if (ids.length === 0) return [];

    return this.createQueryBuilder('item')
      .leftJoinAndSelect('item.brandPartner', 'brandPartner')
      .where('item.id IN (:...ids)', { ids })
      .andWhere('item.deletedAt IS NULL')
      .getMany();
  }

  async incrementViewCount(id: string): Promise<void> {
    await this.increment({ id }, 'viewCount', 1);
    await this.updatePopularityScore(id);
  }

  async incrementUseCount(id: string): Promise<void> {
    await this.increment({ id }, 'useCount', 1);
    await this.updatePopularityScore(id);
  }

  async incrementFavoriteCount(id: string): Promise<void> {
    await this.increment({ id }, 'favoriteCount', 1);
    await this.updatePopularityScore(id);
  }

  async decrementFavoriteCount(id: string): Promise<void> {
    await this.decrement({ id }, 'favoriteCount', 1);
    await this.updatePopularityScore(id);
  }

  async updatePopularityScore(id: string): Promise<void> {
    // Calculate popularity score based on views, uses, favorites
    // Formula: (views * 0.2 + uses * 0.5 + favorites * 0.3) / 100
    await this.dataSource.query(
      `
      UPDATE catalog.items
      SET popularity_score = (
        (view_count * 0.2) +
        (use_count * 0.5) +
        (favorite_count * 0.3)
      ) / 100
      WHERE id = $1
      `,
      [id],
    );
  }

  async findFeatured(limit: number = 10): Promise<CatalogItem[]> {
    return this.find({
      where: {
        isFeatured: true,
        isActive: true,
        deletedAt: IsNull(),
      },
      relations: ['brandPartner'],
      order: {
        popularityScore: 'DESC',
      },
      take: limit,
    });
  }

  async findByType(
    type: 'silhouette' | 'fabric' | 'pattern' | 'element',
    limit: number = 24,
  ): Promise<CatalogItem[]> {
    return this.find({
      where: {
        type,
        isActive: true,
        deletedAt: IsNull(),
      },
      relations: ['brandPartner'],
      order: {
        popularityScore: 'DESC',
      },
      take: limit,
    });
  }

  async search(query: string, limit: number = 24): Promise<CatalogItem[]> {
    // Basic PostgreSQL full-text search (fallback when Elasticsearch is not available)
    return this.createQueryBuilder('item')
      .leftJoinAndSelect('item.brandPartner', 'brandPartner')
      .where('item.deletedAt IS NULL')
      .andWhere('item.isActive = :isActive', { isActive: true })
      .andWhere(
        `to_tsvector('english', item.name || ' ' || COALESCE(item.description, '')) @@ plainto_tsquery('english', :query)`,
        { query },
      )
      .orderBy('item.popularityScore', 'DESC')
      .take(limit)
      .getMany();
  }
}

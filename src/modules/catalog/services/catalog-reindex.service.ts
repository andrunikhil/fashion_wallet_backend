import { Injectable, Logger } from '@nestjs/common';
import { ElasticsearchService } from './elasticsearch.service';
import { CatalogItemRepository } from '../repositories';

/**
 * Service for bulk re-indexing catalog items in Elasticsearch
 * Useful for initial setup, migrations, or index rebuilding
 */
@Injectable()
export class CatalogReindexService {
  private readonly logger = new Logger(CatalogReindexService.name);
  private isReindexing = false;

  constructor(
    private readonly elasticsearchService: ElasticsearchService,
    private readonly catalogItemRepository: CatalogItemRepository
  ) {}

  /**
   * Re-index all catalog items
   * @param batchSize Number of items to process in each batch (default: 100)
   * @returns Statistics about the re-indexing operation
   */
  async reindexAll(batchSize: number = 100): Promise<{
    success: number;
    failed: number;
    total: number;
    errors: any[];
  }> {
    if (this.isReindexing) {
      throw new Error('Re-indexing is already in progress');
    }

    this.isReindexing = true;
    this.logger.log('Starting full catalog re-indexing');

    const startTime = Date.now();
    let totalSuccess = 0;
    let totalFailed = 0;
    const allErrors: any[] = [];

    try {
      // Get total count
      const total = await this.catalogItemRepository.count({
        where: { isActive: true },
      });
      this.logger.log(`Found ${total} active catalog items to re-index`);

      // Process in batches
      const totalPages = Math.ceil(total / batchSize);

      for (let page = 1; page <= totalPages; page++) {
        this.logger.log(`Processing batch ${page}/${totalPages}`);

        // Fetch batch
        const { items } = await this.catalogItemRepository.findAllPaginated(
          page,
          batchSize,
          { isActive: true }
        );

        // Prepare documents
        const documents = items.map(item => ({
          id: item.id,
          document: {
            id: item.id,
            type: item.type,
            name: item.name,
            description: item.description,
            category: item.category,
            subcategory: item.subcategory,
            tags: item.tags || [],
            colors: item.properties?.colors || [],
            occasions: item.properties?.occasions || [],
            seasons: item.properties?.seasons || [],
            styles: item.properties?.styles || [],
            brand_partner: item.brandPartnerId || null,
            is_active: item.isActive,
            is_featured: item.isFeatured,
            popularity_score: item.popularityScore || 0,
            created_at: item.createdAt,
            updated_at: item.updatedAt,
            price_range: item.properties?.priceRange || null,
          },
        }));

        // Bulk index
        const result = await this.elasticsearchService.bulkIndex(documents);
        totalSuccess += result.success;
        totalFailed += result.failed;
        allErrors.push(...result.errors);

        this.logger.log(
          `Batch ${page}/${totalPages} completed: ${result.success} succeeded, ${result.failed} failed`
        );
      }

      // Refresh index to make changes searchable
      await this.elasticsearchService.refreshIndex();

      const duration = Date.now() - startTime;
      this.logger.log(
        `Re-indexing completed in ${duration}ms: ${totalSuccess} succeeded, ${totalFailed} failed`
      );

      return {
        success: totalSuccess,
        failed: totalFailed,
        total,
        errors: allErrors,
      };
    } catch (error) {
      this.logger.error(`Re-indexing failed: ${error.message}`, error.stack);
      throw error;
    } finally {
      this.isReindexing = false;
    }
  }

  /**
   * Re-index a specific catalog item type
   * @param type Catalog item type to re-index
   * @param batchSize Number of items to process in each batch
   */
  async reindexByType(
    type: 'silhouette' | 'fabric' | 'pattern' | 'element',
    batchSize: number = 100
  ): Promise<{
    success: number;
    failed: number;
    total: number;
    errors: any[];
  }> {
    if (this.isReindexing) {
      throw new Error('Re-indexing is already in progress');
    }

    this.isReindexing = true;
    this.logger.log(`Starting re-indexing for type: ${type}`);

    const startTime = Date.now();
    let totalSuccess = 0;
    let totalFailed = 0;
    const allErrors: any[] = [];

    try {
      // Get total count for type
      const total = await this.catalogItemRepository.count({
        where: { type, isActive: true },
      });
      this.logger.log(`Found ${total} active items of type ${type} to re-index`);

      // Process in batches
      const totalPages = Math.ceil(total / batchSize);

      for (let page = 1; page <= totalPages; page++) {
        this.logger.log(`Processing batch ${page}/${totalPages} for type ${type}`);

        // Fetch batch
        const { items } = await this.catalogItemRepository.findAllPaginated(
          page,
          batchSize,
          { type, isActive: true }
        );

        // Prepare documents
        const documents = items.map(item => ({
          id: item.id,
          document: {
            id: item.id,
            type: item.type,
            name: item.name,
            description: item.description,
            category: item.category,
            subcategory: item.subcategory,
            tags: item.tags || [],
            colors: item.properties?.colors || [],
            occasions: item.properties?.occasions || [],
            seasons: item.properties?.seasons || [],
            styles: item.properties?.styles || [],
            brand_partner: item.brandPartnerId || null,
            is_active: item.isActive,
            is_featured: item.isFeatured,
            popularity_score: item.popularityScore || 0,
            created_at: item.createdAt,
            updated_at: item.updatedAt,
            price_range: item.properties?.priceRange || null,
          },
        }));

        // Bulk index
        const result = await this.elasticsearchService.bulkIndex(documents);
        totalSuccess += result.success;
        totalFailed += result.failed;
        allErrors.push(...result.errors);

        this.logger.log(
          `Batch ${page}/${totalPages} completed: ${result.success} succeeded, ${result.failed} failed`
        );
      }

      // Refresh index
      await this.elasticsearchService.refreshIndex();

      const duration = Date.now() - startTime;
      this.logger.log(
        `Re-indexing for type ${type} completed in ${duration}ms: ${totalSuccess} succeeded, ${totalFailed} failed`
      );

      return {
        success: totalSuccess,
        failed: totalFailed,
        total,
        errors: allErrors,
      };
    } catch (error) {
      this.logger.error(`Re-indexing for type ${type} failed: ${error.message}`, error.stack);
      throw error;
    } finally {
      this.isReindexing = false;
    }
  }

  /**
   * Check if re-indexing is currently in progress
   */
  isInProgress(): boolean {
    return this.isReindexing;
  }

  /**
   * Clear and rebuild the entire search index
   * WARNING: This will delete all existing data in the index
   */
  async rebuildIndex(batchSize: number = 100): Promise<{
    success: number;
    failed: number;
    total: number;
    errors: any[];
  }> {
    this.logger.warn('Rebuilding index - this will delete all existing data');

    try {
      // Delete existing index
      await this.elasticsearchService.deleteIndex();
      this.logger.log('Deleted existing index');

      // Create new index
      await this.elasticsearchService.createIndex();
      this.logger.log('Created new index');

      // Re-index all items
      return await this.reindexAll(batchSize);
    } catch (error) {
      this.logger.error(`Index rebuild failed: ${error.message}`, error.stack);
      throw error;
    }
  }
}

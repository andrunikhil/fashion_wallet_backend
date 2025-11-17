import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Client } from '@elastic/elasticsearch';
import { catalogIndexMapping } from '../config/elasticsearch.config';

/**
 * Service for managing Elasticsearch operations
 * Handles index management and document operations
 */
@Injectable()
export class ElasticsearchService implements OnModuleInit {
  private readonly logger = new Logger(ElasticsearchService.name);
  private client: Client;
  private readonly indexName = 'catalog_items';

  constructor(private configService: ConfigService) {
    const esConfig = this.configService.get('elasticsearch');

    this.client = new Client({
      node: esConfig.node,
      auth: esConfig.auth.password ? {
        username: esConfig.auth.username,
        password: esConfig.auth.password,
      } : undefined,
      maxRetries: esConfig.maxRetries,
      requestTimeout: esConfig.requestTimeout,
      sniffOnStart: esConfig.sniffOnStart,
    });
  }

  async onModuleInit() {
    try {
      // Check if Elasticsearch is accessible
      const health = await this.client.cluster.health();
      this.logger.log(`Elasticsearch cluster health: ${health.status}`);

      // Ensure index exists
      await this.ensureIndexExists();
    } catch (error) {
      this.logger.warn(
        `Failed to connect to Elasticsearch: ${error.message}. Search functionality will be limited.`
      );
    }
  }

  /**
   * Ensure the catalog index exists, create if not
   */
  async ensureIndexExists(): Promise<void> {
    try {
      const exists = await this.client.indices.exists({
        index: this.indexName,
      });

      if (!exists) {
        await this.createIndex();
      }
    } catch (error) {
      this.logger.error(`Failed to check/create index: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Create the catalog index with predefined mappings
   */
  async createIndex(): Promise<void> {
    try {
      this.logger.log(`Creating index: ${this.indexName}`);

      await this.client.indices.create({
        index: this.indexName,
        body: catalogIndexMapping,
      });

      this.logger.log(`Successfully created index: ${this.indexName}`);
    } catch (error) {
      this.logger.error(`Failed to create index: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Delete the catalog index
   */
  async deleteIndex(): Promise<void> {
    try {
      const exists = await this.client.indices.exists({
        index: this.indexName,
      });

      if (exists) {
        await this.client.indices.delete({
          index: this.indexName,
        });
        this.logger.log(`Successfully deleted index: ${this.indexName}`);
      }
    } catch (error) {
      this.logger.error(`Failed to delete index: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Index a single document
   */
  async indexDocument(id: string, document: any): Promise<void> {
    try {
      await this.client.index({
        index: this.indexName,
        id,
        document,
        refresh: 'false', // Don't refresh immediately for better performance
      });

      this.logger.debug(`Successfully indexed document: ${id}`);
    } catch (error) {
      this.logger.error(`Failed to index document ${id}: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Update a document
   */
  async updateDocument(id: string, document: any): Promise<void> {
    try {
      await this.client.update({
        index: this.indexName,
        id,
        doc: document,
        refresh: 'false',
      });

      this.logger.debug(`Successfully updated document: ${id}`);
    } catch (error) {
      this.logger.error(`Failed to update document ${id}: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Delete a document
   */
  async deleteDocument(id: string): Promise<void> {
    try {
      await this.client.delete({
        index: this.indexName,
        id,
        refresh: 'false',
      });

      this.logger.debug(`Successfully deleted document: ${id}`);
    } catch (error) {
      // Don't throw if document doesn't exist
      if (error.meta?.statusCode === 404) {
        this.logger.debug(`Document not found in index: ${id}`);
        return;
      }
      this.logger.error(`Failed to delete document ${id}: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Bulk index documents
   */
  async bulkIndex(documents: Array<{ id: string; document: any }>): Promise<{
    success: number;
    failed: number;
    errors: any[];
  }> {
    try {
      const operations = documents.flatMap(({ id, document }) => [
        { index: { _index: this.indexName, _id: id } },
        document,
      ]);

      const bulkResponse = await this.client.bulk({
        operations,
        refresh: 'false',
      });

      const errors = [];
      let successCount = 0;
      let failedCount = 0;

      if (bulkResponse.items) {
        bulkResponse.items.forEach((item, index) => {
          const operation = item.index || item.update || item.delete;
          if (operation?.error) {
            errors.push({
              id: documents[index]?.id,
              error: operation.error,
            });
            failedCount++;
          } else {
            successCount++;
          }
        });
      }

      this.logger.log(
        `Bulk indexing completed: ${successCount} succeeded, ${failedCount} failed`
      );

      return {
        success: successCount,
        failed: failedCount,
        errors,
      };
    } catch (error) {
      this.logger.error(`Failed to bulk index documents: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Execute a search query
   */
  async search(query: any): Promise<any> {
    try {
      const response = await this.client.search({
        index: this.indexName,
        ...query,
      });

      return response;
    } catch (error) {
      this.logger.error(`Search failed: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Get suggestions for autocomplete
   */
  async suggest(prefix: string, size: number = 10): Promise<string[]> {
    try {
      const response = await this.client.search({
        index: this.indexName,
        body: {
          suggest: {
            catalog_suggestions: {
              prefix,
              completion: {
                field: 'name.suggest',
                size,
                skip_duplicates: true,
              },
            },
          },
        },
      });

      const suggestions = response.suggest?.catalog_suggestions?.[0]?.options || [];
      return suggestions.map((option: any) => option.text);
    } catch (error) {
      this.logger.error(`Suggest failed: ${error.message}`, error.stack);
      return [];
    }
  }

  /**
   * Refresh the index to make recent changes searchable
   */
  async refreshIndex(): Promise<void> {
    try {
      await this.client.indices.refresh({
        index: this.indexName,
      });
      this.logger.debug(`Refreshed index: ${this.indexName}`);
    } catch (error) {
      this.logger.error(`Failed to refresh index: ${error.message}`, error.stack);
    }
  }

  /**
   * Get index statistics
   */
  async getIndexStats(): Promise<any> {
    try {
      const stats = await this.client.indices.stats({
        index: this.indexName,
      });
      return stats;
    } catch (error) {
      this.logger.error(`Failed to get index stats: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Check if Elasticsearch is healthy
   */
  async healthCheck(): Promise<boolean> {
    try {
      const health = await this.client.cluster.health();
      return health.status === 'green' || health.status === 'yellow';
    } catch (error) {
      this.logger.error(`Health check failed: ${error.message}`);
      return false;
    }
  }

  /**
   * Get the Elasticsearch client (for advanced queries)
   */
  getClient(): Client {
    return this.client;
  }
}

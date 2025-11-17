import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule } from '@nestjs/config';

// Entities
import {
  CatalogItem,
  BrandPartner,
  Collection,
  CollectionItem,
  UserFavorite,
  ItemAnalytics,
  Silhouette,
  Fabric,
  Pattern,
  Element,
} from './entities';

// Schemas
import { CatalogFlexible, CatalogFlexibleSchema } from './schemas';

// Repositories
import {
  CatalogItemRepository,
  BrandPartnerRepository,
  CollectionRepository,
  CollectionItemRepository,
  UserFavoriteRepository,
  CatalogFlexibleRepository,
} from './repositories';

// Controllers
import { CatalogController } from './controllers/catalog.controller';
import { CollectionController } from './controllers/collection.controller';
import { BrandPartnerController } from './controllers/brand-partner.controller';
import { SearchController } from './controllers/search.controller';

// Services
import { CatalogService } from './services/catalog.service';
import { CatalogManagementService } from './services/catalog-management.service';
import { CollectionService } from './services/collection.service';
import { BrandPartnerService } from './services/brand-partner.service';
import { ElasticsearchService } from './services/elasticsearch.service';
import { CatalogSearchService } from './services/catalog-search.service';
import { CatalogReindexService } from './services/catalog-reindex.service';

// Configurations
import {
  catalogConfig,
  elasticsearchConfig,
  pineconeConfig,
  redisConfig,
  cacheConfig,
} from './config';

@Module({
  imports: [
    ConfigModule.forFeature(catalogConfig),
    ConfigModule.forFeature(elasticsearchConfig),
    ConfigModule.forFeature(pineconeConfig),
    ConfigModule.forFeature(redisConfig),
    ConfigModule.forFeature(cacheConfig),
    TypeOrmModule.forFeature([
      CatalogItem,
      BrandPartner,
      Collection,
      CollectionItem,
      UserFavorite,
      ItemAnalytics,
      Silhouette,
      Fabric,
      Pattern,
      Element,
    ]),
    MongooseModule.forFeature([
      { name: CatalogFlexible.name, schema: CatalogFlexibleSchema },
    ]),
  ],
  controllers: [
    CatalogController,
    CollectionController,
    BrandPartnerController,
    SearchController,
  ],
  providers: [
    CatalogService,
    CatalogManagementService,
    CollectionService,
    BrandPartnerService,
    ElasticsearchService,
    CatalogSearchService,
    CatalogReindexService,
    CatalogItemRepository,
    BrandPartnerRepository,
    CollectionRepository,
    CollectionItemRepository,
    UserFavoriteRepository,
    CatalogFlexibleRepository,
  ],
  exports: [
    CatalogService,
    CatalogManagementService,
    CollectionService,
    BrandPartnerService,
    ElasticsearchService,
    CatalogSearchService,
    CatalogReindexService,
    CatalogItemRepository,
    BrandPartnerRepository,
    CollectionRepository,
    CollectionItemRepository,
    UserFavoriteRepository,
    CatalogFlexibleRepository,
  ],
})
export class CatalogModule {}

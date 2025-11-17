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
import { RecommendationController } from './controllers/recommendation.controller';

// Services
import { CatalogService } from './services/catalog.service';
import { CatalogManagementService } from './services/catalog-management.service';
import { CollectionService } from './services/collection.service';
import { BrandPartnerService } from './services/brand-partner.service';
import { ElasticsearchService } from './services/elasticsearch.service';
import { CatalogSearchService } from './services/catalog-search.service';
import { CatalogReindexService } from './services/catalog-reindex.service';
import { RecommendationService } from './services/recommendation.service';
import { UserInteractionService } from './services/user-interaction.service';

// Gateways
import { CatalogGateway } from './gateways/catalog.gateway';

// Resolvers
import { CatalogResolver } from './resolvers/catalog.resolver';
import { SearchResolver } from './resolvers/search.resolver';
import { RecommendationResolver } from './resolvers/recommendation.resolver';

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
    RecommendationController,
  ],
  providers: [
    // Services
    CatalogService,
    CatalogManagementService,
    CollectionService,
    BrandPartnerService,
    ElasticsearchService,
    CatalogSearchService,
    CatalogReindexService,
    RecommendationService,
    UserInteractionService,
    // Repositories
    CatalogItemRepository,
    BrandPartnerRepository,
    CollectionRepository,
    CollectionItemRepository,
    UserFavoriteRepository,
    CatalogFlexibleRepository,
    // Gateways
    CatalogGateway,
    // Resolvers
    CatalogResolver,
    SearchResolver,
    RecommendationResolver,
  ],
  exports: [
    CatalogService,
    CatalogManagementService,
    CollectionService,
    BrandPartnerService,
    ElasticsearchService,
    CatalogSearchService,
    CatalogReindexService,
    RecommendationService,
    UserInteractionService,
    CatalogItemRepository,
    BrandPartnerRepository,
    CollectionRepository,
    CollectionItemRepository,
    UserFavoriteRepository,
    CatalogFlexibleRepository,
    CatalogGateway,
  ],
})
export class CatalogModule {}

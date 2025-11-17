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

// Services
import { CatalogService } from './services/catalog.service';

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
  controllers: [CatalogController],
  providers: [
    CatalogService,
    CatalogItemRepository,
    BrandPartnerRepository,
    CollectionRepository,
    CollectionItemRepository,
    UserFavoriteRepository,
    CatalogFlexibleRepository,
  ],
  exports: [
    CatalogService,
    CatalogItemRepository,
    BrandPartnerRepository,
    CollectionRepository,
    CollectionItemRepository,
    UserFavoriteRepository,
    CatalogFlexibleRepository,
  ],
})
export class CatalogModule {}

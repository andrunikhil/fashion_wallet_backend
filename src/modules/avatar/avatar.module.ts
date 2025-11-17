import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MongooseModule } from '@nestjs/mongoose';
import { HttpModule } from '@nestjs/axios';
import { CacheModule } from '@nestjs/cache-manager';
import { EventEmitterModule } from '@nestjs/event-emitter';

// Queue Module
import { QueueModule } from '../queue/queue.module';

// Controllers
import { AvatarController } from './controllers/avatar.controller';
import { AvatarModelController } from './controllers/avatar-model.controller';
import { HealthController } from './controllers/health.controller';

// Services
import { AvatarService } from './services/avatar.service';
import { StorageService } from './services/storage.service';
import { PhotoValidationService } from './services/photo-validation.service';
import { MLService } from './services/ml/ml.service';
import { MockMLService } from './services/ml/mock-ml.service';
import { ModelGenerationService } from './services/model/model-generation.service';
import { ModelOptimizationService } from './services/model/model-optimization.service';
import { ModelExportService } from './services/model/model-export.service';
import { CacheService } from './services/cache.service';
import { RateLimitService } from './services/rate-limit.service';
import { MetricsService } from './services/metrics.service';

// Repositories
import { AvatarRepository } from './repositories/avatar.repository';
import { MeasurementRepository } from './repositories/measurement.repository';
import { PhotoRepository } from './repositories/photo.repository';
import { ProcessingJobRepository } from './repositories/processing-job.repository';
import { AvatarModelRepository } from './repositories/avatar-model.repository';

// Processors
import { AvatarProcessingProcessor } from './processors/avatar-processing.processor';

// Gateways
import { AvatarGateway } from './gateways/avatar.gateway';

// Subscribers
import { AvatarEventSubscriber } from './subscribers/avatar-event.subscriber';

// Entities
import { Avatar } from '../../infrastructure/database/entities/avatar.entity';
import { Photo } from '../../infrastructure/database/entities/photo.entity';
import { Measurement } from '../../infrastructure/database/entities/measurement.entity';
import { ProcessingJob } from '../../infrastructure/database/entities/processing-job.entity';

// Schemas
import { AvatarModel, AvatarModelSchema } from './schemas/avatar-model.schema';

@Module({
  imports: [
    ConfigModule,
    HttpModule.register({
      timeout: 30000,
      maxRedirects: 5,
    }),
    QueueModule,
    EventEmitterModule.forRoot(),
    CacheModule.register({
      ttl: 3600, // 1 hour default TTL
      max: 1000, // max items in cache
    }),
    TypeOrmModule.forFeature([Avatar, Photo, Measurement, ProcessingJob]),
    MongooseModule.forFeature([{ name: AvatarModel.name, schema: AvatarModelSchema }]),
  ],
  controllers: [
    AvatarController,
    AvatarModelController,
    HealthController,
  ],
  providers: [
    // Core Services
    AvatarService,
    StorageService,
    PhotoValidationService,

    // ML Services
    {
      provide: MLService,
      useFactory: (configService) => {
        const useMock = configService.get('USE_MOCK_ML', 'true') === 'true';
        return useMock ? new MockMLService() : undefined;
      },
      inject: [ConfigModule],
    },
    {
      provide: 'ML_SERVICE',
      useClass: process.env.USE_MOCK_ML === 'false' ? MLService : MockMLService,
    },
    MockMLService,

    // Model Services
    ModelGenerationService,
    ModelOptimizationService,
    ModelExportService,

    // Advanced Services
    CacheService,
    RateLimitService,
    MetricsService,

    // Repositories
    AvatarRepository,
    MeasurementRepository,
    PhotoRepository,
    ProcessingJobRepository,
    AvatarModelRepository,

    // Processors
    AvatarProcessingProcessor,

    // Gateways
    AvatarGateway,

    // Subscribers
    AvatarEventSubscriber,
  ],
  exports: [
    AvatarService,
    StorageService,
    ModelGenerationService,
    ModelExportService,
    CacheService,
    MetricsService,
  ],
})
export class AvatarModule {}

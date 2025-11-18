import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MongooseModule } from '@nestjs/mongoose';
import { BullModule } from '@nestjs/bull';
import Redis from 'ioredis';

// Entities
import { Design } from './entities/design.entity';
import { Layer } from './entities/layer.entity';
import { CanvasSettings } from './entities/canvas-settings.entity';
import { Version } from './entities/version.entity';
import { History } from './entities/history.entity';
import { Collaborator } from './entities/collaborator.entity';
import { Export } from './entities/export.entity';

// Schemas
import {
  DesignSnapshot,
  DesignSnapshotSchema,
} from '../../infrastructure/database/schemas/design-snapshot.schema';
import {
  DesignAutosave,
  DesignAutosaveSchema,
} from '../../infrastructure/database/schemas/design-autosave.schema';
import {
  RenderCache,
  RenderCacheSchema,
} from '../../infrastructure/database/schemas/render-cache.schema';

// Repositories
import { DesignRepository } from './repositories/design.repository';
import { LayerRepository } from './repositories/layer.repository';
import { VersionRepository } from './repositories/version.repository';
import { ExportRepository } from './repositories/export.repository';
import { CanvasSettingsRepository } from './repositories/canvas-settings.repository';
import { SnapshotRepository } from './repositories/snapshot.repository';
import { CollaboratorRepository } from './repositories/collaborator.repository';

// Services
import { DesignService } from './services/design.service';
import { LayerService } from './services/layer.service';
import { VersionControlService } from './services/version-control.service';
import { AutoSaveService } from './services/auto-save.service';
import { ExportService } from './services/export.service';
import { DesignCacheService } from './services/cache.service';
import { CollaborationService } from './services/collaboration.service';
import { RenderingService } from './services/rendering.service';
import { TierLimitsService } from './services/tier-limits.service';

// Controllers
import { DesignController } from './controllers/design.controller';
import { LayerController } from './controllers/layer.controller';
import { ExportController } from './controllers/export.controller';
import { VersionController } from './controllers/version.controller';
import { CanvasSettingsController } from './controllers/canvas-settings.controller';
import { RenderingController } from './controllers/rendering.controller';

// Gateways
import { DesignGateway } from './gateways/design.gateway';

// Workers
import { RenderWorker } from './workers/render.worker';
import { ExportWorker } from './workers/export.worker';

@Module({
  imports: [
    // PostgreSQL entities
    TypeOrmModule.forFeature([
      Design,
      Layer,
      CanvasSettings,
      Version,
      History,
      Collaborator,
      Export,
    ]),

    // MongoDB schemas
    MongooseModule.forFeature([
      { name: DesignSnapshot.name, schema: DesignSnapshotSchema },
      { name: DesignAutosave.name, schema: DesignAutosaveSchema },
      { name: RenderCache.name, schema: RenderCacheSchema },
    ]),

    // Bull Queues
    BullModule.registerQueue({
      name: 'render',
    }),
    BullModule.registerQueue({
      name: 'export',
    }),
  ],

  controllers: [
    DesignController,
    LayerController,
    ExportController,
    VersionController,
    CanvasSettingsController,
    RenderingController,
  ],

  providers: [
    // Services
    DesignService,
    LayerService,
    VersionControlService,
    AutoSaveService,
    ExportService,
    DesignCacheService,
    CollaborationService,
    RenderingService,
    TierLimitsService,

    // Gateways
    DesignGateway,

    // Workers
    RenderWorker,
    ExportWorker,

    // Repositories
    DesignRepository,
    LayerRepository,
    VersionRepository,
    ExportRepository,
    CanvasSettingsRepository,
    SnapshotRepository,
    CollaboratorRepository,

    // Redis client
    {
      provide: 'REDIS_CLIENT',
      useFactory: () => {
        // TODO: Load from environment variables
        const redis = new Redis({
          host: process.env.REDIS_HOST || 'localhost',
          port: parseInt(process.env.REDIS_PORT || '6379', 10),
          password: process.env.REDIS_PASSWORD,
          db: parseInt(process.env.REDIS_DB || '0', 10),
          retryStrategy: (times) => {
            const delay = Math.min(times * 50, 2000);
            return delay;
          },
        });

        redis.on('error', (err) => {
          console.error('Redis connection error:', err);
        });

        redis.on('connect', () => {
          console.log('Redis connected successfully');
        });

        return redis;
      },
    },
  ],

  exports: [
    DesignService,
    LayerService,
    VersionControlService,
    AutoSaveService,
    ExportService,
  ],
})
export class DesignModule {}

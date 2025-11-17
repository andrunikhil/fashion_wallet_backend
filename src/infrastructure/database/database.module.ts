import { Global, Module, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule } from '@nestjs/config';
import { getPostgresConfig } from './postgres/postgres.config';
import { getMongoConfig } from './mongodb/mongodb.config';
import { PostgresService } from './postgres/postgres.service';
import { MongoDbService } from './mongodb/mongodb.service';
import { DatabaseHealthService } from './health/database-health.service';
import { DatabaseHealthController } from './health/database-health.controller';
import { ConnectionPoolMonitorService } from './monitoring/connection-pool-monitor.service';
import { DatabaseMetricsService } from './monitoring/database-metrics.service';
import { MetricsController } from './monitoring/metrics.controller';
import { AuditLoggerService } from './monitoring/audit-logger.service';
import { DatabaseSeederService } from './testing/database-seeder.service';
import { User } from './entities/user.entity';
import { Avatar } from './entities/avatar.entity';
import { CatalogItem } from './entities/catalog-item.entity';
import { AuditLog } from './entities/audit-log.entity';
import { Design, DesignSchema } from './schemas/design.schema';

@Global()
@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: () => getPostgresConfig(),
    }),
    TypeOrmModule.forFeature([User, Avatar, CatalogItem, AuditLog]),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: () => getMongoConfig(),
    }),
    MongooseModule.forFeature([
      { name: Design.name, schema: DesignSchema },
    ]),
  ],
  controllers: [DatabaseHealthController, MetricsController],
  providers: [
    PostgresService,
    MongoDbService,
    DatabaseHealthService,
    ConnectionPoolMonitorService,
    DatabaseMetricsService,
    AuditLoggerService,
    DatabaseSeederService,
  ],
  exports: [
    TypeOrmModule,
    MongooseModule,
    PostgresService,
    MongoDbService,
    DatabaseHealthService,
    ConnectionPoolMonitorService,
    DatabaseMetricsService,
    AuditLoggerService,
    DatabaseSeederService,
  ],
})
export class DatabaseModule implements OnModuleInit, OnModuleDestroy {
  constructor(
    private readonly postgresService: PostgresService,
    private readonly mongoService: MongoDbService,
    private readonly healthService: DatabaseHealthService,
  ) {}

  async onModuleInit() {
    // Initialize PostgreSQL schemas
    await this.postgresService.initializeSchemas();

    // Verify database health on startup
    const health = await this.healthService.checkHealth();

    if (health.status === 'unhealthy') {
      console.warn('⚠️  Database health check failed during initialization:', health);
    } else {
      console.log('✅ Database connections established successfully');
    }
  }

  async onModuleDestroy() {
    console.log('🔌 Closing database connections...');
    await Promise.all([
      this.postgresService.closeConnections(),
      this.mongoService.closeConnections(),
    ]);
    console.log('✅ Database connections closed');
  }
}

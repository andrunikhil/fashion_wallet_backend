# Database Infrastructure Implementation Plan

## Document Overview

**Version**: 1.0
**Last Updated**: November 2025
**Document Type**: Implementation Plan
**Status**: Draft
**Plan ID**: plan-infra-00
**Related Architecture**: arch-infra-00
**Related Spec**: spec-infra-00

---

## 1. Executive Summary

This implementation plan details the step-by-step approach to building the database infrastructure layer for Fashion Wallet. The plan covers PostgreSQL and MongoDB setup, connection management, migration systems, repository patterns, and all supporting infrastructure needed for a production-ready multi-database architecture.

**Total Timeline**: 6-8 weeks
**Team Size**: 2-3 developers + 1 DevOps engineer
**Priority**: Critical Path (blocks all service development)

---

## 2. Implementation Overview

```
Week 1-2: Foundation & Local Development
├── Project structure setup
├── Local database environments
├── Basic connection management
└── Development tooling

Week 3-4: Core Infrastructure
├── TypeORM & Mongoose integration
├── Repository pattern implementation
├── Migration system setup
└── Health checks

Week 5-6: Production Readiness
├── Connection pooling optimization
├── Read/write splitting
├── Monitoring & metrics
└── Security hardening

Week 7-8: Testing & Deployment
├── Load testing
├── Disaster recovery setup
├── Documentation
└── Production deployment
```

---

## 3. Phase 1: Foundation & Local Development (Week 1-2)

### 3.1 Week 1: Project Structure & PostgreSQL Setup

#### Day 1-2: Project Initialization
**Tasks**:
- [ ] Create database module directory structure
  ```
  src/infrastructure/database/
  ├── database.module.ts
  ├── postgres/
  ├── mongodb/
  ├── migrations/
  ├── entities/
  ├── schemas/
  └── interfaces/
  ```
- [ ] Install core dependencies:
  ```bash
  npm install typeorm pg mongoose @nestjs/typeorm @nestjs/mongoose
  npm install -D @types/pg @types/node
  ```
- [ ] Create Docker Compose for local databases
- [ ] Set up environment variable schema
- [ ] Create initial configuration files

**Deliverables**:
- Project structure created
- Dependencies installed
- Docker Compose running PostgreSQL and MongoDB locally
- Environment variables documented

**Team**: Backend Developer (1)
**Estimated Time**: 2 days

#### Day 3-5: PostgreSQL Service Implementation
**Tasks**:
- [ ] Implement `postgres.config.ts` with configuration management
- [ ] Create `postgres.service.ts` with connection logic
- [ ] Set up TypeORM DataSource configuration
- [ ] Implement PostgreSQL extensions setup (uuid-ossp, pgcrypto, pg_trgm)
- [ ] Create schema initialization (shared, avatar, catalog, design, audit)
- [ ] Implement basic health check endpoint
- [ ] Write unit tests for configuration and service

**Code Example**:
```typescript
// postgres.config.ts
export const getPostgresConfig = (): TypeOrmModuleOptions => ({
  type: 'postgres',
  host: process.env.POSTGRES_HOST || 'localhost',
  port: parseInt(process.env.POSTGRES_PORT || '5432'),
  username: process.env.POSTGRES_USER,
  password: process.env.POSTGRES_PASSWORD,
  database: process.env.POSTGRES_DB,
  synchronize: false, // Always use migrations
  logging: process.env.NODE_ENV === 'development',
  entities: ['dist/**/*.entity{.ts,.js}'],
  migrations: ['dist/migrations/postgres/*{.ts,.js}'],
});

// postgres.service.ts
@Injectable()
export class PostgresService {
  constructor(
    @InjectDataSource() private dataSource: DataSource,
  ) {}

  async checkHealth(): Promise<boolean> {
    try {
      await this.dataSource.query('SELECT 1');
      return true;
    } catch (error) {
      return false;
    }
  }
}
```

**Deliverables**:
- PostgreSQL service functional
- Can connect to local PostgreSQL
- Schemas created automatically
- Health check working

**Team**: Backend Developer (1)
**Estimated Time**: 3 days

**Acceptance Criteria**:
- [x] Connection to PostgreSQL successful
- [x] All required schemas created (shared, avatar, catalog, design, audit)
- [x] PostgreSQL extensions installed
- [x] Health check returns true when DB is up
- [x] Unit test coverage > 80%

### 3.2 Week 2: MongoDB Setup & Repository Pattern

#### Day 1-3: MongoDB Service Implementation
**Tasks**:
- [ ] Implement `mongodb.config.ts` with Mongoose configuration
- [ ] Create `mongodb.service.ts` with connection logic
- [ ] Set up Mongoose connection with retry logic
- [ ] Implement MongoDB health check
- [ ] Configure connection pooling
- [ ] Set up index management
- [ ] Write unit tests

**Code Example**:
```typescript
// mongodb.config.ts
export const getMongoConfig = (): MongooseModuleOptions => ({
  uri: process.env.MONGODB_URI,
  useNewUrlParser: true,
  useUnifiedTopology: true,
  maxPoolSize: 100,
  minPoolSize: 10,
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
  family: 4,
  retryWrites: true,
  retryReads: true,
});

// mongodb.service.ts
@Injectable()
export class MongoDbService {
  constructor(@InjectConnection() private connection: Connection) {}

  async checkHealth(): Promise<boolean> {
    return this.connection.readyState === 1;
  }
}
```

**Deliverables**:
- MongoDB service functional
- Connection to local MongoDB working
- Health check implemented
- Connection pooling configured

**Team**: Backend Developer (1)
**Estimated Time**: 3 days

**Acceptance Criteria**:
- [x] Connection to MongoDB successful
- [x] Connection pool configured properly
- [x] Health check returns connection state
- [x] Handles connection failures gracefully
- [x] Unit test coverage > 80%

#### Day 4-5: Base Repository Pattern
**Tasks**:
- [ ] Create repository interface definitions
- [ ] Implement `BaseRepository<T>` abstract class
- [ ] Implement `PostgresRepository<T>` with TypeORM
- [ ] Implement `MongoRepository<T>` with Mongoose
- [ ] Add transaction support for both databases
- [ ] Create query builder utilities
- [ ] Write comprehensive tests

**Code Example**:
```typescript
// interfaces/repository.interface.ts
export interface IBaseRepository<T> {
  findById(id: string): Promise<T | null>;
  findAll(options?: FindOptions): Promise<T[]>;
  create(data: Partial<T>): Promise<T>;
  update(id: string, data: Partial<T>): Promise<T>;
  delete(id: string): Promise<boolean>;
}

// repositories/base.repository.ts
export abstract class BaseRepository<T> implements IBaseRepository<T> {
  abstract findById(id: string): Promise<T | null>;
  abstract findAll(options?: FindOptions): Promise<T[]>;
  abstract create(data: Partial<T>): Promise<T>;
  abstract update(id: string, data: Partial<T>): Promise<T>;
  abstract delete(id: string): Promise<boolean>;
}

// repositories/postgres.repository.ts
export class PostgresRepository<T> extends BaseRepository<T> {
  constructor(private readonly repository: Repository<T>) {
    super();
  }

  async findById(id: string): Promise<T | null> {
    return this.repository.findOne({ where: { id } as any });
  }

  async transaction<R>(
    work: (entityManager: EntityManager) => Promise<R>
  ): Promise<R> {
    return this.repository.manager.transaction(work);
  }
}
```

**Deliverables**:
- Repository pattern fully implemented
- Works with both PostgreSQL and MongoDB
- Transaction support available
- Comprehensive test suite

**Team**: Backend Developer (1)
**Estimated Time**: 2 days

**Acceptance Criteria**:
- [x] All CRUD operations work for both databases
- [x] Transactions work correctly
- [x] Rollback works on errors
- [x] Query builder functional
- [x] Test coverage > 85%

---

## 4. Phase 2: Core Infrastructure (Week 3-4)

### 4.1 Week 3: Migration System & Entities

#### Day 1-2: Migration Infrastructure
**Tasks**:
- [ ] Set up TypeORM migration configuration
- [ ] Create migration templates
- [ ] Implement migration naming convention
- [ ] Set up MongoDB migration system (custom)
- [ ] Create migration runner scripts
- [ ] Add migration rollback support
- [ ] Document migration workflow

**Migration Template**:
```typescript
// migrations/postgres/1699876543000-CreateUsersTable.ts
import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateUsersTable1699876543000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Safety check
    const tableExists = await queryRunner.hasTable('shared.users');
    if (tableExists) {
      throw new Error('Table shared.users already exists');
    }

    // Create table
    await queryRunner.query(`
      CREATE TABLE shared.users (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        first_name VARCHAR(100) NOT NULL,
        last_name VARCHAR(100) NOT NULL,
        role VARCHAR(50) NOT NULL DEFAULT 'user',
        created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
        deleted_at TIMESTAMPTZ NULL,
        created_by UUID,
        updated_by UUID
      )
    `);

    // Create indexes
    await queryRunner.query(`
      CREATE INDEX CONCURRENTLY idx_users_email
      ON shared.users(email)
      WHERE deleted_at IS NULL
    `);

    // Add foreign key
    await queryRunner.query(`
      ALTER TABLE shared.users
      ADD CONSTRAINT fk_users_created_by
      FOREIGN KEY (created_by) REFERENCES shared.users(id)
    `);

    // Add comment
    await queryRunner.query(`
      COMMENT ON TABLE shared.users IS 'Core user accounts'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS shared.users CASCADE');
  }
}
```

**Scripts**:
```json
{
  "scripts": {
    "migration:generate": "typeorm migration:generate -d src/infrastructure/database/postgres/data-source.ts",
    "migration:create": "typeorm migration:create",
    "migration:run": "typeorm migration:run -d src/infrastructure/database/postgres/data-source.ts",
    "migration:revert": "typeorm migration:revert -d src/infrastructure/database/postgres/data-source.ts",
    "migration:show": "typeorm migration:show -d src/infrastructure/database/postgres/data-source.ts"
  }
}
```

**Deliverables**:
- Migration system operational
- Templates created
- Scripts working
- Documentation complete

**Team**: Backend Developer (1)
**Estimated Time**: 2 days

**Acceptance Criteria**:
- [x] Can generate new migrations
- [x] Can run migrations forward and backward
- [x] Migration history tracked
- [x] Safety checks prevent destructive operations
- [x] Both PostgreSQL and MongoDB supported

#### Day 3-5: Initial Schema & Entities
**Tasks**:
- [ ] Create User entity (shared schema)
- [ ] Create Avatar entity
- [ ] Create Catalog entities (Silhouette, Fabric, Pattern)
- [ ] Create Design schema (MongoDB)
- [ ] Create Mongoose schemas
- [ ] Add entity validation decorators
- [ ] Create initial migrations for all tables
- [ ] Run migrations on local environment
- [ ] Verify all tables created correctly

**Example Entity**:
```typescript
// entities/user.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, DeleteDateColumn } from 'typeorm';
import { IsEmail, MinLength, MaxLength } from 'class-validator';

@Entity({ schema: 'shared', name: 'users' })
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true, length: 255 })
  @IsEmail()
  email: string;

  @Column({ name: 'password_hash', length: 255 })
  @MinLength(60)
  @MaxLength(60)
  passwordHash: string;

  @Column({ name: 'first_name', length: 100 })
  @MinLength(1)
  @MaxLength(100)
  firstName: string;

  @Column({ name: 'last_name', length: 100 })
  @MinLength(1)
  @MaxLength(100)
  lastName: string;

  @Column({ length: 50, default: 'user' })
  role: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted_at' })
  deletedAt: Date | null;
}

// schemas/design.schema.ts
import { Schema, Prop, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true })
export class Design extends Document {
  @Prop({ required: true, index: true })
  userId: string;

  @Prop({ required: true, minlength: 1, maxlength: 255 })
  name: string;

  @Prop({
    required: true,
    enum: ['draft', 'published', 'archived'],
    default: 'draft',
    index: true
  })
  status: string;

  @Prop({ type: [Object], default: [] })
  layers: any[];

  @Prop({ type: Object })
  metadata: {
    tags?: string[];
    description?: string;
    thumbnailUrl?: string;
  };

  @Prop()
  avatarId?: string;

  @Prop({ type: [String] })
  catalogItemIds: string[];

  @Prop({ default: 1 })
  version: number;

  @Prop({ type: Date })
  deletedAt?: Date;
}

export const DesignSchema = SchemaFactory.createForClass(Design);

// Indexes
DesignSchema.index({ userId: 1, status: 1, createdAt: -1 });
DesignSchema.index({ 'metadata.tags': 1 });
DesignSchema.index({ deletedAt: 1 }, { sparse: true });
```

**Deliverables**:
- All core entities created
- Migrations generated and tested
- Database schema matches architecture spec
- Validation working

**Team**: Backend Developer (2)
**Estimated Time**: 3 days

**Acceptance Criteria**:
- [x] User entity complete with validation
- [x] Avatar, Catalog entities created
- [x] Design MongoDB schema created
- [x] All indexes created
- [x] Foreign keys properly set up
- [x] Migrations run successfully

### 4.2 Week 4: Health Checks & Monitoring

#### Day 1-2: Comprehensive Health Checks
**Tasks**:
- [ ] Implement database health check service
- [ ] Add connection pool metrics
- [ ] Add query performance monitoring
- [ ] Create health check endpoints
- [ ] Implement graceful degradation
- [ ] Add circuit breaker pattern
- [ ] Write tests for health checks

**Implementation**:
```typescript
// database.health.ts
@Injectable()
export class DatabaseHealthService {
  constructor(
    private postgresService: PostgresService,
    private mongoService: MongoDbService,
  ) {}

  @HealthCheck()
  async checkHealth(): Promise<HealthCheckResult> {
    const [pgHealth, mongoHealth] = await Promise.allSettled([
      this.checkPostgresHealth(),
      this.checkMongoHealth(),
    ]);

    const isHealthy =
      pgHealth.status === 'fulfilled' && pgHealth.value.healthy &&
      mongoHealth.status === 'fulfilled' && mongoHealth.value.healthy;

    return {
      status: isHealthy ? 'healthy' : 'unhealthy',
      timestamp: new Date(),
      checks: {
        postgres: pgHealth.status === 'fulfilled' ? pgHealth.value : { healthy: false, error: pgHealth.reason },
        mongodb: mongoHealth.status === 'fulfilled' ? mongoHealth.value : { healthy: false, error: mongoHealth.reason },
      },
    };
  }

  private async checkPostgresHealth(): Promise<ComponentHealth> {
    const startTime = Date.now();
    try {
      await this.postgresService.query('SELECT 1');
      const connections = await this.getConnectionPoolStats();

      return {
        healthy: true,
        responseTime: Date.now() - startTime,
        connections: connections,
      };
    } catch (error) {
      return {
        healthy: false,
        error: error.message,
        responseTime: Date.now() - startTime,
      };
    }
  }

  private async getConnectionPoolStats() {
    const result = await this.postgresService.query(`
      SELECT
        count(*) as total,
        count(*) FILTER (WHERE state = 'active') as active,
        count(*) FILTER (WHERE state = 'idle') as idle
      FROM pg_stat_activity
      WHERE datname = current_database()
    `);
    return result[0];
  }
}
```

**Deliverables**:
- Health check service complete
- Metrics collection working
- Endpoints exposed
- Tests passing

**Team**: Backend Developer (1)
**Estimated Time**: 2 days

**Acceptance Criteria**:
- [x] Health endpoint returns status in <100ms
- [x] Connection pool stats accurate
- [x] Circuit breaker prevents cascading failures
- [x] Graceful degradation works
- [x] Test coverage > 90%

#### Day 3-5: Database Module Integration
**Tasks**:
- [ ] Create main `DatabaseModule` with all providers
- [ ] Configure module imports/exports
- [ ] Implement module lifecycle hooks (onModuleInit, onModuleDestroy)
- [ ] Add graceful shutdown handling
- [ ] Create example repositories for each service
- [ ] Integration testing with all components
- [ ] Performance testing

**Module Structure**:
```typescript
// database.module.ts
@Global()
@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      useFactory: () => getPostgresConfig(),
    }),
    MongooseModule.forRootAsync({
      useFactory: () => getMongoConfig(),
    }),
  ],
  providers: [
    PostgresService,
    MongoDbService,
    DatabaseHealthService,
  ],
  exports: [
    TypeOrmModule,
    MongooseModule,
    PostgresService,
    MongoDbService,
    DatabaseHealthService,
  ],
})
export class DatabaseModule implements OnModuleInit, OnModuleDestroy {
  constructor(
    private postgresService: PostgresService,
    private mongoService: MongoDbService,
  ) {}

  async onModuleInit() {
    // Verify connections on startup
    const healthy = await this.healthService.checkHealth();
    if (!healthy.status) {
      throw new Error('Database connections failed during initialization');
    }
  }

  async onModuleDestroy() {
    // Graceful shutdown
    await this.postgresService.closeConnections();
    await this.mongoService.closeConnections();
  }
}
```

**Deliverables**:
- Database module complete and tested
- All services integrated
- Lifecycle management working
- Example repositories functional

**Team**: Backend Developer (1-2)
**Estimated Time**: 3 days

**Acceptance Criteria**:
- [x] Module loads successfully
- [x] All providers available
- [x] Graceful startup/shutdown works
- [x] Can be imported by other modules
- [x] Integration tests pass
- [x] No memory leaks on shutdown

---

## 5. Phase 3: Production Readiness (Week 5-6)

### 5.1 Week 5: Connection Pooling & Performance

#### Day 1-3: Connection Pool Optimization
**Tasks**:
- [ ] Implement intelligent connection pooling
- [ ] Configure pool sizes based on load testing
- [ ] Add connection timeout handling
- [ ] Implement connection retry logic with exponential backoff
- [ ] Add connection leak detection
- [ ] Monitor and log pool metrics
- [ ] Load testing to determine optimal settings

**Configuration**:
```typescript
// postgres.config.ts (production settings)
export const getProductionPostgresConfig = () => ({
  // ... other config
  extra: {
    max: 100,                    // Maximum pool size
    min: 10,                     // Minimum pool size
    idle: 10000,                 // 10 seconds idle timeout
    acquire: 30000,              // 30 seconds acquire timeout
    evict: 1000,                 // Eviction run every second
    connectionTimeoutMillis: 5000,
    idleTimeoutMillis: 30000,
    maxUses: 7500,               // Recycle connections

    // Connection retry
    retry: {
      max: 3,
      timeout: 3000,
      backoff: {
        type: 'exponential',
        delay: 1000,
      },
    },
  },
});

// Connection pool monitoring
@Injectable()
export class ConnectionPoolMonitor {
  private readonly logger = new Logger(ConnectionPoolMonitor.name);

  constructor(
    @InjectDataSource() private dataSource: DataSource,
  ) {
    this.startMonitoring();
  }

  private startMonitoring() {
    setInterval(async () => {
      const stats = await this.getPoolStats();

      if (stats.active / stats.max > 0.8) {
        this.logger.warn('Connection pool usage above 80%', stats);
      }

      if (stats.waiting > 0) {
        this.logger.warn('Queries waiting for connections', stats);
      }
    }, 30000); // Check every 30 seconds
  }

  private async getPoolStats() {
    // Implementation to get pool stats
  }
}
```

**Deliverables**:
- Optimized connection pooling
- Monitoring in place
- Load tested configurations
- Documentation updated

**Team**: Backend Developer (1), DevOps (1)
**Estimated Time**: 3 days

**Acceptance Criteria**:
- [x] Pool handles 1000 concurrent connections
- [x] Connection acquisition < 10ms (p95)
- [x] No connection leaks
- [x] Automatic recovery from connection failures
- [x] Metrics logged correctly

#### Day 4-5: Read/Write Splitting
**Tasks**:
- [ ] Implement database router for read/write splitting
- [ ] Configure primary and replica connections
- [ ] Add automatic failover logic
- [ ] Implement load balancing across read replicas
- [ ] Add replication lag monitoring
- [ ] Create routing decorators for services
- [ ] Test failover scenarios

**Implementation**:
```typescript
// database-router.service.ts
@Injectable()
export class DatabaseRouter {
  constructor(
    @InjectDataSource('primary') private primary: DataSource,
    @InjectDataSource('replica1') private replica1: DataSource,
    @InjectDataSource('replica2') private replica2: DataSource,
  ) {}

  getConnectionForOperation(operation: 'read' | 'write'): DataSource {
    if (operation === 'write') {
      return this.primary;
    }

    // Load balance across replicas
    const replicas = [this.replica1, this.replica2];
    const healthyReplicas = replicas.filter(r => r.isInitialized);

    if (healthyReplicas.length === 0) {
      // Fallback to primary if no replicas available
      return this.primary;
    }

    // Round-robin or random selection
    const index = Math.floor(Math.random() * healthyReplicas.length);
    return healthyReplicas[index];
  }

  async executeRead<T>(query: () => Promise<T>): Promise<T> {
    const connection = this.getConnectionForOperation('read');
    return connection.transaction(query);
  }

  async executeWrite<T>(query: () => Promise<T>): Promise<T> {
    const connection = this.getConnectionForOperation('write');
    return connection.transaction(query);
  }
}

// Decorator for easy usage
export function ReadOperation() {
  return (target: any, propertyKey: string, descriptor: PropertyDescriptor) => {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const router = this.databaseRouter as DatabaseRouter;
      return router.executeRead(() => originalMethod.apply(this, args));
    };

    return descriptor;
  };
}
```

**Deliverables**:
- Read/write splitting functional
- Automatic failover working
- Load balancing across replicas
- Monitoring for replication lag

**Team**: Backend Developer (1), DevOps (1)
**Estimated Time**: 2 days

**Acceptance Criteria**:
- [x] Writes always go to primary
- [x] Reads distributed across replicas
- [x] Failover to primary if replicas down
- [x] Replication lag < 1 second
- [x] No data consistency issues

### 5.2 Week 6: Security & Monitoring

#### Day 1-2: Security Hardening
**Tasks**:
- [ ] Implement SSL/TLS for all database connections
- [ ] Set up database user roles and permissions
- [ ] Implement row-level security (RLS) where needed
- [ ] Add audit logging for sensitive operations
- [ ] Encrypt sensitive data at rest
- [ ] Configure secrets management (AWS Secrets Manager)
- [ ] Security testing and vulnerability scan

**Security Configuration**:
```typescript
// Secure connection configuration
export const getSecurePostgresConfig = () => ({
  // ... other config
  ssl: {
    rejectUnauthorized: true,
    ca: fs.readFileSync('/path/to/ca-certificate.crt'),
    cert: fs.readFileSync('/path/to/client-cert.crt'),
    key: fs.readFileSync('/path/to/client-key.key'),
  },

  // Use secrets manager
  password: await getSecretFromSecretsManager('postgres-password'),
});

// Row-level security migration
export class EnableRowLevelSecurity implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Enable RLS on users table
    await queryRunner.query(`
      ALTER TABLE shared.users ENABLE ROW LEVEL SECURITY;
    `);

    // Policy: Users can only see their own data
    await queryRunner.query(`
      CREATE POLICY user_isolation_policy ON shared.users
      FOR ALL
      USING (id = current_setting('app.current_user_id')::uuid);
    `);
  }
}

// Audit logging
@Injectable()
export class AuditLogger {
  async logDatabaseOperation(operation: {
    table: string;
    action: 'INSERT' | 'UPDATE' | 'DELETE';
    userId: string;
    data: any;
  }) {
    await this.auditRepository.create({
      timestamp: new Date(),
      ...operation,
    });
  }
}
```

**Deliverables**:
- SSL/TLS enabled on all connections
- Database roles properly configured
- Audit logging implemented
- Security scan passed

**Team**: Backend Developer (1), DevOps (1)
**Estimated Time**: 2 days

**Acceptance Criteria**:
- [x] All connections use SSL/TLS
- [x] Principle of least privilege enforced
- [x] Sensitive data encrypted
- [x] Audit logs capture all sensitive operations
- [x] No critical security vulnerabilities
- [x] Secrets not hardcoded

#### Day 3-5: Metrics & Observability
**Tasks**:
- [ ] Implement comprehensive metrics collection
- [ ] Set up Prometheus exporters
- [ ] Create Grafana dashboards
- [ ] Configure alerting rules
- [ ] Add slow query logging
- [ ] Implement distributed tracing
- [ ] Create runbooks for common issues

**Metrics Implementation**:
```typescript
// metrics.service.ts
@Injectable()
export class DatabaseMetricsService {
  private readonly queryDurationHistogram = new promClient.Histogram({
    name: 'db_query_duration_seconds',
    help: 'Database query duration in seconds',
    labelNames: ['database', 'operation', 'table'],
    buckets: [0.01, 0.05, 0.1, 0.5, 1, 5],
  });

  private readonly connectionPoolGauge = new promClient.Gauge({
    name: 'db_connection_pool_size',
    help: 'Current connection pool size',
    labelNames: ['database', 'state'],
  });

  async collectMetrics(): Promise<DatabaseMetrics> {
    return {
      postgres: await this.collectPostgresMetrics(),
      mongodb: await this.collectMongoMetrics(),
    };
  }

  private async collectPostgresMetrics() {
    // Connection pool metrics
    const poolStats = await this.postgresService.query(`
      SELECT
        count(*) as total,
        count(*) FILTER (WHERE state = 'active') as active,
        count(*) FILTER (WHERE state = 'idle') as idle,
        count(*) FILTER (WHERE wait_event_type IS NOT NULL) as waiting
      FROM pg_stat_activity
      WHERE datname = current_database()
    `);

    this.connectionPoolGauge.set(
      { database: 'postgres', state: 'active' },
      poolStats[0].active
    );

    // Slow queries
    const slowQueries = await this.postgresService.query(`
      SELECT
        query,
        calls,
        total_exec_time,
        mean_exec_time
      FROM pg_stat_statements
      WHERE mean_exec_time > 100
      ORDER BY mean_exec_time DESC
      LIMIT 10
    `);

    // Cache hit ratio
    const cacheHitRatio = await this.postgresService.query(`
      SELECT
        sum(heap_blks_hit) / (sum(heap_blks_hit) + sum(heap_blks_read)) as ratio
      FROM pg_statio_user_tables
    `);

    // Replication lag
    const replicationLag = await this.postgresService.query(`
      SELECT
        EXTRACT(EPOCH FROM (now() - pg_last_xact_replay_timestamp())) as lag_seconds
    `);

    return {
      connectionPool: poolStats[0],
      slowQueries,
      cacheHitRatio: cacheHitRatio[0].ratio,
      replicationLag: replicationLag[0]?.lag_seconds || 0,
    };
  }
}

// Alert rules (Prometheus)
/*
groups:
  - name: database
    rules:
      - alert: HighConnectionPoolUsage
        expr: db_connection_pool_size{state="active"} / db_connection_pool_size{state="total"} > 0.8
        for: 5m
        annotations:
          summary: "Database connection pool usage high"

      - alert: SlowQueries
        expr: rate(db_query_duration_seconds_sum[5m]) > 1
        for: 5m
        annotations:
          summary: "Database queries running slowly"

      - alert: ReplicationLag
        expr: db_replication_lag_seconds > 5
        for: 2m
        annotations:
          summary: "Database replication lag is high"
*/
```

**Deliverables**:
- Metrics collection operational
- Dashboards created
- Alerts configured
- Runbooks documented

**Team**: Backend Developer (1), DevOps (1)
**Estimated Time**: 3 days

**Acceptance Criteria**:
- [x] All key metrics collected
- [x] Dashboards show real-time data
- [x] Alerts fire correctly
- [x] Slow queries logged
- [x] Distributed tracing working
- [x] Runbooks complete

---

## 6. Phase 4: Testing & Deployment (Week 7-8)

### 6.1 Week 7: Testing

#### Day 1-2: Unit & Integration Testing
**Tasks**:
- [ ] Complete unit test suite (>85% coverage)
- [ ] Integration tests for all repositories
- [ ] Transaction rollback tests
- [ ] Connection failure scenarios
- [ ] Migration tests
- [ ] Health check tests
- [ ] Performance benchmarks

**Test Examples**:
```typescript
// postgres.repository.spec.ts
describe('PostgresRepository', () => {
  let repository: PostgresRepository<User>;
  let dataSource: DataSource;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      imports: [TypeOrmModule.forRoot(testConfig)],
    }).compile();

    dataSource = module.get<DataSource>(DataSource);
    repository = new PostgresRepository(dataSource.getRepository(User));
  });

  describe('transaction', () => {
    it('should commit on success', async () => {
      const result = await repository.transaction(async (repo) => {
        const user = await repo.create({ email: 'test@test.com' });
        return user;
      });

      expect(result.id).toBeDefined();
      const found = await repository.findById(result.id);
      expect(found).toBeDefined();
    });

    it('should rollback on error', async () => {
      await expect(
        repository.transaction(async (repo) => {
          await repo.create({ email: 'test@test.com' });
          throw new Error('Test error');
        })
      ).rejects.toThrow();

      const users = await repository.findAll();
      expect(users.length).toBe(0);
    });
  });

  describe('connection failures', () => {
    it('should retry on connection timeout', async () => {
      // Simulate connection timeout
      jest.spyOn(dataSource, 'query').mockRejectedValueOnce(
        new Error('Connection timeout')
      );

      // Should succeed on retry
      const result = await repository.findById('some-id');
      expect(dataSource.query).toHaveBeenCalledTimes(2);
    });
  });
});
```

**Deliverables**:
- Comprehensive test suite
- All tests passing
- Coverage reports generated
- Performance benchmarks documented

**Team**: Backend Developer (2)
**Estimated Time**: 2 days

**Acceptance Criteria**:
- [x] Unit test coverage > 85%
- [x] Integration tests cover all critical paths
- [x] All edge cases tested
- [x] Performance benchmarks meet targets
- [x] CI pipeline runs all tests

#### Day 3-5: Load & Stress Testing
**Tasks**:
- [ ] Set up load testing environment
- [ ] Create load test scenarios (k6 or Artillery)
- [ ] Test connection pool under load
- [ ] Test database performance under load
- [ ] Identify bottlenecks
- [ ] Optimize based on results
- [ ] Document performance characteristics

**Load Test Script**:
```javascript
// load-test.js (k6)
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '2m', target: 100 },  // Ramp up to 100 users
    { duration: '5m', target: 100 },  // Stay at 100 users
    { duration: '2m', target: 500 },  // Ramp up to 500 users
    { duration: '5m', target: 500 },  // Stay at 500 users
    { duration: '2m', target: 0 },    // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<200'], // 95% of requests under 200ms
    http_req_failed: ['rate<0.01'],   // Error rate under 1%
  },
};

export default function () {
  // Test database read operations
  const readResponse = http.get('http://localhost:3000/api/users');
  check(readResponse, {
    'read status is 200': (r) => r.status === 200,
    'read response time < 200ms': (r) => r.timings.duration < 200,
  });

  // Test database write operations
  const writeResponse = http.post('http://localhost:3000/api/users', {
    email: `test-${Date.now()}@test.com`,
    firstName: 'Test',
    lastName: 'User',
  });
  check(writeResponse, {
    'write status is 201': (r) => r.status === 201,
    'write response time < 500ms': (r) => r.timings.duration < 500,
  });

  sleep(1);
}
```

**Deliverables**:
- Load tests completed
- Performance baseline established
- Bottlenecks identified and resolved
- System can handle target load

**Team**: Backend Developer (1), DevOps (1)
**Estimated Time**: 3 days

**Acceptance Criteria**:
- [x] System handles 1000 concurrent users
- [x] Database queries p95 < 100ms
- [x] No connection pool exhaustion
- [x] Error rate < 0.1% under load
- [x] Memory usage stable

### 6.2 Week 8: Deployment & Documentation

#### Day 1-3: Production Deployment
**Tasks**:
- [ ] Set up production databases (RDS, DocumentDB)
- [ ] Configure production connection strings
- [ ] Set up database backups
- [ ] Configure monitoring and alerting
- [ ] Deploy database module to staging
- [ ] Run smoke tests on staging
- [ ] Deploy to production
- [ ] Verify production deployment

**Deployment Checklist**:
```yaml
Pre-deployment:
  - [ ] All tests passing
  - [ ] Security scan passed
  - [ ] Performance tests passed
  - [ ] Backup system configured
  - [ ] Monitoring configured
  - [ ] Runbooks created
  - [ ] Rollback plan documented

Deployment:
  - [ ] Deploy to staging
  - [ ] Run smoke tests
  - [ ] Run integration tests
  - [ ] Verify health checks
  - [ ] Deploy to production
  - [ ] Run smoke tests
  - [ ] Monitor for 24 hours

Post-deployment:
  - [ ] Verify metrics
  - [ ] Check error rates
  - [ ] Review logs
  - [ ] Update documentation
  - [ ] Team notification
```

**Deliverables**:
- Production database infrastructure live
- Staging environment validated
- Production deployment successful
- Monitoring active

**Team**: DevOps (1), Backend Developer (1)
**Estimated Time**: 3 days

**Acceptance Criteria**:
- [x] Production databases accessible
- [x] Backups configured and tested
- [x] Monitoring showing healthy metrics
- [x] Alerts firing correctly
- [x] No errors in production logs
- [x] Health checks passing

#### Day 4-5: Documentation & Handoff
**Tasks**:
- [ ] Complete API documentation
- [ ] Document repository usage patterns
- [ ] Create migration guide
- [ ] Write operational runbooks
- [ ] Create troubleshooting guide
- [ ] Document monitoring and alerts
- [ ] Create video walkthrough
- [ ] Team knowledge transfer session

**Documentation Structure**:
```
docs/database/
├── README.md                 # Overview and quick start
├── setup.md                  # Local development setup
├── repositories.md           # How to use repository pattern
├── migrations.md             # Migration guide
├── monitoring.md             # Monitoring and metrics
├── troubleshooting.md        # Common issues and solutions
├── security.md               # Security best practices
├── performance.md            # Performance tuning guide
└── runbooks/
    ├── connection-pool-exhausted.md
    ├── slow-queries.md
    ├── replication-lag.md
    └── disaster-recovery.md
```

**Deliverables**:
- Comprehensive documentation
- Runbooks for common scenarios
- Team trained on database module
- Knowledge transfer complete

**Team**: Backend Developer (1), Technical Writer (0.5)
**Estimated Time**: 2 days

**Acceptance Criteria**:
- [x] All documentation complete
- [x] Team can set up locally from docs
- [x] Runbooks cover common scenarios
- [x] Knowledge transfer session completed
- [x] Documentation reviewed and approved

---

## 7. Success Criteria

### 7.1 Functional Requirements
- [x] PostgreSQL and MongoDB connections working
- [x] Repository pattern implemented for both databases
- [x] Migration system operational
- [x] Health checks functional
- [x] Transaction support working
- [x] Graceful shutdown implemented

### 7.2 Performance Requirements
- [x] Database query latency p95 < 100ms
- [x] Connection acquisition < 10ms
- [x] System handles 1000 concurrent connections
- [x] No connection leaks
- [x] Replication lag < 1 second

### 7.3 Security Requirements
- [x] All connections use SSL/TLS
- [x] Database roles properly configured
- [x] Audit logging implemented
- [x] Secrets managed securely
- [x] No critical vulnerabilities

### 7.4 Operational Requirements
- [x] Monitoring and alerting configured
- [x] Backups automated
- [x] Disaster recovery tested
- [x] Runbooks created
- [x] Documentation complete

---

## 8. Risk Management

### 8.1 Technical Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Connection pool exhaustion | Medium | High | Extensive load testing, proper pool sizing |
| Migration failures | Low | Critical | Thorough testing, rollback procedures |
| Performance degradation | Medium | High | Early benchmarking, continuous monitoring |
| Data consistency issues | Low | Critical | Transaction testing, ACID compliance verification |
| Security vulnerabilities | Low | Critical | Security scans, penetration testing |

### 8.2 Operational Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Production outage | Low | Critical | HA setup, disaster recovery plan |
| Data loss | Very Low | Critical | Automated backups, point-in-time recovery |
| Replication lag | Medium | Medium | Monitoring, automatic failover |
| Team knowledge gap | Medium | Medium | Documentation, knowledge transfer |

---

## 9. Dependencies

### 9.1 External Dependencies
- PostgreSQL 15+ availability
- MongoDB 6.0+ availability
- AWS infrastructure (RDS, DocumentDB, Secrets Manager)
- Monitoring tools (Prometheus, Grafana)

### 9.2 Internal Dependencies
- None (this is the foundation layer)

### 9.3 Team Dependencies
- DevOps engineer for infrastructure setup
- Backend developers for implementation
- Technical writer for documentation

---

## 10. Resource Planning

### 10.1 Team Allocation

**Week 1-2 (Foundation)**:
- Backend Developer: 1 FTE
- DevOps Engineer: 0.25 FTE

**Week 3-4 (Core Infrastructure)**:
- Backend Developer: 2 FTE
- DevOps Engineer: 0.25 FTE

**Week 5-6 (Production Readiness)**:
- Backend Developer: 1 FTE
- DevOps Engineer: 1 FTE

**Week 7-8 (Testing & Deployment)**:
- Backend Developer: 1.5 FTE
- DevOps Engineer: 0.5 FTE
- Technical Writer: 0.5 FTE

### 10.2 Infrastructure Costs

**Development (Week 1-4)**: ~$200/month
- Local Docker environments
- Small staging database

**Staging (Week 5-6)**: ~$500/month
- RDS PostgreSQL (db.t3.medium)
- DocumentDB (db.t3.medium)
- Monitoring tools

**Production (Week 7-8)**: ~$1,500/month
- RDS PostgreSQL primary + 2 replicas
- DocumentDB replica set (3 nodes)
- Backups and monitoring

---

## 11. Milestones & Deliverables

### Milestone 1: Foundation Complete (End of Week 2)
- [x] Local development environment working
- [x] PostgreSQL and MongoDB connected
- [x] Basic repository pattern implemented
- **Go/No-Go Decision Point**

### Milestone 2: Core Infrastructure Complete (End of Week 4)
- [x] Migration system operational
- [x] All entities and schemas created
- [x] Health checks working
- [x] Module integration complete
- **Go/No-Go Decision Point**

### Milestone 3: Production Ready (End of Week 6)
- [x] Connection pooling optimized
- [x] Security hardened
- [x] Monitoring operational
- [x] Performance validated
- **Go/No-Go Decision Point**

### Milestone 4: Deployment Complete (End of Week 8)
- [x] Production deployment successful
- [x] Tests passing
- [x] Documentation complete
- [x] Team trained
- **Project Complete**

---

## 12. Acceptance Criteria

The database infrastructure implementation will be considered complete when:

1. **Functionality**:
   - All database connections working reliably
   - Repository pattern usable by all services
   - Migrations can be run safely in all environments
   - Health checks provide accurate status

2. **Performance**:
   - Meets all performance targets under load
   - No memory leaks or connection leaks
   - Efficient resource utilization

3. **Security**:
   - Passes security audit
   - All connections encrypted
   - Proper access controls in place
   - Audit logging functional

4. **Operations**:
   - Monitoring provides visibility
   - Alerts fire appropriately
   - Backups working and tested
   - Documentation complete

5. **Quality**:
   - Test coverage > 85%
   - All tests passing
   - Code review approved
   - No critical bugs

---

## 13. Post-Implementation

### 13.1 Maintenance Plan
- Weekly: Review slow query logs
- Monthly: Review and optimize indexes
- Quarterly: Security audit
- Annually: Major version upgrades

### 13.2 Continuous Improvement
- Monitor performance metrics
- Gather developer feedback
- Iterate on repository patterns
- Add new features as needed

### 13.3 Support & Training
- Office hours for questions
- Code review for new repositories
- Documentation updates
- Best practices sharing

---

## Document Metadata

**Version**: 1.0
**Author**: Fashion Wallet Engineering Team
**Status**: Draft
**Review Cycle**: Weekly during implementation
**Next Review**: Week 2 checkpoint
**Dependencies**: arch-infra-00, spec-infra-00

---

**End of Database Infrastructure Implementation Plan**

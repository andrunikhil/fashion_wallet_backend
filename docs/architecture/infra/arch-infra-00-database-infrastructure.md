# Architecture Document: Database Infrastructure

## Document Overview

**Version**: 1.0
**Last Updated**: November 2025
**Document Type**: Architecture Document
**Status**: Draft
**Arch ID**: arch-infra-00
**Related Spec**: spec-infra-00

---

## 1. Executive Summary

This architecture document describes the implementation design for the database infrastructure layer of the Fashion Wallet backend. It outlines the multi-database strategy using PostgreSQL for relational data, MongoDB for flexible document storage, and the patterns for connection management, migrations, and data access.

---

## 2. Architectural Overview

### 2.1 System Context

```yaml
External Systems:
  - Application Services (Avatar, Catalog, Design, User)
  - Migration Tools
  - Backup Systems
  - Monitoring Tools

Database Layer Components:
  - PostgreSQL Primary + Replicas
  - MongoDB Replica Set
  - Connection Pooling Layer
  - Migration Management
  - Health Monitoring
```

### 2.2 Design Principles

```yaml
Principles:
  1. Separation of Concerns: Each service has its own schema
  2. Polyglot Persistence: Use the right database for the right data
  3. Connection Pooling: Efficient resource management
  4. Schema Versioning: All changes tracked via migrations
  5. High Availability: Replication and failover support
  6. Security First: Encryption, access control, audit logging
```

---

## 3. Technology Stack

### 3.1 Core Technologies

```yaml
PostgreSQL:
  Version: 15+
  ORM: TypeORM
  Migration: TypeORM Migrations
  Connection Pool: pg-pool
  Extensions:
    - uuid-ossp
    - pgcrypto
    - pg_trgm
    - ltree

MongoDB:
  Version: 6.0+
  ODM: Mongoose
  Driver: mongodb (native)

Monitoring:
  - pg_stat_statements (PostgreSQL)
  - MongoDB Compass
  - Custom metrics collection

Backup:
  - pg_dump / pg_restore
  - mongodump / mongorestore
  - AWS S3 for backup storage
```

---

## 4. Component Architecture

### 4.1 Database Module Structure

```
src/infrastructure/database/
├── database.module.ts           # Main database module
├── postgres/
│   ├── postgres.service.ts      # PostgreSQL service
│   ├── postgres.config.ts       # Configuration
│   ├── postgres.health.ts       # Health checks
│   └── repositories/            # Repository pattern
│       ├── base.repository.ts
│       ├── user.repository.ts
│       └── ...
├── mongodb/
│   ├── mongodb.service.ts       # MongoDB service
│   ├── mongodb.config.ts        # Configuration
│   ├── mongodb.health.ts        # Health checks
│   └── repositories/            # Repository pattern
│       ├── base.repository.ts
│       ├── design.repository.ts
│       └── ...
├── migrations/
│   ├── postgres/
│   │   └── [timestamp]-[name].ts
│   └── mongodb/
│       └── [timestamp]-[name].ts
├── entities/
│   └── [domain].entity.ts       # TypeORM entities
├── schemas/
│   └── [domain].schema.ts       # Mongoose schemas
└── interfaces/
    ├── repository.interface.ts
    └── database.interface.ts
```

### 4.2 Connection Management

```typescript
// PostgreSQL Connection Architecture
┌─────────────────────────────────────────┐
│         Application Layer               │
│  (Services, Controllers, Repositories)  │
└────────────────┬────────────────────────┘
                 │
┌────────────────▼────────────────────────┐
│      PostgreSQL Service                 │
│  - Connection Pool Management           │
│  - Health Checks                        │
│  - Transaction Support                  │
└────────────────┬────────────────────────┘
                 │
┌────────────────▼────────────────────────┐
│         Connection Pool                 │
│  Min: 10 | Max: 100 | Timeout: 30s     │
└────────────────┬────────────────────────┘
                 │
        ┌────────┴────────┐
        │                 │
┌───────▼──────┐  ┌──────▼────────┐
│   Primary    │  │   Replica 1   │
│  PostgreSQL  │  │   PostgreSQL  │
│ (Read/Write) │  │  (Read Only)  │
└──────────────┘  └───────────────┘
                  ┌───────────────┐
                  │   Replica 2   │
                  │   PostgreSQL  │
                  │  (Read Only)  │
                  └───────────────┘
```

---

## 5. Data Access Patterns

### 5.1 Repository Pattern

```typescript
/**
 * Base repository providing common CRUD operations
 */
export abstract class BaseRepository<T> {
  constructor(
    protected readonly model: Model<T> | Repository<T>
  ) {}

  abstract findById(id: string): Promise<T | null>;
  abstract findAll(options?: FindOptions): Promise<T[]>;
  abstract create(data: Partial<T>): Promise<T>;
  abstract update(id: string, data: Partial<T>): Promise<T>;
  abstract delete(id: string): Promise<boolean>;
}

/**
 * PostgreSQL Repository Implementation
 */
export class PostgresRepository<T> extends BaseRepository<T> {
  constructor(
    private readonly repository: Repository<T>,
    private readonly queryRunner?: QueryRunner
  ) {
    super(repository);
  }

  async findById(id: string): Promise<T | null> {
    return this.repository.findOne({ where: { id } as any });
  }

  async transaction<R>(
    work: (repo: PostgresRepository<T>) => Promise<R>
  ): Promise<R> {
    const queryRunner = this.repository.manager.connection.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const transactionalRepo = new PostgresRepository(
        queryRunner.manager.getRepository(this.repository.target),
        queryRunner
      );
      const result = await work(transactionalRepo);
      await queryRunner.commitTransaction();
      return result;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }
}

/**
 * MongoDB Repository Implementation
 */
export class MongoRepository<T> extends BaseRepository<T> {
  constructor(
    private readonly model: Model<T>
  ) {
    super(model);
  }

  async findById(id: string): Promise<T | null> {
    return this.model.findById(id).exec();
  }

  async transaction<R>(
    work: (session: ClientSession) => Promise<R>
  ): Promise<R> {
    const session = await this.model.db.startSession();
    session.startTransaction();

    try {
      const result = await work(session);
      await session.commitTransaction();
      return result;
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      await session.endSession();
    }
  }
}
```

### 5.2 Query Builders

```typescript
/**
 * Fluent query builder for complex queries
 */
export class QueryBuilder<T> {
  private query: any;

  where(conditions: Partial<T>): this {
    this.query = { ...this.query, ...conditions };
    return this;
  }

  orderBy(field: keyof T, direction: 'ASC' | 'DESC'): this {
    // Implementation
    return this;
  }

  limit(count: number): this {
    // Implementation
    return this;
  }

  async execute(): Promise<T[]> {
    // Execute the built query
    return [];
  }
}
```

---

## 6. Migration Strategy

### 6.1 Migration Workflow

```
Development → Staging → Production

1. Create Migration
   ↓
2. Test Locally
   ↓
3. Code Review
   ↓
4. Deploy to Staging
   ↓
5. Verify Migration
   ↓
6. Deploy to Production
   ↓
7. Monitor & Verify
```

### 6.2 Migration Templates

```typescript
/**
 * PostgreSQL Migration Template
 */
import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateUsersTable1699876543000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Safety checks
    const tableExists = await queryRunner.hasTable('users');
    if (tableExists) {
      throw new Error('Table users already exists');
    }

    // Create table
    await queryRunner.query(`
      CREATE TABLE shared.users (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
        deleted_at TIMESTAMPTZ NULL
      )
    `);

    // Create indexes
    await queryRunner.query(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_email
      ON shared.users(email)
      WHERE deleted_at IS NULL
    `);

    // Add comments
    await queryRunner.query(`
      COMMENT ON TABLE shared.users IS 'Core user accounts'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS shared.users CASCADE');
  }
}
```

---

## 7. Schema Design

### 7.1 PostgreSQL Schema Organization

```sql
-- Shared schema (cross-service data)
CREATE SCHEMA IF NOT EXISTS shared;

-- Service-specific schemas
CREATE SCHEMA IF NOT EXISTS avatar;
CREATE SCHEMA IF NOT EXISTS catalog;
CREATE SCHEMA IF NOT EXISTS design;
CREATE SCHEMA IF NOT EXISTS audit;

-- Example: User table in shared schema
CREATE TABLE shared.users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  role VARCHAR(50) NOT NULL DEFAULT 'user',

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  deleted_at TIMESTAMPTZ NULL,

  -- Audit
  created_by UUID REFERENCES shared.users(id),
  updated_by UUID REFERENCES shared.users(id)
);

-- Example: Avatar table
CREATE TABLE avatar.avatars (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES shared.users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'pending',

  -- Measurements (JSONB for flexibility)
  measurements JSONB DEFAULT '{}'::jsonb,

  -- 3D model reference (stored in MongoDB)
  model_ref VARCHAR(255),

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  deleted_at TIMESTAMPTZ NULL
);
```

### 7.2 MongoDB Schema Design

```typescript
/**
 * Design Document Schema (MongoDB)
 */
import { Schema, model } from 'mongoose';

const LayerSchema = new Schema({
  id: { type: String, required: true },
  type: {
    type: String,
    enum: ['silhouette', 'fabric', 'pattern'],
    required: true
  },
  data: Schema.Types.Mixed,
  order: { type: Number, required: true }
});

const DesignSchema = new Schema({
  userId: {
    type: String,
    required: true,
    index: true
  },
  name: {
    type: String,
    required: true,
    minlength: 1,
    maxlength: 255
  },
  status: {
    type: String,
    enum: ['draft', 'published', 'archived'],
    default: 'draft',
    index: true
  },

  // Embedded layers
  layers: [LayerSchema],

  // Metadata
  metadata: {
    tags: [String],
    description: String,
    thumbnailUrl: String
  },

  // References
  avatarId: String,
  catalogItemIds: [String],

  // Version control
  version: { type: Number, default: 1 },
  history: [{
    version: Number,
    changedAt: Date,
    changedBy: String,
    changes: Schema.Types.Mixed
  }],

  // Timestamps
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  deletedAt: Date
}, {
  timestamps: true
});

// Indexes
DesignSchema.index({ userId: 1, status: 1, createdAt: -1 });
DesignSchema.index({ 'metadata.tags': 1 });
DesignSchema.index({ deletedAt: 1 }, { sparse: true });

export const Design = model('Design', DesignSchema);
```

---

## 8. High Availability & Scalability

### 8.1 Replication Architecture

```
┌─────────────────────────────────────────┐
│         Application Tier                │
│    (Load Balanced Services)             │
└───────────┬─────────────────────────────┘
            │
    ┌───────┴────────┐
    │                │
┌───▼──────────┐  ┌──▼──────────┐
│ PostgreSQL   │  │  MongoDB    │
│   Primary    │  │   Primary   │
│              │  │             │
│  (Writes)    │  │  (Writes)   │
└──────┬───────┘  └──────┬──────┘
       │                  │
   Streaming          Replication
   Replication
       │                  │
  ┌────┴─────┐      ┌────┴─────┐
  │          │      │          │
┌─▼────┐  ┌─▼────┐┌─▼────┐  ┌─▼────┐
│Repli │  │Repli ││Repli │  │Repli │
│ca 1  │  │ca 2  ││ca 1  │  │ca 2  │
│      │  │      ││      │  │      │
│(Read)│  │(Read)││(Read)│  │(Read)│
└──────┘  └──────┘└──────┘  └──────┘
```

### 8.2 Read/Write Splitting

```typescript
/**
 * Intelligent read/write routing
 */
export class DatabaseRouter {
  constructor(
    private primary: DataSource,
    private replicas: DataSource[]
  ) {}

  getConnectionForOperation(operation: 'read' | 'write'): DataSource {
    if (operation === 'write') {
      return this.primary;
    }

    // Load balance across replicas
    const index = Math.floor(Math.random() * this.replicas.length);
    return this.replicas[index];
  }

  async executeRead<T>(query: () => Promise<T>): Promise<T> {
    const connection = this.getConnectionForOperation('read');
    return query.call(connection);
  }

  async executeWrite<T>(query: () => Promise<T>): Promise<T> {
    const connection = this.getConnectionForOperation('write');
    return query.call(connection);
  }
}
```

---

## 9. Security Architecture

### 9.1 Access Control

```yaml
Database Users & Roles:
  app_readonly:
    Permissions: SELECT on all tables
    Usage: Read replicas

  app_readwrite:
    Permissions: SELECT, INSERT, UPDATE, DELETE
    Usage: Application services
    Restrictions: Cannot DROP, TRUNCATE

  app_admin:
    Permissions: All operations
    Usage: Migrations, maintenance

  Service-specific users:
    - avatar_service (limited to avatar schema)
    - catalog_service (limited to catalog schema)
    - design_service (limited to design schema)
```

### 9.2 Connection Security

```typescript
/**
 * Secure connection configuration
 */
export const databaseConfig = {
  postgres: {
    ssl: {
      rejectUnauthorized: true,
      ca: fs.readFileSync('/path/to/ca-certificate.crt'),
      cert: fs.readFileSync('/path/to/client-cert.crt'),
      key: fs.readFileSync('/path/to/client-key.key')
    },
    password: process.env.POSTGRES_PASSWORD, // From secrets manager
  },

  mongodb: {
    ssl: true,
    authSource: 'admin',
    authMechanism: 'SCRAM-SHA-256',
    password: process.env.MONGODB_PASSWORD
  }
};
```

---

## 10. Monitoring & Observability

### 10.1 Metrics Collection

```typescript
/**
 * Database metrics service
 */
export class DatabaseMetricsService {
  async collectMetrics(): Promise<DatabaseMetrics> {
    return {
      postgres: {
        connections: await this.getPostgresConnections(),
        queries: await this.getSlowQueries(),
        cacheHitRate: await this.getCacheHitRate(),
        replicationLag: await this.getReplicationLag()
      },
      mongodb: {
        connections: await this.getMongoConnections(),
        operations: await this.getOperationStats(),
        replicationLag: await this.getMongoReplicationLag()
      }
    };
  }
}
```

### 10.2 Health Checks

```typescript
/**
 * Comprehensive health check
 */
export class DatabaseHealthService {
  async checkHealth(): Promise<HealthStatus> {
    const [pgHealth, mongoHealth] = await Promise.all([
      this.checkPostgresHealth(),
      this.checkMongoHealth()
    ]);

    return {
      status: pgHealth.healthy && mongoHealth.healthy ? 'healthy' : 'unhealthy',
      checks: {
        postgres: pgHealth,
        mongodb: mongoHealth
      }
    };
  }

  private async checkPostgresHealth(): Promise<ComponentHealth> {
    try {
      await this.postgresService.query('SELECT 1');
      return { healthy: true, responseTime: Date.now() };
    } catch (error) {
      return {
        healthy: false,
        error: error.message,
        responseTime: Date.now()
      };
    }
  }
}
```

---

## 11. Deployment Architecture

### 11.1 Environment Configuration

```yaml
Development:
  PostgreSQL: Local instance (Docker)
  MongoDB: Local instance (Docker)
  Replication: None

Staging:
  PostgreSQL:
    - Primary (1 instance)
    - Replica (1 instance)
  MongoDB:
    - Replica Set (3 nodes)
  Backup: Daily

Production:
  PostgreSQL:
    - Primary (1 instance, HA with failover)
    - Replicas (2+ instances)
  MongoDB:
    - Replica Set (3+ nodes)
  Backup: Continuous + Daily snapshots
  Monitoring: Real-time alerts
```

---

## 12. Performance Optimization

### 12.1 Query Optimization Checklist

```yaml
Pre-deployment:
  ✓ All queries use EXPLAIN ANALYZE
  ✓ Appropriate indexes created
  ✓ No N+1 query patterns
  ✓ Batch operations for bulk updates
  ✓ Connection pooling configured
  ✓ Query timeouts set

Post-deployment:
  ✓ Monitor slow query log
  ✓ Review index usage statistics
  ✓ Analyze cache hit rates
  ✓ Check connection pool saturation
```

---

## 13. Disaster Recovery

### 13.1 Backup Strategy

```yaml
Backup Types:
  Full Backup:
    Frequency: Daily at 2 AM UTC
    Retention: 30 days
    Storage: AWS S3 (encrypted)

  Incremental:
    Frequency: Every 6 hours
    Retention: 7 days

  Point-in-Time Recovery:
    WAL archiving: Continuous
    Recovery window: 7 days
```

### 13.1 Recovery Procedures

```bash
# PostgreSQL Point-in-Time Recovery
1. Stop the database
2. Restore base backup
3. Configure recovery.conf
4. Restore WAL files up to target time
5. Start database
6. Verify data integrity

# MongoDB Restore
1. Stop MongoDB
2. Restore from mongodump
3. Restore oplog entries
4. Start MongoDB
5. Verify replica set status
```

---

## Document Metadata

**Version**: 1.0
**Author**: Fashion Wallet Engineering Team
**Status**: Draft
**Review Cycle**: Bi-weekly
**Next Review**: December 2025
**Dependencies**: None

---

**End of Database Infrastructure Architecture Document**

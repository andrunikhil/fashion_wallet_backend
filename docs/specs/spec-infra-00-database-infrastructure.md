# Infrastructure Specification: Database Layer

## Document Overview

**Version**: 1.0
**Last Updated**: November 2025
**Document Type**: Infrastructure Specification
**Status**: Draft
**Spec ID**: spec-infra-00

---

## 1. Executive Summary

This specification defines the database infrastructure layer for the Fashion Wallet backend. It covers PostgreSQL as the primary relational database, MongoDB for flexible document storage, and TimescaleDB for analytics. The infrastructure must support multi-tenant operations, high availability, and horizontal scalability.

---

## 2. Database Architecture Overview

### 2.1 Multi-Database Strategy

```yaml
Database Roles:
  PostgreSQL:
    Purpose: Primary relational data store
    Use Cases:
      - User accounts and authentication
      - Avatar measurements and metadata
      - Catalog relationships
      - Design metadata and permissions
      - Audit logs

  MongoDB:
    Purpose: Flexible document storage
    Use Cases:
      - Complex design documents (layers, history)
      - 3D model metadata
      - Catalog items with variable schemas
      - User preferences and settings
      - Real-time collaboration state

  TimescaleDB:
    Purpose: Time-series analytics
    Use Cases:
      - Usage metrics and analytics
      - Performance monitoring
      - User activity tracking
      - API request logs
```

---

## 3. PostgreSQL Infrastructure

### 3.1 Connection Management

#### 3.1.1 Connection Pooling
```typescript
// Requirements
ConnectionPool: {
  minConnections: 10,
  maxConnections: 100,
  idleTimeoutMs: 30000,
  connectionTimeoutMs: 5000,
  maxLifetimeMs: 3600000,
  acquireTimeoutMs: 30000,
  reapIntervalMs: 1000
}

// Features Required
- Connection health checks
- Automatic reconnection
- Connection leak detection
- Pool monitoring and metrics
- Query timeout enforcement
```

#### 3.1.2 Connection String Management
```typescript
// Environment-based configuration
interface DatabaseConfig {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
  ssl: {
    enabled: boolean;
    rejectUnauthorized: boolean;
    ca?: string;
    cert?: string;
    key?: string;
  };
  poolConfig: ConnectionPoolConfig;
}

// Support for read replicas
interface ReplicaConfig {
  primary: DatabaseConfig;
  replicas: DatabaseConfig[];
  loadBalancing: 'round-robin' | 'least-connections' | 'random';
}
```

### 3.2 Schema Organization

#### 3.2.1 Schema Structure
```sql
-- Multi-schema organization
CREATE SCHEMA IF NOT EXISTS shared;      -- Cross-service shared data
CREATE SCHEMA IF NOT EXISTS avatar;      -- Avatar service tables
CREATE SCHEMA IF NOT EXISTS catalog;     -- Catalog service tables
CREATE SCHEMA IF NOT EXISTS design;      -- Design service tables
CREATE SCHEMA IF NOT EXISTS audit;       -- Audit and logging tables
CREATE SCHEMA IF NOT EXISTS analytics;   -- Analytics and reporting

-- Schema permissions
GRANT USAGE ON SCHEMA shared TO app_user;
GRANT USAGE ON SCHEMA avatar TO avatar_service;
GRANT USAGE ON SCHEMA catalog TO catalog_service;
GRANT USAGE ON SCHEMA design TO design_service;
```

#### 3.2.2 Required Extensions
```sql
-- Install required PostgreSQL extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";        -- UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";         -- Encryption functions
CREATE EXTENSION IF NOT EXISTS "pg_trgm";          -- Fuzzy text search
CREATE EXTENSION IF NOT EXISTS "btree_gist";       -- Advanced indexing
CREATE EXTENSION IF NOT EXISTS "hstore";           -- Key-value storage
CREATE EXTENSION IF NOT EXISTS "ltree";            -- Hierarchical data
CREATE EXTENSION IF NOT EXISTS "timescaledb";      -- Time-series (if needed)
```

### 3.3 Migration Management

#### 3.3.1 Migration Strategy
```typescript
// Migration infrastructure requirements
interface MigrationConfig {
  directory: string;              // './migrations'
  tableName: string;              // 'schema_migrations'
  schemaName: string;             // 'public'
  extension: string;              // '.sql' or '.ts'
  validateChecksums: boolean;     // true in production
  transactional: boolean;         // true for safety
}

// Migration naming convention
// Format: YYYYMMDDHHMMSS_description.sql
// Example: 20251115120000_create_users_table.sql

// Required migration operations
- Up migration (apply changes)
- Down migration (rollback changes)
- Seed data management
- Migration status tracking
- Checksum validation
```

#### 3.3.2 Migration Best Practices
```sql
-- Every migration must include:
BEGIN;

-- 1. Safety checks
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'users') THEN
    RAISE EXCEPTION 'Table already exists';
  END IF;
END $$;

-- 2. Schema changes
CREATE TABLE shared.users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Indexes (non-blocking in production)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_email ON shared.users(email);

-- 4. Comments for documentation
COMMENT ON TABLE shared.users IS 'Core user accounts table';
COMMENT ON COLUMN shared.users.email IS 'User email address (unique)';

COMMIT;
```

### 3.4 Data Types and Standards

#### 3.4.1 Standard Column Types
```sql
-- Standardized column definitions
id              UUID PRIMARY KEY DEFAULT uuid_generate_v4()
created_at      TIMESTAMPTZ DEFAULT NOW() NOT NULL
updated_at      TIMESTAMPTZ DEFAULT NOW() NOT NULL
deleted_at      TIMESTAMPTZ NULL                    -- Soft delete
version         INTEGER DEFAULT 1 NOT NULL          -- Optimistic locking
created_by      UUID REFERENCES shared.users(id)
updated_by      UUID REFERENCES shared.users(id)

-- JSON storage
metadata        JSONB DEFAULT '{}'::jsonb
settings        JSONB DEFAULT '{}'::jsonb

-- Enums for controlled values
CREATE TYPE user_role AS ENUM ('user', 'premium', 'admin', 'brand');
CREATE TYPE design_status AS ENUM ('draft', 'published', 'archived');
```

#### 3.4.2 Naming Conventions
```yaml
Tables:
  - Plural nouns (users, avatars, designs)
  - Snake_case (user_profiles, design_versions)
  - Prefix with schema when ambiguous

Columns:
  - Snake_case (first_name, created_at)
  - Avoid reserved words
  - Boolean prefix: is_, has_, can_ (is_active, has_premium)
  - Foreign keys: {table}_id (user_id, avatar_id)

Indexes:
  - idx_{table}_{columns} (idx_users_email)
  - uidx_{table}_{columns} for unique (uidx_users_email)
  - fk_{table}_{foreign_table} for foreign keys

Constraints:
  - pk_{table} for primary keys
  - fk_{table}_{foreign_table}_{column} for foreign keys
  - chk_{table}_{column} for check constraints
  - unq_{table}_{columns} for unique constraints
```

### 3.5 Indexing Strategy

#### 3.5.1 Index Types and Usage
```sql
-- B-tree indexes (default, most common)
CREATE INDEX idx_users_email ON shared.users(email);

-- Partial indexes (for filtered queries)
CREATE INDEX idx_active_users ON shared.users(email)
WHERE deleted_at IS NULL;

-- Multi-column indexes (order matters)
CREATE INDEX idx_designs_user_status ON design.designs(user_id, status, created_at);

-- GIN indexes (for JSONB, arrays, full-text)
CREATE INDEX idx_designs_metadata ON design.designs USING GIN(metadata);
CREATE INDEX idx_designs_tags ON design.designs USING GIN(tags);

-- GiST indexes (for geometric, range types)
CREATE INDEX idx_catalog_tsrange ON catalog.items USING GIST(availability_range);

-- Hash indexes (equality only, use sparingly)
CREATE INDEX idx_users_hash ON shared.users USING HASH(id);

-- Unique indexes
CREATE UNIQUE INDEX uidx_users_email ON shared.users(LOWER(email));
```

#### 3.5.2 Index Maintenance
```typescript
// Required monitoring and maintenance
interface IndexMaintenance {
  monitoring: {
    - 'Index usage statistics',
    - 'Index bloat detection',
    - 'Unused index identification',
    - 'Missing index suggestions'
  },

  maintenance: {
    - 'REINDEX operations (scheduled)',
    - 'VACUUM ANALYZE (automatic)',
    - 'Index rebuild for fragmentation',
    - 'Statistics update'
  },

  performance: {
    - 'Query plan analysis',
    - 'Index selectivity checks',
    - 'Cardinality monitoring',
    - 'Index size tracking'
  }
}
```

### 3.6 Query Optimization

#### 3.6.1 Query Performance Standards
```yaml
Performance Targets:
  Simple queries: < 50ms
  Complex queries: < 200ms
  Aggregations: < 500ms
  Reports: < 2s

Optimization Requirements:
  - All queries must use EXPLAIN ANALYZE in development
  - No full table scans on large tables (> 10K rows)
  - Maximum query timeout: 30s
  - Connection timeout: 5s
  - Statement timeout configured per environment
```

#### 3.6.2 Query Best Practices
```sql
-- Always use prepared statements
PREPARE get_user (UUID) AS
  SELECT id, email, created_at
  FROM shared.users
  WHERE id = $1 AND deleted_at IS NULL;

-- Use CTEs for readability
WITH active_designs AS (
  SELECT id, user_id, name
  FROM design.designs
  WHERE status = 'published'
    AND deleted_at IS NULL
),
user_stats AS (
  SELECT user_id, COUNT(*) as design_count
  FROM active_designs
  GROUP BY user_id
)
SELECT u.id, u.email, COALESCE(us.design_count, 0) as designs
FROM shared.users u
LEFT JOIN user_stats us ON u.id = us.user_id;

-- Avoid N+1 queries - use JOINs or batching
-- Bad: Multiple queries in loop
-- Good: Single query with JOIN or IN clause
SELECT d.*, u.email
FROM design.designs d
INNER JOIN shared.users u ON d.user_id = u.id
WHERE d.id = ANY($1::uuid[]);
```

### 3.7 Transactions and Isolation

#### 3.7.1 Transaction Management
```typescript
// Transaction wrapper interface
interface TransactionOptions {
  isolationLevel: 'READ UNCOMMITTED' | 'READ COMMITTED' | 'REPEATABLE READ' | 'SERIALIZABLE';
  timeout?: number;
  retries?: number;
  retryDelay?: number;
}

// Default transaction settings
const defaultTxOptions: TransactionOptions = {
  isolationLevel: 'READ COMMITTED',
  timeout: 30000,  // 30 seconds
  retries: 3,
  retryDelay: 100
};

// Transaction usage pattern
async function performTransaction<T>(
  callback: (client: PoolClient) => Promise<T>,
  options?: TransactionOptions
): Promise<T> {
  // Implementation required:
  // 1. Acquire connection from pool
  // 2. BEGIN transaction with isolation level
  // 3. Execute callback
  // 4. COMMIT on success
  // 5. ROLLBACK on error
  // 6. Release connection
  // 7. Handle deadlock retries
}
```

#### 3.7.2 Deadlock Prevention
```sql
-- Always acquire locks in consistent order
-- Good: Always lock users before designs
BEGIN;
SELECT * FROM shared.users WHERE id = $1 FOR UPDATE;
SELECT * FROM design.designs WHERE user_id = $1 FOR UPDATE;
-- ... perform operations
COMMIT;

-- Use lock timeouts
SET lock_timeout = '5s';

-- Monitor for deadlocks
-- Required: Deadlock detection and logging
```

### 3.8 Data Integrity

#### 3.8.1 Constraints
```sql
-- Primary keys (required on all tables)
ALTER TABLE shared.users ADD CONSTRAINT pk_users PRIMARY KEY (id);

-- Foreign keys with proper cascade
ALTER TABLE design.designs
  ADD CONSTRAINT fk_designs_user
  FOREIGN KEY (user_id)
  REFERENCES shared.users(id)
  ON DELETE CASCADE
  ON UPDATE CASCADE;

-- Check constraints
ALTER TABLE shared.users
  ADD CONSTRAINT chk_users_email_format
  CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}$');

-- Unique constraints
ALTER TABLE shared.users
  ADD CONSTRAINT unq_users_email
  UNIQUE (email);

-- Not null constraints
ALTER TABLE shared.users
  ALTER COLUMN email SET NOT NULL,
  ALTER COLUMN created_at SET NOT NULL;
```

#### 3.8.2 Data Validation
```typescript
// Database-level validation requirements
interface ValidationRules {
  // Email validation
  email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,

  // UUID validation
  uuid: /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,

  // JSON validation (use CHECK with jsonb_typeof)
  jsonb: 'Valid JSONB structure',

  // Enum validation (use ENUM types)
  enums: 'Predefined enum values',

  // Range validation
  ranges: 'Min/max value checks'
}
```

### 3.9 Soft Delete Pattern

#### 3.9.1 Implementation
```sql
-- Soft delete column on all tables
ALTER TABLE shared.users ADD COLUMN deleted_at TIMESTAMPTZ NULL;
ALTER TABLE shared.users ADD COLUMN deleted_by UUID REFERENCES shared.users(id);

-- Soft delete function
CREATE OR REPLACE FUNCTION soft_delete(
  table_name TEXT,
  record_id UUID,
  deleted_by_user_id UUID
) RETURNS VOID AS $$
BEGIN
  EXECUTE format(
    'UPDATE %I SET deleted_at = NOW(), deleted_by = $1 WHERE id = $2',
    table_name
  ) USING deleted_by_user_id, record_id;
END;
$$ LANGUAGE plpgsql;

-- Active records view pattern
CREATE VIEW active_users AS
  SELECT * FROM shared.users WHERE deleted_at IS NULL;
```

### 3.10 Triggers and Functions

#### 3.10.1 Standard Triggers
```sql
-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_users_updated_at
  BEFORE UPDATE ON shared.users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Audit trail trigger
CREATE OR REPLACE FUNCTION audit_trail()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO audit.changes (
    table_name,
    record_id,
    operation,
    old_data,
    new_data,
    changed_by,
    changed_at
  ) VALUES (
    TG_TABLE_NAME,
    COALESCE(NEW.id, OLD.id),
    TG_OP,
    row_to_json(OLD),
    row_to_json(NEW),
    current_setting('app.current_user_id', true)::uuid,
    NOW()
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

---

## 4. MongoDB Infrastructure

### 4.1 Connection Management

#### 4.1.1 Connection Configuration
```typescript
interface MongoConfig {
  uri: string;
  options: {
    maxPoolSize: 100;
    minPoolSize: 10;
    maxIdleTimeMS: 30000;
    serverSelectionTimeoutMS: 5000;
    socketTimeoutMS: 45000;
    connectTimeoutMS: 10000;
    retryWrites: true;
    retryReads: true;
    w: 'majority';
    readPreference: 'primaryPreferred';
    readConcern: { level: 'majority' };
    writeConcern: { w: 'majority', j: true, wtimeout: 5000 };
  };
}
```

### 4.2 Database and Collection Structure

#### 4.2.1 Database Organization
```typescript
// Database structure
databases: {
  'fashion-wallet-main': {
    collections: [
      'designs',           // User design documents
      'avatars',          // 3D avatar data
      'catalog-items',    // Flexible catalog items
      'user-preferences', // User settings
      'sessions'          // Active sessions
    ]
  }
}

// Collection naming conventions
- Plural nouns (designs, avatars)
- Kebab-case for multi-word (catalog-items, user-preferences)
- No special characters except hyphens
```

#### 4.2.2 Document Schema Validation
```javascript
// Design collection schema
db.createCollection("designs", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["userId", "name", "status", "createdAt", "updatedAt"],
      properties: {
        _id: { bsonType: "objectId" },
        userId: { bsonType: "string", pattern: "^[0-9a-f-]{36}$" },
        name: { bsonType: "string", minLength: 1, maxLength: 255 },
        status: { enum: ["draft", "published", "archived"] },
        layers: { bsonType: "array" },
        metadata: { bsonType: "object" },
        version: { bsonType: "int", minimum: 1 },
        createdAt: { bsonType: "date" },
        updatedAt: { bsonType: "date" },
        deletedAt: { bsonType: ["date", "null"] }
      }
    }
  },
  validationLevel: "moderate",
  validationAction: "error"
});
```

### 4.3 Indexing Strategy

#### 4.3.1 Standard Indexes
```javascript
// Single field indexes
db.designs.createIndex({ userId: 1 });
db.designs.createIndex({ status: 1 });
db.designs.createIndex({ createdAt: -1 });

// Compound indexes
db.designs.createIndex({ userId: 1, status: 1, createdAt: -1 });

// Text indexes for search
db.designs.createIndex(
  { name: "text", "metadata.description": "text" },
  { weights: { name: 10, "metadata.description": 5 } }
);

// Sparse indexes (for optional fields)
db.designs.createIndex(
  { deletedAt: 1 },
  { sparse: true }
);

// TTL indexes (for auto-cleanup)
db.sessions.createIndex(
  { expiresAt: 1 },
  { expireAfterSeconds: 0 }
);

// Unique indexes
db.avatars.createIndex(
  { userId: 1, name: 1 },
  { unique: true, partialFilterExpression: { deletedAt: { $exists: false } } }
);
```

### 4.4 Document Design Patterns

#### 4.4.1 Embedding vs Referencing
```typescript
// Design document structure (embedded pattern)
interface DesignDocument {
  _id: ObjectId;
  userId: string;              // Reference to PostgreSQL user
  name: string;
  status: 'draft' | 'published' | 'archived';

  // Embedded layers (small, frequently accessed together)
  layers: Array<{
    id: string;
    type: 'silhouette' | 'fabric' | 'pattern';
    data: object;
    order: number;
  }>;

  // Embedded metadata
  metadata: {
    tags: string[];
    description: string;
    thumbnailUrl: string;
  };

  // Reference to large data
  avatarId: string;            // Reference to Avatar document
  catalogItemIds: string[];    // References to catalog items

  // Version control
  version: number;
  history: Array<{             // Embedded history (limited size)
    version: number;
    changedAt: Date;
    changedBy: string;
    changes: object;
  }>;

  // Standard fields
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}
```

### 4.5 Transactions

#### 4.5.1 Multi-Document Transactions
```typescript
// Transaction support required
interface MongoTransactionOptions {
  readConcern: { level: 'snapshot' | 'majority' };
  writeConcern: { w: 'majority', j: true };
  readPreference: 'primary';
  maxCommitTimeMS: 30000;
}

// Transaction usage pattern
async function performMongoTransaction<T>(
  callback: (session: ClientSession) => Promise<T>
): Promise<T> {
  const session = client.startSession();
  try {
    session.startTransaction(transactionOptions);
    const result = await callback(session);
    await session.commitTransaction();
    return result;
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    await session.endSession();
  }
}
```

---

## 5. Database Monitoring and Maintenance

### 5.1 Performance Monitoring

#### 5.1.1 PostgreSQL Monitoring
```yaml
Metrics to Monitor:
  Connection Metrics:
    - Active connections
    - Idle connections
    - Connection wait time
    - Connection errors

  Query Performance:
    - Slow query log (> 200ms)
    - Query execution plans
    - Index usage statistics
    - Cache hit ratio (> 95% target)

  Database Health:
    - Table bloat
    - Index bloat
    - Dead tuples
    - Transaction wraparound
    - Replication lag

  Resource Usage:
    - CPU utilization
    - Memory usage
    - Disk I/O
    - Disk space
```

#### 5.1.2 MongoDB Monitoring
```yaml
Metrics to Monitor:
  Connection Metrics:
    - Current connections
    - Available connections
    - Connection creation rate

  Operation Performance:
    - Operation latency
    - Read/write throughput
    - Index usage
    - Collection scan rate

  Database Health:
    - Replication lag
    - Oplog window
    - WiredTiger cache
    - Document validation errors

  Resource Usage:
    - Memory usage
    - Disk space
    - Network I/O
    - Page faults
```

### 5.2 Backup and Recovery

#### 5.2.1 Backup Strategy
```yaml
PostgreSQL Backups:
  Full Backup:
    Frequency: Daily
    Retention: 30 days
    Method: pg_dump with compression

  Incremental Backup:
    Frequency: Hourly
    Retention: 7 days
    Method: WAL archiving

  Point-in-Time Recovery:
    Enabled: Yes
    WAL retention: 7 days

MongoDB Backups:
  Full Backup:
    Frequency: Daily
    Retention: 30 days
    Method: mongodump with compression

  Oplog Backup:
    Frequency: Continuous
    Retention: 7 days

  Snapshot Backup:
    Frequency: Weekly
    Retention: 90 days
```

#### 5.2.2 Disaster Recovery
```yaml
Recovery Time Objective (RTO): 1 hour
Recovery Point Objective (RPO): 15 minutes

Requirements:
  - Automated backup verification
  - Regular restore testing (monthly)
  - Off-site backup storage
  - Encryption of backups
  - Backup monitoring and alerting
  - Documented recovery procedures
```

---

## 6. Security Requirements

### 6.1 Access Control

#### 6.1.1 Database Users and Roles
```sql
-- PostgreSQL roles
CREATE ROLE app_readonly;
CREATE ROLE app_readwrite;
CREATE ROLE app_admin;
CREATE ROLE migration_runner;

-- Service-specific users
CREATE USER avatar_service WITH PASSWORD 'strong_password';
CREATE USER catalog_service WITH PASSWORD 'strong_password';
CREATE USER design_service WITH PASSWORD 'strong_password';

GRANT app_readwrite TO avatar_service;
GRANT app_readwrite TO catalog_service;
GRANT app_readwrite TO design_service;
```

#### 6.1.2 Row-Level Security
```sql
-- Enable RLS on sensitive tables
ALTER TABLE shared.users ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own data
CREATE POLICY user_isolation ON shared.users
  FOR ALL
  USING (id = current_setting('app.current_user_id')::uuid);

-- Policy: Admins can see everything
CREATE POLICY admin_all_access ON shared.users
  FOR ALL
  TO app_admin
  USING (true);
```

### 6.2 Encryption

#### 6.2.1 Encryption Requirements
```yaml
Encryption at Rest:
  - Database files encrypted (AES-256)
  - Backup files encrypted
  - WAL files encrypted
  - Tablespace encryption

Encryption in Transit:
  - TLS 1.3 required
  - Certificate validation
  - Encrypted replication

Field-Level Encryption:
  - PII fields (email, phone, etc.)
  - Sensitive measurements
  - Payment information (if applicable)
  - Using pgcrypto for PostgreSQL
  - MongoDB encryption at field level
```

### 6.3 Audit Logging

#### 6.3.1 Audit Requirements
```sql
-- Audit table structure
CREATE TABLE audit.database_operations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  table_name VARCHAR(255) NOT NULL,
  operation VARCHAR(10) NOT NULL,
  record_id UUID,
  user_id UUID,
  ip_address INET,
  old_values JSONB,
  new_values JSONB,
  query TEXT,
  executed_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for queries
CREATE INDEX idx_audit_table_operation ON audit.database_operations(table_name, operation, executed_at);
CREATE INDEX idx_audit_user ON audit.database_operations(user_id, executed_at);
```

---

## 7. High Availability and Scalability

### 7.1 Replication

#### 7.1.1 PostgreSQL Replication
```yaml
Primary-Replica Setup:
  Primary: Write operations
  Replicas: Read operations (2+ replicas)
  Replication: Streaming replication
  Failover: Automatic with health checks
  Lag monitoring: < 1 second acceptable
```

#### 7.1.2 MongoDB Replica Set
```yaml
Replica Set Configuration:
  Primary: 1 node
  Secondary: 2+ nodes
  Arbiter: Optional (for odd number voting)
  Read Preference: primaryPreferred
  Write Concern: majority
  Election timeout: 10 seconds
```

### 7.2 Sharding (Future)

```yaml
MongoDB Sharding:
  Shard Key Selection:
    designs: { userId: 1, _id: 1 }
    avatars: { userId: 1 }

  Chunk Size: 64 MB
  Balancing: Automatic

PostgreSQL Partitioning:
  Time-based: audit logs, analytics
  Hash-based: user data (by user_id)
  List-based: regional data
```

---

## 8. Implementation Requirements

### 8.1 Database Module Structure

```typescript
// Required module exports
@Module({
  providers: [
    PostgresService,
    MongoService,
    DatabaseHealthService,
    MigrationService,
    ConnectionPoolService
  ],
  exports: [
    PostgresService,
    MongoService
  ]
})
export class DatabaseModule {}

// PostgreSQL Service interface
interface IPostgresService {
  getConnection(): Promise<PoolClient>;
  query<T>(sql: string, params?: any[]): Promise<T[]>;
  transaction<T>(callback: (client: PoolClient) => Promise<T>): Promise<T>;
  healthCheck(): Promise<boolean>;
}

// MongoDB Service interface
interface IMongoService {
  getDb(name?: string): Db;
  getCollection<T>(name: string): Collection<T>;
  transaction<T>(callback: (session: ClientSession) => Promise<T>): Promise<T>;
  healthCheck(): Promise<boolean>;
}
```

### 8.2 Configuration Management

```typescript
// Database configuration interface
interface DatabaseConfiguration {
  postgres: {
    primary: ConnectionConfig;
    replicas: ConnectionConfig[];
    poolConfig: PoolConfig;
    migrationConfig: MigrationConfig;
  };

  mongodb: {
    uri: string;
    options: MongoClientOptions;
    databases: string[];
  };

  monitoring: {
    enabled: boolean;
    slowQueryThreshold: number;
    healthCheckInterval: number;
  };
}
```

---

## 9. Testing Requirements

### 9.1 Unit Tests

```typescript
// Required test coverage
- Connection pool management
- Query execution
- Transaction handling
- Error handling
- Migration execution
- Backup/restore operations
```

### 9.2 Integration Tests

```typescript
// Required integration tests
- Database connectivity
- Schema validation
- Foreign key constraints
- Trigger execution
- Replication lag
- Failover scenarios
```

### 9.3 Performance Tests

```yaml
Performance Benchmarks:
  - Connection pool saturation
  - Concurrent query execution
  - Large dataset operations
  - Index effectiveness
  - Query plan optimization
```

---

## 10. Documentation Requirements

```yaml
Required Documentation:
  - ER diagrams for PostgreSQL schemas
  - Document structure for MongoDB collections
  - Migration guide
  - Backup/restore procedures
  - Troubleshooting guide
  - Performance tuning guide
  - Security hardening checklist
```

---

## 11. Success Criteria

```yaml
Acceptance Criteria:
  - All migrations run successfully
  - Connection pooling works correctly
  - Transactions maintain ACID properties
  - Replication lag < 1 second
  - Query performance meets targets
  - Backup/restore tested and verified
  - Security policies implemented
  - Monitoring dashboards configured
  - Documentation complete
```

---

## Document Metadata

**Version**: 1.0
**Author**: Fashion Wallet Infrastructure Team
**Status**: Draft
**Review Cycle**: Bi-weekly
**Next Review**: December 2025
**Dependencies**: None

---

**End of Database Infrastructure Specification**

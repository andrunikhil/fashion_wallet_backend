# Database Infrastructure

This module provides a comprehensive database infrastructure layer for Fashion Wallet, supporting both PostgreSQL and MongoDB databases.

## Features

- **Multi-Database Support**: PostgreSQL for relational data and MongoDB for document storage
- **Repository Pattern**: Clean abstraction over database operations
- **Migration System**: TypeORM migrations for PostgreSQL schema management
- **Health Checks**: Real-time database health monitoring
- **Connection Pooling**: Optimized connection management for both databases
- **Type Safety**: Full TypeScript support with proper typing

## Structure

```
src/infrastructure/database/
├── database.module.ts          # Main database module
├── entities/                   # PostgreSQL entities
│   ├── user.entity.ts
│   ├── avatar.entity.ts
│   └── catalog-item.entity.ts
├── schemas/                    # MongoDB schemas
│   └── design.schema.ts
├── repositories/               # Repository implementations
│   ├── base.repository.ts
│   ├── postgres.repository.ts
│   └── mongo.repository.ts
├── postgres/                   # PostgreSQL configuration
│   ├── postgres.config.ts
│   ├── postgres.service.ts
│   └── data-source.ts
├── mongodb/                    # MongoDB configuration
│   ├── mongodb.config.ts
│   └── mongodb.service.ts
├── migrations/                 # Database migrations
│   └── postgres/
├── health/                     # Health check services
│   ├── database-health.service.ts
│   └── database-health.controller.ts
└── interfaces/                 # TypeScript interfaces
    ├── repository.interface.ts
    └── database.interface.ts
```

## Quick Start

### 1. Environment Setup

Ensure you have the following environment variables set in your `.env` file:

```env
# PostgreSQL
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_DB=fashion_wallet

# MongoDB
MONGODB_URI=mongodb://localhost:27017/fashion_wallet
```

### 2. Start Local Databases

```bash
docker-compose up -d postgres mongodb
```

### 3. Run Migrations

```bash
npm run migration:run
```

### 4. Start the Application

```bash
npm run start:dev
```

## Using the Repository Pattern

### PostgreSQL Repository

```typescript
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PostgresRepository } from '@/infrastructure/database';
import { User } from '@/infrastructure/database';

@Injectable()
export class UserService {
  private userRepository: PostgresRepository<User>;

  constructor(
    @InjectRepository(User)
    private repository: Repository<User>,
  ) {
    this.userRepository = new PostgresRepository(repository);
  }

  async findUser(id: string): Promise<User | null> {
    return this.userRepository.findById(id);
  }

  async createUser(data: Partial<User>): Promise<User> {
    return this.userRepository.create(data);
  }

  async updateUser(id: string, data: Partial<User>): Promise<User> {
    return this.userRepository.update(id, data);
  }
}
```

### MongoDB Repository

```typescript
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { MongoRepository } from '@/infrastructure/database';
import { Design, DesignDocument } from '@/infrastructure/database';

@Injectable()
export class DesignService {
  private designRepository: MongoRepository<DesignDocument>;

  constructor(
    @InjectModel(Design.name)
    private model: Model<DesignDocument>,
  ) {
    this.designRepository = new MongoRepository(model);
  }

  async findDesign(id: string): Promise<DesignDocument | null> {
    return this.designRepository.findById(id);
  }

  async createDesign(data: Partial<Design>): Promise<DesignDocument> {
    return this.designRepository.create(data);
  }
}
```

## Migrations

### Create a New Migration

```bash
npm run migration:create src/infrastructure/database/migrations/postgres/MyMigration
```

### Generate Migration from Entity Changes

```bash
npm run migration:generate src/infrastructure/database/migrations/postgres/UpdateUserTable
```

### Run Migrations

```bash
npm run migration:run
```

### Revert Last Migration

```bash
npm run migration:revert
```

### Show Migration Status

```bash
npm run migration:show
```

## Health Checks

The database infrastructure provides health check endpoints:

- `GET /health` - Overall health status
- `GET /health/database` - Detailed database health information

### Response Example

```json
{
  "status": "healthy",
  "timestamp": "2025-11-17T10:30:00.000Z",
  "checks": {
    "postgres": {
      "healthy": true,
      "responseTime": 5,
      "connections": {
        "total": 15,
        "active": 3,
        "idle": 12
      }
    },
    "mongodb": {
      "healthy": true,
      "responseTime": 3
    }
  }
}
```

## Database Schemas

### PostgreSQL Schemas

- `shared`: Shared resources (users, roles)
- `avatar`: Avatar-related tables
- `catalog`: Catalog items (silhouettes, fabrics, patterns)
- `design`: Design-related tables
- `audit`: Audit logging

### Entities

#### User Entity
- Schema: `shared.users`
- Primary key: UUID
- Soft delete support
- Audit fields (created_at, updated_at, created_by, updated_by)

#### Avatar Entity
- Schema: `avatar.avatars`
- User-specific avatars with measurements
- 3D model URL storage

#### CatalogItem Entity
- Schema: `catalog.catalog_items`
- Types: silhouette, fabric, pattern
- Premium content support

### MongoDB Collections

#### Design Collection
- Document-based design storage
- Flexible layer system
- Status management (draft, published, archived)
- Full-text search on name and description

## Production Configuration

For production deployments:

1. Set `synchronize: false` in TypeORM config (already configured)
2. Use environment-specific configurations
3. Enable SSL for database connections
4. Configure proper connection pooling
5. Set up monitoring and alerts

## Testing

The database infrastructure includes comprehensive test coverage:

```bash
# Run unit tests
npm run test

# Run e2e tests
npm run test:e2e

# Run tests with coverage
npm run test:cov
```

## Troubleshooting

### Connection Issues

1. Verify database containers are running:
   ```bash
   docker-compose ps
   ```

2. Check database logs:
   ```bash
   docker-compose logs postgres
   docker-compose logs mongodb
   ```

3. Test connection manually:
   ```bash
   psql -h localhost -U postgres -d fashion_wallet
   mongosh mongodb://localhost:27017/fashion_wallet
   ```

### Migration Issues

1. Check migration status:
   ```bash
   npm run migration:show
   ```

2. If migrations are stuck, you can manually revert in PostgreSQL:
   ```sql
   DELETE FROM migrations WHERE timestamp = '<migration_timestamp>';
   ```

## Support

For issues or questions, please check:
- Application logs
- Database logs
- Health check endpoints

## License

ISC

# Fashion Wallet Backend

Outfit Designer Platform Backend - A modular monolith architecture for managing avatars, catalog, and design services.

## Architecture

This project follows a **Modular Monolith** architecture with service-oriented design, consisting of three main modules:

- **Avatar Module**: Body measurements, 3D avatar generation, photo processing
- **Catalog Module**: Silhouettes, fabrics, patterns, and search functionality
- **Design Module**: User designs, real-time collaboration, exports

## Tech Stack

### Core Technologies
- **Runtime**: Node.js 20+
- **Framework**: NestJS
- **Language**: TypeScript
- **Databases**:
  - PostgreSQL (primary relational data)
  - MongoDB (documents and flexible schemas)
  - Redis (cache and queues)
- **Storage**: MinIO/S3 compatible object storage
- **Search**: Elasticsearch

### Supporting Libraries
- TypeORM (PostgreSQL ORM)
- Mongoose (MongoDB ODM)
- IORedis (Redis client)
- Passport.js & JWT (Authentication)
- Class Validator & Class Transformer (Validation)

## Prerequisites

- Node.js 20.x or higher
- Docker & Docker Compose (for local development)
- npm or yarn

## Installation

1. **Clone the repository**
```bash
git clone <repository-url>
cd fashion_wallet_backend
```

2. **Install dependencies**
```bash
npm install
```

3. **Configure environment variables**
```bash
cp .env.example .env
# Edit .env with your configuration
```

4. **Start infrastructure services with Docker Compose**
```bash
docker-compose up -d postgres mongodb redis minio elasticsearch
```

## Running the Application

### Development Mode
```bash
npm run start:dev
```

### Production Mode
```bash
npm run build
npm run start:prod
```

### With Docker Compose (Full Stack)
```bash
docker-compose up
```

## API Endpoints

Base URL: `http://localhost:3000/api/v1`

### Health & Info
- `GET /health` - Health check
- `GET /` - API information

### Avatar Module
- `GET /avatars` - List all avatars
- `POST /avatars` - Create new avatar
- `GET /avatars/:id` - Get specific avatar
- `PUT /avatars/:id` - Update avatar
- `DELETE /avatars/:id` - Delete avatar
- `POST /avatars/:id/process` - Process avatar photos

### Catalog Module
- `GET /catalog/silhouettes` - Get silhouettes
- `GET /catalog/fabrics` - Get fabrics
- `GET /catalog/patterns` - Get patterns
- `GET /catalog/search?q=query` - Search catalog
- `GET /catalog/recommendations` - Get recommendations

### Design Module
- `GET /designs` - List all designs
- `POST /designs` - Create new design
- `GET /designs/:id` - Get specific design
- `PUT /designs/:id` - Update design
- `DELETE /designs/:id` - Delete design
- `POST /designs/:id/fork` - Fork design
- `POST /designs/:id/export` - Export design

## Testing

```bash
# Unit tests
npm run test

# E2E tests
npm run test:e2e

# Test coverage
npm run test:cov

# Watch mode
npm run test:watch
```

## Code Quality

```bash
# Linting
npm run lint

# Formatting
npm run format
```

## Project Structure

```
fashion_wallet_backend/
├── src/
│   ├── config/                 # Configuration files
│   │   └── database.config.ts
│   ├── modules/
│   │   ├── avatar/            # Avatar module
│   │   │   ├── controllers/
│   │   │   ├── services/
│   │   │   ├── entities/
│   │   │   ├── dto/
│   │   │   └── interfaces/
│   │   ├── catalog/           # Catalog module
│   │   │   ├── controllers/
│   │   │   ├── services/
│   │   │   ├── entities/
│   │   │   ├── dto/
│   │   │   └── interfaces/
│   │   └── design/            # Design module
│   │       ├── controllers/
│   │       ├── services/
│   │       ├── entities/
│   │       ├── dto/
│   │       └── interfaces/
│   ├── shared/                # Shared utilities
│   │   ├── guards/
│   │   ├── decorators/
│   │   ├── filters/
│   │   ├── interceptors/
│   │   ├── pipes/
│   │   └── services/
│   ├── app.module.ts          # Root module
│   ├── app.controller.ts      # Root controller
│   ├── app.service.ts         # Root service
│   └── main.ts                # Application entry point
├── test/                      # E2E tests
├── docker-compose.yml         # Docker Compose configuration
├── Dockerfile                 # Docker configuration
├── .env.example              # Environment variables template
└── README.md                 # This file
```

## Docker Services

The `docker-compose.yml` includes:

- **PostgreSQL** (port 5432): Primary relational database
- **MongoDB** (port 27017): Document database
- **Redis** (port 6379): Cache and message queue
- **MinIO** (ports 9000, 9001): S3-compatible object storage
- **Elasticsearch** (port 9200): Search engine
- **Backend App** (port 3000): NestJS application

## Environment Variables

See [.env.example](.env.example) for all available environment variables.

Key variables:
- `NODE_ENV`: Environment (development/production)
- `PORT`: Application port
- `POSTGRES_*`: PostgreSQL connection settings
- `MONGODB_URI`: MongoDB connection string
- `REDIS_*`: Redis connection settings
- `S3_*`: Object storage settings
- `JWT_*`: JWT authentication settings

## Development Workflow

1. Make changes to the code
2. Tests run automatically (if using watch mode)
3. Lint and format code before committing
4. Build and test locally
5. Create pull request

## Future Enhancements

Based on the architecture document, the following features are planned:

- **Phase 1 (MVP)**: Core features with basic infrastructure
- **Phase 2 (Growth)**: Job queues, Elasticsearch integration, CDN
- **Phase 3 (Scale)**: Kubernetes, multi-region, real-time collaboration
- **Phase 4 (Enterprise)**: Microservices migration, event sourcing, CQRS

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

ISC

## Support

For issues and questions, please create an issue in the repository.

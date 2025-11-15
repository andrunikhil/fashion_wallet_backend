# Quick Start Guide

This guide will help you get the Fashion Wallet Backend up and running quickly.

## Option 1: Development with Docker (Recommended)

### Start all services
```bash
docker-compose up
```

This will start:
- PostgreSQL on port 5432
- MongoDB on port 27017
- Redis on port 6379
- MinIO on ports 9000 (API) and 9001 (Console)
- Elasticsearch on port 9200
- Backend API on port 3000

### Access the services

- **API**: http://localhost:3000/api/v1
- **API Health**: http://localhost:3000/api/v1/health
- **MinIO Console**: http://localhost:9001 (credentials: minioadmin/minioadmin)

### Stop all services
```bash
docker-compose down
```

### Stop and remove volumes
```bash
docker-compose down -v
```

## Option 2: Local Development (Without Docker)

### Prerequisites
Install and run these services locally:
- PostgreSQL 16
- MongoDB 7
- Redis 7

### Install dependencies
```bash
npm install
```

### Configure environment
```bash
cp .env.example .env
# Edit .env to match your local database settings
```

### Run in development mode
```bash
npm run start:dev
```

The API will be available at http://localhost:3000/api/v1

## Testing the API

### Health Check
```bash
curl http://localhost:3000/api/v1/health
```

Expected response:
```json
{
  "status": "ok",
  "timestamp": "2025-01-15T...",
  "uptime": 123.456,
  "environment": "development"
}
```

### API Info
```bash
curl http://localhost:3000/api/v1
```

### Avatar Endpoints
```bash
# List avatars
curl http://localhost:3000/api/v1/avatars

# Create avatar
curl -X POST http://localhost:3000/api/v1/avatars \
  -H "Content-Type: application/json" \
  -d '{"name": "My Avatar"}'
```

### Catalog Endpoints
```bash
# Get silhouettes
curl http://localhost:3000/api/v1/catalog/silhouettes

# Search catalog
curl http://localhost:3000/api/v1/catalog/search?q=shirt
```

### Design Endpoints
```bash
# List designs
curl http://localhost:3000/api/v1/designs

# Create design
curl -X POST http://localhost:3000/api/v1/designs \
  -H "Content-Type: application/json" \
  -d '{"name": "My Design"}'
```

## Running Tests

```bash
# Unit tests
npm run test

# E2E tests
npm run test:e2e

# Coverage
npm run test:cov
```

## Common Issues

### Port Already in Use
If you get "port already in use" errors:
```bash
# Check what's using the port (example for port 3000)
lsof -i :3000

# Kill the process
kill -9 <PID>
```

### Database Connection Issues
- Ensure PostgreSQL is running: `pg_isready`
- Ensure MongoDB is running: `mongosh --eval "db.adminCommand('ping')"`
- Ensure Redis is running: `redis-cli ping`

### Docker Issues
```bash
# Restart Docker services
docker-compose restart

# View logs
docker-compose logs -f app

# Rebuild containers
docker-compose up --build
```

## Next Steps

1. **Add Authentication**: Implement JWT authentication in the auth module
2. **Database Entities**: Create TypeORM entities and Mongoose schemas
3. **File Upload**: Implement file upload for avatars and designs
4. **Real-time Features**: Add Socket.io for real-time collaboration
5. **Job Queues**: Set up Bull queues for background processing

## Useful Commands

```bash
# Generate a new module
nest g module modules/auth

# Generate a controller
nest g controller modules/auth/controllers/auth

# Generate a service
nest g service modules/auth/services/auth

# Generate a complete resource
nest g resource modules/auth
```

## Development Tips

1. **Watch Mode**: Use `npm run start:dev` for auto-reload
2. **Debugging**: Use VS Code debugger with the provided launch config
3. **Linting**: Run `npm run lint` before committing
4. **Formatting**: Run `npm run format` to auto-format code

## Documentation

- [Main README](./README.md)
- [Architecture Document](./core-services-techstack-architecture.md)
- [Features Document](./core-services-features.md)

## Support

If you encounter any issues:
1. Check the logs: `docker-compose logs -f`
2. Verify environment variables in `.env`
3. Ensure all services are running
4. Check the database connections

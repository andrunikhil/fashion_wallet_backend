import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule } from '@nestjs/config';
import * as request from 'supertest';
import { CatalogModule } from '../../catalog.module';
import { CatalogItemType } from '../../dto';

/**
 * Integration Tests for Catalog CRUD Operations
 *
 * These tests demonstrate how to test the full stack:
 * - HTTP requests through the controller
 * - Service layer business logic
 * - Repository layer database operations
 *
 * NOTE: These tests require actual database connections.
 * For CI/CD, you would use test databases or Docker containers.
 *
 * To run these tests:
 * 1. Ensure test databases are available (PostgreSQL + MongoDB)
 * 2. Configure test database connections in .env.test
 * 3. Run: npm test -- catalog-crud.integration.spec.ts
 */
describe('Catalog CRUD Integration Tests (e2e)', () => {
  let app: INestApplication;
  let createdItemId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        // Load test configuration
        ConfigModule.forRoot({
          envFilePath: '.env.test',
          isGlobal: true,
        }),
        // Connect to test databases
        TypeOrmModule.forRoot({
          type: 'postgres',
          host: process.env.TEST_DB_HOST || 'localhost',
          port: parseInt(process.env.TEST_DB_PORT || '5432'),
          username: process.env.TEST_DB_USER || 'test',
          password: process.env.TEST_DB_PASSWORD || 'test',
          database: process.env.TEST_DB_NAME || 'fashion_wallet_test',
          entities: ['src/**/*.entity.ts'],
          synchronize: true, // OK for tests
          dropSchema: true, // Clean slate for each test run
        }),
        MongooseModule.forRoot(
          process.env.TEST_MONGODB_URI || 'mongodb://localhost:27017/fashion_wallet_test',
        ),
        CatalogModule,
      ],
    }).compile();

    app = moduleFixture.createNestApplication();

    // Apply same pipes as production
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /catalog/items - Create Catalog Item', () => {
    it('should create a new silhouette successfully', async () => {
      const createDto = {
        type: CatalogItemType.SILHOUETTE,
        name: 'Test T-Shirt Silhouette',
        description: 'A classic t-shirt silhouette for testing',
        category: 'tops',
        subcategory: 'shirts',
        tags: ['casual', 'summer', 'test'],
        properties: {
          garmentType: 'shirt',
          fitType: 'regular',
          silhouetteStyle: 'classic',
          sizes: ['S', 'M', 'L', 'XL'],
        },
        isActive: true,
        isFeatured: false,
      };

      const response = await request(app.getHttpServer())
        .post('/catalog/items')
        .send(createDto)
        .expect(201);

      expect(response.body).toMatchObject({
        type: createDto.type,
        name: createDto.name,
        description: createDto.description,
        category: createDto.category,
      });
      expect(response.body.id).toBeDefined();
      expect(response.body.createdAt).toBeDefined();

      // Save ID for subsequent tests
      createdItemId = response.body.id;
    });

    it('should validate required fields', async () => {
      const invalidDto = {
        // Missing required 'type' and 'name'
        description: 'Invalid item',
      };

      await request(app.getHttpServer())
        .post('/catalog/items')
        .send(invalidDto)
        .expect(400);
    });

    it('should validate field constraints', async () => {
      const invalidDto = {
        type: CatalogItemType.FABRIC,
        name: 'AB', // Too short (min 3 chars)
        description: 'Test',
      };

      await request(app.getHttpServer())
        .post('/catalog/items')
        .send(invalidDto)
        .expect(400);
    });

    it('should reject duplicate names for same type', async () => {
      const createDto = {
        type: CatalogItemType.SILHOUETTE,
        name: 'Test T-Shirt Silhouette', // Duplicate from first test
        description: 'Another description',
      };

      await request(app.getHttpServer())
        .post('/catalog/items')
        .send(createDto)
        .expect(409); // Conflict
    });
  });

  describe('GET /catalog/items/:id - Get Catalog Item', () => {
    it('should retrieve created catalog item', async () => {
      const response = await request(app.getHttpServer())
        .get(`/catalog/items/${createdItemId}`)
        .expect(200);

      expect(response.body).toMatchObject({
        id: createdItemId,
        name: 'Test T-Shirt Silhouette',
        type: CatalogItemType.SILHOUETTE,
      });
    });

    it('should return 404 for non-existent item', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';

      await request(app.getHttpServer())
        .get(`/catalog/items/${fakeId}`)
        .expect(404);
    });

    it('should return 400 for invalid UUID format', async () => {
      await request(app.getHttpServer())
        .get('/catalog/items/invalid-uuid')
        .expect(400);
    });
  });

  describe('GET /catalog/items - List Catalog Items', () => {
    it('should list catalog items with pagination', async () => {
      const response = await request(app.getHttpServer())
        .get('/catalog/items')
        .query({ page: 1, limit: 10 })
        .expect(200);

      expect(response.body).toHaveProperty('items');
      expect(response.body).toHaveProperty('pagination');
      expect(response.body.pagination).toMatchObject({
        page: 1,
        limit: 10,
      });
      expect(Array.isArray(response.body.items)).toBe(true);
    });

    it('should filter by type', async () => {
      const response = await request(app.getHttpServer())
        .get('/catalog/items')
        .query({ type: CatalogItemType.SILHOUETTE })
        .expect(200);

      expect(response.body.items.every(
        item => item.type === CatalogItemType.SILHOUETTE
      )).toBe(true);
    });

    it('should filter by category', async () => {
      const response = await request(app.getHttpServer())
        .get('/catalog/items')
        .query({ category: 'tops' })
        .expect(200);

      expect(response.body.items.every(
        item => item.category === 'tops'
      )).toBe(true);
    });

    it('should filter by active status', async () => {
      const response = await request(app.getHttpServer())
        .get('/catalog/items')
        .query({ isActive: true })
        .expect(200);

      expect(response.body.items.every(
        item => item.isActive === true
      )).toBe(true);
    });
  });

  describe('PUT /catalog/items/:id - Update Catalog Item', () => {
    it('should update catalog item', async () => {
      const updateDto = {
        description: 'Updated description for testing',
        isFeatured: true,
        tags: ['casual', 'summer', 'test', 'updated'],
      };

      const response = await request(app.getHttpServer())
        .put(`/catalog/items/${createdItemId}`)
        .send(updateDto)
        .expect(200);

      expect(response.body).toMatchObject({
        id: createdItemId,
        description: updateDto.description,
        isFeatured: updateDto.isFeatured,
      });
      expect(response.body.tags).toEqual(updateDto.tags);
    });

    it('should not allow changing type', async () => {
      const updateDto = {
        type: CatalogItemType.FABRIC, // Attempting to change type
      };

      // This should be filtered out by UpdateCatalogItemDto (OmitType)
      const response = await request(app.getHttpServer())
        .put(`/catalog/items/${createdItemId}`)
        .send(updateDto)
        .expect(200);

      // Type should remain unchanged
      expect(response.body.type).toBe(CatalogItemType.SILHOUETTE);
    });

    it('should return 404 for non-existent item', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';

      await request(app.getHttpServer())
        .put(`/catalog/items/${fakeId}`)
        .send({ description: 'Test' })
        .expect(404);
    });
  });

  describe('DELETE /catalog/items/:id - Delete Catalog Item', () => {
    it('should soft delete catalog item', async () => {
      await request(app.getHttpServer())
        .delete(`/catalog/items/${createdItemId}`)
        .expect(204);

      // Verify item is deleted (404 on get)
      await request(app.getHttpServer())
        .get(`/catalog/items/${createdItemId}`)
        .expect(404);
    });

    it('should return 404 when deleting already deleted item', async () => {
      await request(app.getHttpServer())
        .delete(`/catalog/items/${createdItemId}`)
        .expect(404);
    });
  });

  describe('GET /catalog/silhouettes - Type-Specific Endpoints', () => {
    it('should list silhouettes only', async () => {
      const response = await request(app.getHttpServer())
        .get('/catalog/silhouettes')
        .expect(200);

      expect(response.body.items.every(
        item => item.type === CatalogItemType.SILHOUETTE
      )).toBe(true);
    });
  });

  describe('Cache Behavior', () => {
    let testItemId: string;

    beforeAll(async () => {
      // Create an item for cache testing
      const response = await request(app.getHttpServer())
        .post('/catalog/items')
        .send({
          type: CatalogItemType.FABRIC,
          name: 'Cache Test Fabric',
          description: 'For cache testing',
        });

      testItemId = response.body.id;
    });

    it('should return same data on subsequent requests (cache hit)', async () => {
      // First request - cache miss
      const response1 = await request(app.getHttpServer())
        .get(`/catalog/items/${testItemId}`)
        .expect(200);

      // Second request - should be cache hit (faster)
      const startTime = Date.now();
      const response2 = await request(app.getHttpServer())
        .get(`/catalog/items/${testItemId}`)
        .expect(200);
      const duration = Date.now() - startTime;

      expect(response2.body).toEqual(response1.body);
      // Cache hit should be fast (<50ms typically)
      expect(duration).toBeLessThan(100);
    });

    it('should invalidate cache on update', async () => {
      // Get item (cache it)
      const response1 = await request(app.getHttpServer())
        .get(`/catalog/items/${testItemId}`)
        .expect(200);

      // Update item (invalidate cache)
      await request(app.getHttpServer())
        .put(`/catalog/items/${testItemId}`)
        .send({ description: 'Cache invalidated' })
        .expect(200);

      // Get item again (should be fresh from DB)
      const response2 = await request(app.getHttpServer())
        .get(`/catalog/items/${testItemId}`)
        .expect(200);

      expect(response2.body.description).toBe('Cache invalidated');
      expect(response2.body.description).not.toBe(response1.body.description);
    });
  });
});

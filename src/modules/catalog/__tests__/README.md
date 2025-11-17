# Catalog Module Tests

This directory contains comprehensive tests for the Catalog Service Phase 2 implementation.

## Test Structure

```
__tests__/
├── integration/                          # Integration/E2E tests
│   └── catalog-crud.integration.spec.ts # Full stack CRUD tests
└── README.md                             # This file

services/__tests__/                       # Unit tests
├── catalog-management.service.spec.ts    # CatalogManagementService tests
├── collection.service.spec.ts            # CollectionService tests
└── brand-partner.service.spec.ts         # BrandPartnerService tests
```

## Test Types

### Unit Tests
Located in `services/__tests__/`

**Purpose**: Test individual services in isolation
**Dependencies**: Mocked repositories and external services
**Speed**: Fast (<1ms per test)
**Coverage**: Business logic, validation, error handling, caching

**Services Tested**:
- `CatalogManagementService` - 10+ test cases
- `CollectionService` - 25+ test cases
- `BrandPartnerService` - 20+ test cases

**Run Unit Tests**:
```bash
# Run all unit tests
npm test -- --testPathPattern=services/__tests__

# Run specific service tests
npm test -- catalog-management.service.spec.ts
npm test -- collection.service.spec.ts
npm test -- brand-partner.service.spec.ts

# Run with coverage
npm test -- --coverage --testPathPattern=services/__tests__
```

### Integration Tests
Located in `__tests__/integration/`

**Purpose**: Test full request-response cycle
**Dependencies**: Real database connections (test databases)
**Speed**: Slower (~100-500ms per test)
**Coverage**: HTTP layer, validation pipes, database operations, caching

**Tests Include**:
- CRUD operations through HTTP
- Request validation
- Database persistence
- Cache behavior
- Error responses

**Setup Integration Tests**:

1. **Create Test Database Config** (`.env.test`):
```env
TEST_DB_HOST=localhost
TEST_DB_PORT=5432
TEST_DB_USER=test_user
TEST_DB_PASSWORD=test_password
TEST_DB_NAME=fashion_wallet_test
TEST_MONGODB_URI=mongodb://localhost:27017/fashion_wallet_test
```

2. **Start Test Databases**:
```bash
# PostgreSQL (Docker)
docker run -d --name test-postgres \
  -e POSTGRES_USER=test_user \
  -e POSTGRES_PASSWORD=test_password \
  -e POSTGRES_DB=fashion_wallet_test \
  -p 5432:5432 \
  postgres:15

# MongoDB (Docker)
docker run -d --name test-mongo \
  -p 27017:27017 \
  mongo:7
```

3. **Run Integration Tests**:
```bash
# Run all integration tests
npm test -- --testPathPattern=integration

# Run specific integration test
npm test -- catalog-crud.integration.spec.ts

# Run with verbose output
npm test -- --testPathPattern=integration --verbose
```

## Test Coverage Goals

| Component | Target | Current Status |
|-----------|--------|----------------|
| Services | 80%+ | ✅ 85%+ (estimated) |
| Controllers | 70%+ | ⚠️  Pending (integration tests cover endpoints) |
| DTOs | 100% | ✅ Covered via validation tests |
| Repositories | 60%+ | ⚠️  Covered indirectly via service tests |

**View Coverage Report**:
```bash
npm test -- --coverage --testPathPattern=catalog
open coverage/lcov-report/index.html
```

## Test Scenarios Covered

### CatalogManagementService ✅
- [x] Create catalog item successfully
- [x] Throw ConflictException on duplicate name
- [x] Rollback transaction on error
- [x] Get catalog item from repository
- [x] Return cached item on second call
- [x] Throw NotFoundException if item doesn't exist
- [x] Soft delete catalog item
- [x] List paginated items with filters
- [x] Extract search terms correctly
- [x] Update with cache invalidation

### CollectionService ✅
- [x] Create collection successfully
- [x] Throw ConflictException on duplicate name
- [x] Get collection with items
- [x] Update collection with validation
- [x] Delete collection (soft delete)
- [x] List paginated collections
- [x] Filter public collections
- [x] Add item to collection
- [x] Auto-increment order index
- [x] Throw error if item already in collection
- [x] Remove item from collection
- [x] Reorder collection items
- [x] Validate items exist before reordering
- [x] Get featured collections
- [x] Cache featured collections
- [x] Invalidate cache on updates

### BrandPartnerService ✅
- [x] Create brand partner successfully
- [x] Throw ConflictException on duplicate
- [x] Get brand partner by ID
- [x] Cache brand partner
- [x] Update brand partner
- [x] Clear cache after update
- [x] Delete brand partner (soft delete)
- [x] List paginated brand partners
- [x] Filter active partners only
- [x] Get active brand partners (cached)
- [x] Get brand's catalog items
- [x] Filter by partnership type
- [x] Cache by partnership type
- [x] Handle cache expiry

### Integration Tests ✅
- [x] Create item via HTTP POST
- [x] Validate request body
- [x] Reject invalid data (400)
- [x] Reject duplicates (409)
- [x] Get item via HTTP GET
- [x] Return 404 for missing items
- [x] List items with pagination
- [x] Filter by type, category, status
- [x] Update item via HTTP PUT
- [x] Prevent type changes
- [x] Delete item via HTTP DELETE
- [x] Verify soft delete
- [x] Test type-specific endpoints
- [x] Cache hit behavior
- [x] Cache invalidation on update

## Writing New Tests

### Unit Test Template
```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { MyService } from '../my.service';

describe('MyService', () => {
  let service: MyService;
  let mockRepository: jest.Mocked<MyRepository>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MyService,
        {
          provide: MyRepository,
          useValue: {
            findOne: jest.fn(),
            save: jest.fn(),
            // ... other mocked methods
          },
        },
      ],
    }).compile();

    service = module.get<MyService>(MyService);
    mockRepository = module.get(MyRepository);
    jest.clearAllMocks();
  });

  describe('myMethod', () => {
    it('should do something successfully', async () => {
      // Arrange
      mockRepository.findOne.mockResolvedValue({ id: '1' } as any);

      // Act
      const result = await service.myMethod('1');

      // Assert
      expect(result).toBeDefined();
      expect(mockRepository.findOne).toHaveBeenCalledWith({ id: '1' });
    });

    it('should throw error on failure', async () => {
      // Arrange
      mockRepository.findOne.mockRejectedValue(new Error('DB Error'));

      // Act & Assert
      await expect(service.myMethod('1')).rejects.toThrow('DB Error');
    });
  });
});
```

### Integration Test Template
```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { MyModule } from '../my.module';

describe('My Integration Tests (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [MyModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('/my-endpoint (GET)', async () => {
    const response = await request(app.getHttpServer())
      .get('/my-endpoint')
      .expect(200);

    expect(response.body).toBeDefined();
  });
});
```

## Best Practices

1. **AAA Pattern**: Arrange, Act, Assert
2. **One Assertion Focus**: Each test should focus on one behavior
3. **Clear Names**: Describe what the test does (`should throw error when...`)
4. **Mock External Dependencies**: Don't rely on external services
5. **Clean Up**: Use `beforeEach`/`afterEach` for setup/teardown
6. **Test Edge Cases**: Empty arrays, null values, invalid input
7. **Test Error Paths**: Don't just test happy paths
8. **Independent Tests**: Tests shouldn't depend on each other

## Troubleshooting

### Tests Failing Due to Database Connection
**Solution**: Ensure test databases are running
```bash
docker ps | grep test-postgres
docker ps | grep test-mongo
```

### Tests Timing Out
**Solution**: Increase Jest timeout
```typescript
jest.setTimeout(30000); // 30 seconds
```

### Mock Not Working
**Solution**: Ensure mock is properly typed and cleared
```typescript
const mockRepo = repository as jest.Mocked<typeof repository>;
jest.clearAllMocks(); // In beforeEach
```

### Coverage Not Generated
**Solution**: Run with --coverage flag
```bash
npm test -- --coverage
```

## CI/CD Integration

**GitHub Actions Example** (`.github/workflows/test.yml`):
```yaml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest

    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_USER: test_user
          POSTGRES_PASSWORD: test_password
          POSTGRES_DB: fashion_wallet_test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5432:5432

      mongodb:
        image: mongo:7
        ports:
          - 27017:27017

    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm test -- --coverage
      - uses: codecov/codecov-action@v3
        with:
          files: ./coverage/lcov.info
```

## Next Steps

- [ ] Add controller unit tests
- [ ] Add repository unit tests
- [ ] Increase coverage to 90%+
- [ ] Add E2E tests for all endpoints
- [ ] Add performance tests
- [ ] Add load tests
- [ ] Set up automated coverage reporting

## Resources

- [NestJS Testing Guide](https://docs.nestjs.com/fundamentals/testing)
- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Supertest Documentation](https://github.com/visionmedia/supertest)

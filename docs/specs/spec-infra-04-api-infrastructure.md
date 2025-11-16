# Infrastructure Specification: API Infrastructure

## Document Overview

**Version**: 1.0
**Last Updated**: November 2025
**Document Type**: Infrastructure Specification
**Status**: Draft
**Spec ID**: spec-infra-04

---

## 1. Executive Summary

This specification defines the API infrastructure for the Fashion Wallet backend. It covers RESTful API design, GraphQL implementation, API versioning, request/response formats, middleware, error handling, documentation, and monitoring. The API must be consistent, well-documented, performant, and developer-friendly.

---

## 2. API Architecture Overview

### 2.1 API Types

```yaml
REST API:
  Purpose: Primary API for CRUD operations
  Format: JSON
  Protocol: HTTP/HTTPS
  Versioning: URL-based (/api/v1/)

GraphQL API:
  Purpose: Flexible data fetching
  Format: GraphQL queries/mutations
  Protocol: HTTP/HTTPS
  Endpoint: /graphql

WebSocket API:
  Purpose: Real-time updates
  Protocol: WebSocket (Socket.io)
  Use Cases:
    - Live collaboration
    - Notifications
    - Processing status updates
```

---

## 3. REST API Design

### 3.1 URL Structure

#### 3.1.1 Resource Naming

```yaml
Base URL:
  Development: http://localhost:3000/api/v1
  Staging: https://api-staging.fashionwallet.com/v1
  Production: https://api.fashionwallet.com/v1

Resource Conventions:
  - Plural nouns for collections: /users, /avatars, /designs
  - Singular for single resource: /users/:id, /avatars/:id
  - Nested resources: /users/:userId/avatars
  - Actions as sub-resources: /designs/:id/export, /avatars/:id/process

Examples:
  GET    /api/v1/users
  GET    /api/v1/users/:id
  POST   /api/v1/users
  PUT    /api/v1/users/:id
  PATCH  /api/v1/users/:id
  DELETE /api/v1/users/:id

  GET    /api/v1/users/:userId/avatars
  POST   /api/v1/avatars
  GET    /api/v1/avatars/:id
  PUT    /api/v1/avatars/:id
  POST   /api/v1/avatars/:id/process

  GET    /api/v1/designs
  POST   /api/v1/designs
  GET    /api/v1/designs/:id
  PUT    /api/v1/designs/:id
  POST   /api/v1/designs/:id/export
  POST   /api/v1/designs/:id/fork

  GET    /api/v1/catalog/silhouettes
  GET    /api/v1/catalog/fabrics
  GET    /api/v1/catalog/patterns
  GET    /api/v1/catalog/search
```

#### 3.1.2 Query Parameters

```typescript
interface QueryParams {
  // Pagination
  page?: number;                  // Default: 1
  limit?: number;                 // Default: 20, Max: 100
  offset?: number;                // Alternative to page

  // Sorting
  sortBy?: string;                // Field name
  sortOrder?: 'asc' | 'desc';     // Default: asc

  // Filtering
  filter?: string;                // JSON filter object
  search?: string;                // Full-text search

  // Field selection
  fields?: string;                // Comma-separated field names

  // Inclusion
  include?: string;               // Related resources to include

  // Date range
  startDate?: string;             // ISO 8601
  endDate?: string;               // ISO 8601
}

// Examples:
// GET /api/v1/designs?page=2&limit=20&sortBy=createdAt&sortOrder=desc
// GET /api/v1/designs?filter={"status":"published"}&include=user,avatar
// GET /api/v1/catalog/silhouettes?search=dress&category=formal
```

### 3.2 HTTP Methods

```yaml
Method Usage:
  GET:
    Purpose: Retrieve resources
    Idempotent: Yes
    Safe: Yes
    Request Body: No
    Response: 200 OK, 404 Not Found

  POST:
    Purpose: Create new resource
    Idempotent: No
    Safe: No
    Request Body: Yes
    Response: 201 Created, 400 Bad Request

  PUT:
    Purpose: Update entire resource (replace)
    Idempotent: Yes
    Safe: No
    Request Body: Yes
    Response: 200 OK, 404 Not Found

  PATCH:
    Purpose: Partial update resource
    Idempotent: Yes
    Safe: No
    Request Body: Yes
    Response: 200 OK, 404 Not Found

  DELETE:
    Purpose: Delete resource
    Idempotent: Yes
    Safe: No
    Request Body: No
    Response: 204 No Content, 404 Not Found

  OPTIONS:
    Purpose: Get supported methods
    Idempotent: Yes
    Safe: Yes
    Request Body: No
    Response: 200 OK

  HEAD:
    Purpose: Get headers only (no body)
    Idempotent: Yes
    Safe: Yes
    Request Body: No
    Response: 200 OK
```

### 3.3 Request Format

#### 3.3.1 Request Headers

```typescript
interface RequestHeaders {
  // Required
  'Content-Type': 'application/json';

  // Authentication
  'Authorization'?: 'Bearer <token>';

  // API Key (alternative auth)
  'X-API-Key'?: string;

  // Request tracking
  'X-Request-ID'?: string;        // UUID for request tracing

  // Client info
  'User-Agent': string;
  'Accept': 'application/json';
  'Accept-Language'?: string;     // e.g., 'en-US'

  // Custom headers
  'X-Client-Version'?: string;    // Client app version
  'X-Device-ID'?: string;         // Device identifier
}
```

#### 3.3.2 Request Body

```typescript
// POST /api/v1/avatars
interface CreateAvatarRequest {
  name: string;
  photos: Array<{
    type: 'front' | 'side' | 'back';
    url: string;
  }>;
  measurements?: {
    height?: number;
    weight?: number;
    chest?: number;
    waist?: number;
    hips?: number;
  };
  settings?: {
    units: 'metric' | 'imperial';
    autoProcess: boolean;
  };
}

// PATCH /api/v1/users/:id
interface UpdateUserRequest {
  firstName?: string;
  lastName?: string;
  email?: string;
  preferences?: {
    notifications?: boolean;
    newsletter?: boolean;
    language?: string;
  };
}
```

### 3.4 Response Format

#### 3.4.1 Success Response

```typescript
interface SuccessResponse<T> {
  success: true;
  data: T;
  meta?: {
    requestId: string;
    timestamp: string;
    version: string;
  };

  // For paginated responses
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

// Example: GET /api/v1/designs
{
  "success": true,
  "data": [
    {
      "id": "123e4567-e89b-12d3-a456-426614174000",
      "name": "Summer Dress",
      "status": "published",
      "createdAt": "2025-11-15T10:00:00Z",
      "updatedAt": "2025-11-15T10:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 45,
    "totalPages": 3,
    "hasNext": true,
    "hasPrev": false
  },
  "meta": {
    "requestId": "req_abc123",
    "timestamp": "2025-11-15T10:00:00Z",
    "version": "1.0"
  }
}

// Example: POST /api/v1/avatars (201 Created)
{
  "success": true,
  "data": {
    "id": "avatar_123",
    "name": "My Avatar",
    "status": "processing",
    "createdAt": "2025-11-15T10:00:00Z"
  },
  "meta": {
    "requestId": "req_def456",
    "timestamp": "2025-11-15T10:00:00Z",
    "version": "1.0"
  }
}
```

#### 3.4.2 Error Response

```typescript
interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: any;
    stack?: string;              // Only in development
  };
  meta: {
    requestId: string;
    timestamp: string;
    version: string;
  };
}

// Example: 400 Bad Request
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input data",
    "details": {
      "email": ["Email is required", "Email must be valid"],
      "password": ["Password must be at least 8 characters"]
    }
  },
  "meta": {
    "requestId": "req_ghi789",
    "timestamp": "2025-11-15T10:00:00Z",
    "version": "1.0"
  }
}

// Example: 404 Not Found
{
  "success": false,
  "error": {
    "code": "NOT_FOUND",
    "message": "Design with id 'design_123' not found"
  },
  "meta": {
    "requestId": "req_jkl012",
    "timestamp": "2025-11-15T10:00:00Z",
    "version": "1.0"
  }
}

// Example: 500 Internal Server Error
{
  "success": false,
  "error": {
    "code": "INTERNAL_SERVER_ERROR",
    "message": "An unexpected error occurred"
  },
  "meta": {
    "requestId": "req_mno345",
    "timestamp": "2025-11-15T10:00:00Z",
    "version": "1.0"
  }
}
```

### 3.5 Status Codes

```yaml
Success Codes:
  200 OK: Successful GET, PUT, PATCH
  201 Created: Successful POST (resource created)
  204 No Content: Successful DELETE

Client Error Codes:
  400 Bad Request: Invalid input data
  401 Unauthorized: Authentication required/failed
  403 Forbidden: Insufficient permissions
  404 Not Found: Resource not found
  405 Method Not Allowed: HTTP method not supported
  409 Conflict: Resource conflict (duplicate)
  422 Unprocessable Entity: Validation failed
  429 Too Many Requests: Rate limit exceeded

Server Error Codes:
  500 Internal Server Error: Unexpected server error
  502 Bad Gateway: Upstream service error
  503 Service Unavailable: Service temporarily down
  504 Gateway Timeout: Upstream service timeout
```

---

## 4. API Middleware

### 4.1 Request Processing Pipeline

```typescript
/**
 * Middleware execution order
 */
const middlewareStack = [
  // 1. Request ID
  requestIdMiddleware,

  // 2. CORS
  corsMiddleware,

  // 3. Security headers
  helmetMiddleware,

  // 4. Request logging
  requestLoggingMiddleware,

  // 5. Body parsing
  bodyParserMiddleware,

  // 6. Compression
  compressionMiddleware,

  // 7. Rate limiting
  rateLimitMiddleware,

  // 8. Authentication
  authenticationMiddleware,

  // 9. Request validation
  validationMiddleware,

  // 10. Business logic (routes)
  routeHandlers,

  // 11. Error handling
  errorHandlingMiddleware,

  // 12. Response logging
  responseLoggingMiddleware
];
```

### 4.2 Middleware Implementations

#### 4.2.1 Request ID Middleware

```typescript
@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction): void {
    // Generate or use existing request ID
    const requestId = req.get('X-Request-ID') || uuidv4();

    // Attach to request
    req.id = requestId;

    // Add to response headers
    res.setHeader('X-Request-ID', requestId);

    next();
  }
}
```

#### 4.2.2 Request Logging Middleware

```typescript
@Injectable()
export class RequestLoggingMiddleware implements NestMiddleware {
  private logger = new Logger('HTTP');

  use(req: Request, res: Response, next: NextFunction): void {
    const startTime = Date.now();

    // Log incoming request
    this.logger.log({
      type: 'request',
      requestId: req.id,
      method: req.method,
      url: req.url,
      ip: req.ip,
      userAgent: req.get('user-agent')
    });

    // Log response on finish
    res.on('finish', () => {
      const duration = Date.now() - startTime;

      this.logger.log({
        type: 'response',
        requestId: req.id,
        method: req.method,
        url: req.url,
        statusCode: res.statusCode,
        duration: `${duration}ms`
      });
    });

    next();
  }
}
```

#### 4.2.3 Validation Middleware

```typescript
/**
 * Validate request using DTO
 */
export function ValidationPipe(dto: any) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await ValidationUtil.validate(dto, req.body);

      if (!result.valid) {
        throw new ValidationError('Invalid input data', {
          body: result.errors
        });
      }

      // Replace body with validated data
      req.body = result.data;

      next();
    } catch (error) {
      next(error);
    }
  };
}
```

### 4.3 Guards

#### 4.3.1 Authentication Guard

```typescript
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  canActivate(context: ExecutionContext): boolean | Promise<boolean> {
    return super.canActivate(context);
  }

  handleRequest(err: any, user: any, info: any): any {
    if (err || !user) {
      throw new UnauthorizedError('Invalid or expired token');
    }

    return user;
  }
}
```

#### 4.3.2 Permission Guard

```typescript
@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private authzService: AuthorizationService
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermissions = this.reflector.get<Permission[]>(
      'permissions',
      context.getHandler()
    );

    if (!requiredPermissions) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new UnauthorizedError();
    }

    for (const permission of requiredPermissions) {
      const hasPermission = await this.authzService.hasPermission({
        userId: user.id,
        permission
      });

      if (!hasPermission) {
        throw new ForbiddenError(
          `Missing required permission: ${permission}`
        );
      }
    }

    return true;
  }
}

// Usage decorator
export const RequirePermissions = (...permissions: Permission[]) =>
  SetMetadata('permissions', permissions);

// Controller usage
@Get(':id')
@RequirePermissions(Permission.DESIGN_READ_ANY)
async getDesign(@Param('id') id: string) {
  return this.designService.findOne(id);
}
```

---

## 5. API Versioning

### 5.1 Versioning Strategy

```typescript
/**
 * URL-based versioning (recommended)
 */
interface VersioningStrategy {
  type: 'url';
  prefix: 'v';
  defaultVersion: '1';

  routes: {
    '/api/v1/users': UserControllerV1,
    '/api/v2/users': UserControllerV2,
    '/api/v1/designs': DesignControllerV1
  };
}

// Version-specific controllers
@Controller('api/v1/users')
export class UserControllerV1 {
  // V1 implementation
}

@Controller('api/v2/users')
export class UserControllerV2 {
  // V2 implementation with breaking changes
}
```

### 5.2 Version Deprecation

```typescript
interface VersionDeprecation {
  version: string;
  deprecatedAt: Date;
  sunsetAt: Date;             // When version will be removed
  replacedBy: string;         // New version to use

  // Add deprecation headers
  headers: {
    'X-API-Deprecated': 'true',
    'X-API-Sunset-Date': '2026-01-01',
    'X-API-Replacement': 'v2',
    'Link': '<https://api.fashionwallet.com/v2/users>; rel="successor-version"'
  };
}

// Deprecation warning middleware
@Injectable()
export class DeprecationMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction): void {
    if (req.path.includes('/v1/')) {
      res.setHeader('X-API-Deprecated', 'true');
      res.setHeader('X-API-Sunset-Date', '2026-01-01');
      res.setHeader('X-API-Replacement', 'v2');

      logger.warn('Deprecated API version used', {
        version: 'v1',
        endpoint: req.path,
        userId: req.user?.id
      });
    }

    next();
  }
}
```

---

## 6. API Documentation

### 6.1 OpenAPI/Swagger

```typescript
/**
 * Swagger configuration
 */
const swaggerConfig = new DocumentBuilder()
  .setTitle('Fashion Wallet API')
  .setDescription('API documentation for Fashion Wallet backend')
  .setVersion('1.0')
  .addBearerAuth()
  .addApiKey({ type: 'apiKey', name: 'X-API-Key', in: 'header' })
  .addServer('https://api.fashionwallet.com/v1', 'Production')
  .addServer('https://api-staging.fashionwallet.com/v1', 'Staging')
  .addServer('http://localhost:3000/api/v1', 'Development')
  .addTag('Authentication', 'Auth endpoints')
  .addTag('Users', 'User management')
  .addTag('Avatars', 'Avatar creation and management')
  .addTag('Designs', 'Design creation and management')
  .addTag('Catalog', 'Catalog browsing')
  .build();

// Controller documentation
@ApiTags('Designs')
@Controller('api/v1/designs')
export class DesignController {
  @Get()
  @ApiOperation({ summary: 'List designs' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({
    status: 200,
    description: 'Designs retrieved successfully',
    type: [DesignDto]
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async listDesigns(
    @Query() query: ListDesignsDto
  ): Promise<PaginatedResponse<DesignDto>> {
    return this.designService.list(query);
  }

  @Post()
  @ApiOperation({ summary: 'Create design' })
  @ApiBody({ type: CreateDesignDto })
  @ApiResponse({
    status: 201,
    description: 'Design created successfully',
    type: DesignDto
  })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async createDesign(
    @Body() dto: CreateDesignDto
  ): Promise<DesignDto> {
    return this.designService.create(dto);
  }
}
```

### 6.2 API Examples

```typescript
/**
 * Include usage examples in documentation
 */
@ApiTags('Avatars')
export class AvatarController {
  @Post()
  @ApiOperation({
    summary: 'Create avatar from photos',
    description: `
      Upload photos and create a 3D avatar.
      The API will process the photos and extract body measurements.

      **Example Request:**
      \`\`\`json
      {
        "name": "My Avatar",
        "photos": [
          {
            "type": "front",
            "url": "https://storage.example.com/photo-front.jpg"
          },
          {
            "type": "side",
            "url": "https://storage.example.com/photo-side.jpg"
          }
        ],
        "settings": {
          "units": "metric",
          "autoProcess": true
        }
      }
      \`\`\`

      **Example Response:**
      \`\`\`json
      {
        "success": true,
        "data": {
          "id": "avatar_123",
          "name": "My Avatar",
          "status": "processing",
          "createdAt": "2025-11-15T10:00:00Z"
        }
      }
      \`\`\`
    `
  })
  async createAvatar(@Body() dto: CreateAvatarDto) {
    return this.avatarService.create(dto);
  }
}
```

---

## 7. Rate Limiting

### 7.1 Rate Limit Configuration

```typescript
interface RateLimitConfig {
  // Global rate limits
  global: {
    max: 1000,
    window: '15m'
  };

  // Per-endpoint limits
  endpoints: {
    'POST /api/v1/auth/login': {
      max: 5,
      window: '15m',
      skipSuccessfulRequests: false
    },
    'POST /api/v1/auth/register': {
      max: 3,
      window: '1h'
    },
    'POST /api/v1/designs/*/export': {
      max: 10,
      window: '1h'
    }
  };

  // Per-user tier limits
  tiers: {
    free: {
      max: 100,
      window: '15m'
    },
    premium: {
      max: 1000,
      window: '15m'
    },
    enterprise: {
      max: 10000,
      window: '15m'
    }
  };

  // Response headers
  headers: {
    limit: 'X-RateLimit-Limit',
    remaining: 'X-RateLimit-Remaining',
    reset: 'X-RateLimit-Reset'
  };
}
```

### 7.2 Rate Limit Response

```typescript
// When rate limit exceeded (429)
{
  "success": false,
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Too many requests. Please try again later.",
    "details": {
      "limit": 100,
      "remaining": 0,
      "reset": "2025-11-15T10:15:00Z",
      "retryAfter": 300
    }
  },
  "meta": {
    "requestId": "req_xyz789",
    "timestamp": "2025-11-15T10:00:00Z",
    "version": "1.0"
  }
}

// Response headers
{
  "X-RateLimit-Limit": "100",
  "X-RateLimit-Remaining": "0",
  "X-RateLimit-Reset": "1699876800",
  "Retry-After": "300"
}
```

---

## 8. API Monitoring

### 8.1 Metrics Collection

```typescript
interface APIMetrics {
  // Request metrics
  requestCount: number;
  requestRate: number;            // Requests per second

  // Response metrics
  successRate: number;            // Percentage
  errorRate: number;              // Percentage
  statusCodes: Record<number, number>;

  // Performance metrics
  avgResponseTime: number;        // Milliseconds
  p50ResponseTime: number;
  p95ResponseTime: number;
  p99ResponseTime: number;

  // Endpoint metrics
  endpointMetrics: Record<string, {
    count: number;
    avgDuration: number;
    errorRate: number;
  }>;

  // User metrics
  activeUsers: number;
  requestsByUser: Record<string, number>;

  // Error metrics
  errorsByType: Record<string, number>;
  topErrors: Array<{
    error: string;
    count: number;
  }>;
}
```

### 8.2 Health Check Endpoint

```typescript
@Controller('health')
export class HealthController {
  constructor(
    private healthService: HealthService
  ) {}

  @Get()
  @ApiOperation({ summary: 'Health check' })
  async healthCheck(): Promise<HealthResponse> {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: process.env.APP_VERSION,
      checks: {
        database: await this.healthService.checkDatabase(),
        redis: await this.healthService.checkRedis(),
        storage: await this.healthService.checkStorage()
      }
    };
  }

  @Get('ready')
  @ApiOperation({ summary: 'Readiness check' })
  async readinessCheck(): Promise<ReadinessResponse> {
    const checks = await this.healthService.performChecks();

    const allHealthy = Object.values(checks).every(c => c.healthy);

    return {
      ready: allHealthy,
      checks
    };
  }

  @Get('live')
  @ApiOperation({ summary: 'Liveness check' })
  async livenessCheck(): Promise<{ alive: boolean }> {
    return { alive: true };
  }
}
```

---

## 9. Implementation Requirements

### 9.1 Module Structure

```typescript
@Module({
  controllers: [
    UserController,
    AvatarController,
    DesignController,
    CatalogController,
    HealthController
  ],
  providers: [
    // Services
    UserService,
    AvatarService,
    DesignService,
    CatalogService,

    // Middleware
    RequestIdMiddleware,
    RequestLoggingMiddleware,

    // Guards
    JwtAuthGuard,
    PermissionGuard,
    RateLimitGuard
  ],
  imports: [
    // OpenAPI
    SwaggerModule,

    // Validation
    ClassValidatorModule,

    // Rate limiting
    ThrottlerModule.forRoot({
      ttl: 60,
      limit: 100
    })
  ]
})
export class ApiModule {}
```

---

## 10. Testing Requirements

```yaml
Unit Tests:
  - Request validation
  - Response formatting
  - Error handling
  - Middleware logic
  - Guard logic

Integration Tests:
  - Full request/response cycle
  - Authentication flow
  - Authorization checks
  - Rate limiting
  - CORS handling

E2E Tests:
  - Complete user journeys
  - Error scenarios
  - Edge cases
  - Performance under load
```

---

## 11. Success Criteria

```yaml
Acceptance Criteria:
  - All endpoints documented in Swagger
  - Response time < 200ms (p95)
  - Error rate < 1%
  - 100% test coverage for controllers
  - Rate limiting working correctly
  - Authentication enforced
  - CORS configured properly
  - Health checks operational
  - Monitoring dashboards created
```

---

## Document Metadata

**Version**: 1.0
**Author**: Fashion Wallet Infrastructure Team
**Status**: Draft
**Review Cycle**: Bi-weekly
**Next Review**: December 2025
**Dependencies**: spec-infra-02 (Authentication)

---

**End of API Infrastructure Specification**

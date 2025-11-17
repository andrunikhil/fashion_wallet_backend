# Architecture Document: API Infrastructure

## Document Overview

**Version**: 1.0
**Last Updated**: November 2025
**Document Type**: Architecture Document
**Status**: Draft
**Arch ID**: arch-infra-04
**Related Spec**: spec-infra-04

---

## 1. Executive Summary

This architecture document describes the REST API implementation for the Fashion Wallet backend, covering API design patterns, middleware stack, request/response handling, versioning, and documentation.

---

## 2. Architectural Overview

### 2.1 Request Processing Flow

```
Client Request
     ↓
┌────▼─────────────┐
│   API Gateway    │ (Optional: Future)
└────┬─────────────┘
     ↓
┌────▼─────────────┐
│ CORS Middleware  │
└────┬─────────────┘
     ↓
┌────▼─────────────┐
│ Request Logger   │
└────┬─────────────┘
     ↓
┌────▼─────────────┐
│ Rate Limiter     │
└────┬─────────────┘
     ↓
┌────▼─────────────┐
│ Authentication   │
└────┬─────────────┘
     ↓
┌────▼─────────────┐
│  Validation      │
└────┬─────────────┘
     ↓
┌────▼─────────────┐
│   Controller     │
└────┬─────────────┘
     ↓
┌────▼─────────────┐
│    Service       │
└────┬─────────────┘
     ↓
┌────▼─────────────┐
│   Repository     │
└────┬─────────────┘
     ↓
┌────▼─────────────┐
│   Database       │
└──────────────────┘
```

---

## 3. Module Structure

```
src/api/
├── v1/
│   ├── controllers/
│   │   ├── auth.controller.ts
│   │   ├── user.controller.ts
│   │   ├── avatar.controller.ts
│   │   ├── design.controller.ts
│   │   └── catalog.controller.ts
│   ├── dto/
│   │   ├── auth/
│   │   ├── user/
│   │   ├── avatar/
│   │   ├── design/
│   │   └── catalog/
│   ├── middleware/
│   │   ├── request-id.middleware.ts
│   │   ├── logging.middleware.ts
│   │   └── transform.middleware.ts
│   └── api-v1.module.ts
├── common/
│   ├── decorators/
│   │   ├── api-response.decorator.ts
│   │   ├── public.decorator.ts
│   │   └── current-user.decorator.ts
│   ├── filters/
│   │   ├── http-exception.filter.ts
│   │   └── validation-exception.filter.ts
│   ├── interceptors/
│   │   ├── transform.interceptor.ts
│   │   ├── timeout.interceptor.ts
│   │   └── cache.interceptor.ts
│   ├── pipes/
│   │   ├── validation.pipe.ts
│   │   └── parse-uuid.pipe.ts
│   └── guards/
│       ├── jwt-auth.guard.ts
│       ├── permission.guard.ts
│       └── rate-limit.guard.ts
└── api.module.ts
```

---

## 4. Controller Implementation

### 4.1 Base Controller Pattern

```typescript
/**
 * Base controller with common functionality
 */
export abstract class BaseController {
  protected logger: Logger;

  constructor(loggerContext: string) {
    this.logger = new Logger(loggerContext);
  }

  /**
   * Standard success response
   */
  protected success<T>(data: T, meta?: any): SuccessResponse<T> {
    return {
      success: true,
      data,
      meta: {
        ...meta,
        timestamp: new Date().toISOString(),
        version: '1.0'
      }
    };
  }

  /**
   * Paginated response
   */
  protected paginated<T>(
    data: T[],
    pagination: PaginationMeta
  ): PaginatedResponse<T> {
    return {
      success: true,
      data,
      pagination: {
        page: pagination.page,
        limit: pagination.limit,
        total: pagination.total,
        totalPages: Math.ceil(pagination.total / pagination.limit),
        hasNext: pagination.page < Math.ceil(pagination.total / pagination.limit),
        hasPrev: pagination.page > 1
      },
      meta: {
        timestamp: new Date().toISOString(),
        version: '1.0'
      }
    };
  }
}
```

### 4.2 Example Controller

```typescript
/**
 * Design controller
 */
@ApiTags('Designs')
@Controller('api/v1/designs')
@UseGuards(JwtAuthGuard)
export class DesignController extends BaseController {
  constructor(private designService: DesignService) {
    super('DesignController');
  }

  /**
   * List user designs
   */
  @Get()
  @ApiOperation({ summary: 'List designs' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({
    status: 200,
    description: 'Designs retrieved successfully',
    type: PaginatedDesignResponseDto
  })
  async listDesigns(
    @CurrentUser() user: User,
    @Query() query: ListDesignsDto
  ): Promise<PaginatedResponse<DesignDto>> {
    this.logger.log(`Listing designs for user ${user.id}`);

    const { designs, total } = await this.designService.findByUser(
      user.id,
      query
    );

    return this.paginated(designs, {
      page: query.page || 1,
      limit: query.limit || 20,
      total
    });
  }

  /**
   * Get single design
   */
  @Get(':id')
  @UseGuards(PermissionGuard)
  @RequirePermissions(Permission.DESIGN_READ_OWN)
  @ApiOperation({ summary: 'Get design by ID' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({
    status: 200,
    description: 'Design retrieved successfully',
    type: DesignResponseDto
  })
  @ApiResponse({ status: 404, description: 'Design not found' })
  async getDesign(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User
  ): Promise<SuccessResponse<DesignDto>> {
    const design = await this.designService.findOne(id, user.id);

    if (!design) {
      throw new NotFoundError('Design', id);
    }

    return this.success(design);
  }

  /**
   * Create design
   */
  @Post()
  @UseGuards(PermissionGuard)
  @RequirePermissions(Permission.DESIGN_CREATE)
  @ApiOperation({ summary: 'Create new design' })
  @ApiBody({ type: CreateDesignDto })
  @ApiResponse({
    status: 201,
    description: 'Design created successfully',
    type: DesignResponseDto
  })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  async createDesign(
    @Body() dto: CreateDesignDto,
    @CurrentUser() user: User
  ): Promise<SuccessResponse<DesignDto>> {
    const design = await this.designService.create({
      ...dto,
      userId: user.id
    });

    return this.success(design);
  }

  /**
   * Update design
   */
  @Patch(':id')
  @UseGuards(PermissionGuard)
  @RequirePermissions(Permission.DESIGN_UPDATE_OWN)
  @ApiOperation({ summary: 'Update design' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiBody({ type: UpdateDesignDto })
  @ApiResponse({
    status: 200,
    description: 'Design updated successfully',
    type: DesignResponseDto
  })
  async updateDesign(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateDesignDto,
    @CurrentUser() user: User
  ): Promise<SuccessResponse<DesignDto>> {
    const design = await this.designService.update(id, dto, user.id);
    return this.success(design);
  }

  /**
   * Delete design
   */
  @Delete(':id')
  @UseGuards(PermissionGuard)
  @RequirePermissions(Permission.DESIGN_DELETE_OWN)
  @HttpCode(204)
  @ApiOperation({ summary: 'Delete design' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 204, description: 'Design deleted successfully' })
  async deleteDesign(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User
  ): Promise<void> {
    await this.designService.delete(id, user.id);
  }

  /**
   * Export design
   */
  @Post(':id/export')
  @UseGuards(PermissionGuard)
  @RequirePermissions(Permission.DESIGN_EXPORT_HD)
  @ApiOperation({ summary: 'Export design' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiBody({ type: ExportDesignDto })
  @ApiResponse({
    status: 202,
    description: 'Export job queued',
    type: ExportJobResponseDto
  })
  async exportDesign(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ExportDesignDto,
    @CurrentUser() user: User
  ): Promise<SuccessResponse<ExportJob>> {
    const job = await this.designService.queueExport(id, dto, user.id);

    return this.success(job, {
      statusUrl: `/api/v1/jobs/${job.id}`
    });
  }
}
```

---

## 5. DTO (Data Transfer Objects)

### 5.1 DTO Pattern

```typescript
/**
 * Create Design DTO
 */
export class CreateDesignDto {
  @ApiProperty({
    description: 'Design name',
    minLength: 1,
    maxLength: 255,
    example: 'Summer Dress'
  })
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  name: string;

  @ApiProperty({
    description: 'Avatar ID',
    format: 'uuid',
    example: '123e4567-e89b-12d3-a456-426614174000'
  })
  @IsUUID()
  avatarId: string;

  @ApiProperty({
    description: 'Design layers',
    type: [CreateLayerDto]
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateLayerDto)
  layers: CreateLayerDto[];

  @ApiPropertyOptional({
    description: 'Design metadata',
    type: DesignMetadataDto
  })
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => DesignMetadataDto)
  metadata?: DesignMetadataDto;
}

/**
 * Update Design DTO (partial)
 */
export class UpdateDesignDto extends PartialType(CreateDesignDto) {
  @ApiPropertyOptional({
    description: 'Design status',
    enum: ['draft', 'published', 'archived']
  })
  @IsOptional()
  @IsEnum(['draft', 'published', 'archived'])
  status?: string;
}

/**
 * List Designs Query DTO
 */
export class ListDesignsDto {
  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  page?: number = 1;

  @ApiPropertyOptional({ default: 20, minimum: 1, maximum: 100 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  limit?: number = 20;

  @ApiPropertyOptional({ enum: ['draft', 'published', 'archived'] })
  @IsOptional()
  @IsEnum(['draft', 'published', 'archived'])
  status?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ enum: ['createdAt', 'updatedAt', 'name'] })
  @IsOptional()
  @IsString()
  sortBy?: string = 'createdAt';

  @ApiPropertyOptional({ enum: ['asc', 'desc'] })
  @IsOptional()
  @IsEnum(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc' = 'desc';
}
```

---

## 6. Middleware Stack

### 6.1 Request ID Middleware

```typescript
/**
 * Add unique request ID to each request
 */
@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction): void {
    const requestId = req.get('X-Request-ID') || uuidv4();

    req.id = requestId;
    res.setHeader('X-Request-ID', requestId);

    next();
  }
}
```

### 6.2 Logging Middleware

```typescript
/**
 * Log all requests and responses
 */
@Injectable()
export class LoggingMiddleware implements NestMiddleware {
  private logger = new Logger('HTTP');

  use(req: Request, res: Response, next: NextFunction): void {
    const startTime = Date.now();
    const { method, url, ip } = req;

    // Log request
    this.logger.log(`→ ${method} ${url}`, {
      requestId: req.id,
      ip,
      userAgent: req.get('user-agent')
    });

    // Log response
    res.on('finish', () => {
      const duration = Date.now() - startTime;
      const { statusCode } = res;

      const logMethod = statusCode >= 400 ? 'error' : 'log';
      this.logger[logMethod](`← ${method} ${url} ${statusCode} ${duration}ms`, {
        requestId: req.id,
        statusCode,
        duration
      });
    });

    next();
  }
}
```

---

## 7. Interceptors

### 7.1 Transform Interceptor

```typescript
/**
 * Transform responses to standard format
 */
@Injectable()
export class TransformInterceptor<T>
  implements NestInterceptor<T, SuccessResponse<T>> {

  intercept(
    context: ExecutionContext,
    next: CallHandler
  ): Observable<SuccessResponse<T>> {
    const request = context.switchToHttp().getRequest();

    return next.handle().pipe(
      map(data => ({
        success: true,
        data,
        meta: {
          requestId: request.id,
          timestamp: new Date().toISOString(),
          version: '1.0'
        }
      }))
    );
  }
}
```

### 7.2 Timeout Interceptor

```typescript
/**
 * Add timeout to requests
 */
@Injectable()
export class TimeoutInterceptor implements NestInterceptor {
  constructor(
    @Inject('REQUEST_TIMEOUT') private timeout: number = 30000
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      timeout(this.timeout),
      catchError(err => {
        if (err instanceof TimeoutError) {
          throw new RequestTimeoutException('Request timed out');
        }
        throw err;
      })
    );
  }
}
```

---

## 8. Exception Filters

### 8.1 Global Exception Filter

```typescript
/**
 * Global exception filter
 */
@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private logger = new Logger('ExceptionFilter');

  catch(exception: Error, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const errorResponse = ErrorHandler.handle(exception);

    // Log error
    this.logger.error(`Error in ${request.method} ${request.url}`, exception, {
      requestId: request.id,
      userId: (request as any).user?.id,
      statusCode: errorResponse.statusCode
    });

    // Send response
    response.status(errorResponse.statusCode).json({
      success: false,
      error: {
        code: errorResponse.code,
        message: errorResponse.message,
        details: errorResponse.details
      },
      meta: {
        requestId: request.id,
        timestamp: new Date().toISOString(),
        version: '1.0'
      }
    });
  }
}
```

---

## 9. API Versioning

### 9.1 Version Management

```typescript
/**
 * API versioning configuration
 */
export const API_VERSION_CONFIG = {
  v1: {
    prefix: 'api/v1',
    deprecated: false,
    sunset: null,
    module: ApiV1Module
  },
  v2: {
    prefix: 'api/v2',
    deprecated: false,
    sunset: null,
    module: ApiV2Module // Future
  }
};

/**
 * Apply versioning
 */
@Module({
  imports: [
    RouterModule.register([
      {
        path: 'api/v1',
        module: ApiV1Module
      }
    ])
  ]
})
export class ApiModule {}
```

---

## 10. OpenAPI Documentation

### 10.1 Swagger Setup

```typescript
/**
 * Configure Swagger documentation
 */
export function setupSwagger(app: INestApplication): void {
  const config = new DocumentBuilder()
    .setTitle('Fashion Wallet API')
    .setDescription('API documentation for Fashion Wallet backend')
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Enter JWT token'
      },
      'JWT'
    )
    .addApiKey(
      {
        type: 'apiKey',
        name: 'X-API-Key',
        in: 'header',
        description: 'API Key for service-to-service communication'
      },
      'API-Key'
    )
    .addServer('https://api.fashionwallet.com/v1', 'Production')
    .addServer('https://api-staging.fashionwallet.com/v1', 'Staging')
    .addServer('http://localhost:3000/api/v1', 'Development')
    .addTag('Authentication', 'Authentication endpoints')
    .addTag('Users', 'User management')
    .addTag('Avatars', 'Avatar creation and management')
    .addTag('Designs', 'Design creation and management')
    .addTag('Catalog', 'Catalog browsing')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
      docExpansion: 'none',
      filter: true,
      showRequestDuration: true
    }
  });
}
```

---

## 11. Rate Limiting

### 11.1 Rate Limit Configuration

```typescript
/**
 * Configure rate limiting
 */
@Module({
  imports: [
    ThrottlerModule.forRoot({
      ttl: 60, // 60 seconds
      limit: 100, // 100 requests per TTL
      storage: new ThrottlerStorageRedisService(redisClient)
    })
  ]
})
export class ApiModule {}

/**
 * Custom rate limits per endpoint
 */
@Controller('api/v1/auth')
export class AuthController {
  @Post('login')
  @Throttle(5, 900) // 5 requests per 15 minutes
  async login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Post('register')
  @Throttle(3, 3600) // 3 requests per hour
  async register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }
}
```

---

## 12. Health Checks

### 12.1 Health Controller

```typescript
/**
 * Health check endpoints
 */
@Controller('health')
export class HealthController {
  constructor(
    private health: HealthCheckService,
    private db: TypeOrmHealthIndicator,
    private redis: RedisHealthIndicator,
    private storage: StorageHealthIndicator
  ) {}

  @Get()
  @HealthCheck()
  check() {
    return this.health.check([
      () => this.db.pingCheck('database'),
      () => this.redis.pingCheck('redis'),
      () => this.storage.pingCheck('storage')
    ]);
  }

  @Get('live')
  liveness() {
    return { alive: true };
  }

  @Get('ready')
  @HealthCheck()
  readiness() {
    return this.health.check([
      () => this.db.pingCheck('database'),
      () => this.redis.pingCheck('redis')
    ]);
  }
}
```

---

## Document Metadata

**Version**: 1.0
**Author**: Fashion Wallet Engineering Team
**Status**: Draft
**Review Cycle**: Bi-weekly
**Next Review**: December 2025
**Dependencies**: arch-infra-02

---

**End of API Infrastructure Architecture Document**

# Avatar Service Implementation Plan

## Document Overview

**Version**: 1.0
**Last Updated**: November 2025
**Document Type**: Implementation Plan
**Status**: Draft
**Plan ID**: plan-arch-01
**Related Architecture**: spec-arch-01-avatar-service
**Related Spec**: spec-arch-01

---

## 1. Executive Summary

This implementation plan provides a comprehensive, step-by-step approach to building the Avatar Service for Fashion Wallet. The Avatar Service is responsible for creating, processing, and managing personalized 3D user avatars using computer vision, machine learning, and parametric 3D modeling.

**Total Timeline**: 16-20 weeks
**Team Size**:
- 2-3 Backend Developers
- 1-2 ML Engineers
- 1 Frontend Developer
- 1 DevOps Engineer
**Priority**: High (Core feature for virtual try-on)

**Success Criteria**:
- Avatar processing time < 60 seconds (p95)
- Measurement accuracy ±2cm
- 99.9% uptime
- 1000+ concurrent processing jobs support
- GDPR-compliant data handling

---

## 2. Implementation Overview

```
Phase 1 (Weeks 1-4): Foundation & Database Setup
├── Database schema implementation
├── Basic API structure
├── File upload infrastructure
└── Development environment

Phase 2 (Weeks 5-8): Core Avatar Processing
├── Photo validation and storage
├── Job queue system
├── Basic ML pipeline integration
└── Measurement extraction

Phase 3 (Weeks 9-12): 3D Model Generation
├── 3D model generation service
├── Model optimization
├── Multiple LOD levels
└── Model storage in MongoDB

Phase 4 (Weeks 13-16): Advanced Features & Production
├── WebSocket real-time updates
├── Caching strategy
├── Monitoring and observability
└── Production deployment

Phase 5 (Weeks 17-20): Optimization & Scale
├── Performance optimization
├── Load testing
├── Security hardening
└── Documentation
```

---

## 3. Phase 1: Foundation & Database Setup (Weeks 1-4)

### 3.1 Week 1: Database Schema Implementation

#### Day 1-2: PostgreSQL Schema Setup
**Tasks**:
- [ ] Create avatar schema in PostgreSQL
  ```sql
  CREATE SCHEMA IF NOT EXISTS avatar;
  ```
- [ ] Implement avatars table with all columns
  ```typescript
  // src/infrastructure/database/entities/avatar.entity.ts
  @Entity({ schema: 'avatar', name: 'avatars' })
  export class Avatar {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column('uuid')
    userId: string;

    @Column({ length: 255 })
    name: string;

    @Column({ length: 50, default: 'processing' })
    status: AvatarStatus;

    // ... rest of columns
  }
  ```
- [ ] Create measurements table
- [ ] Create photos table
- [ ] Create processing_jobs table
- [ ] Add all indexes and constraints
- [ ] Write migration files for all tables

**Deliverables**:
- Complete PostgreSQL schema
- TypeORM entity definitions
- Migration files
- Schema documentation

**Team**: Backend Developer (1)
**Estimated Time**: 2 days

#### Day 3-4: MongoDB Schema Setup
**Tasks**:
- [ ] Set up MongoDB connection in NestJS
- [ ] Create avatar_models collection schema
  ```typescript
  // src/modules/avatar/schemas/avatar-model.schema.ts
  @Schema({ collection: 'avatar_models', timestamps: true })
  export class AvatarModel {
    @Prop({ type: String, required: true, unique: true })
    avatarId: string;

    @Prop({ type: Object })
    mesh: {
      vertices: Buffer;
      faces: Buffer;
      normals: Buffer;
      uvs: Buffer;
      vertexCount: number;
      faceCount: number;
    };

    @Prop({ type: Array })
    lod: Array<LODLevel>;

    // ... rest of schema
  }
  ```
- [ ] Create indexes for avatar_models
- [ ] Set up Mongoose models
- [ ] Implement connection pooling
- [ ] Write integration tests

**Deliverables**:
- MongoDB schema definitions
- Mongoose models
- Connection configuration
- Integration tests

**Team**: Backend Developer (1)
**Estimated Time**: 2 days

#### Day 5: Repository Pattern Implementation
**Tasks**:
- [ ] Create base repository interface
  ```typescript
  // src/modules/avatar/repositories/base.repository.ts
  export interface IBaseRepository<T> {
    findById(id: string): Promise<T | null>;
    findAll(filter?: any): Promise<T[]>;
    create(data: Partial<T>): Promise<T>;
    update(id: string, data: Partial<T>): Promise<T>;
    delete(id: string): Promise<boolean>;
  }
  ```
- [ ] Implement AvatarRepository (PostgreSQL)
  ```typescript
  @Injectable()
  export class AvatarRepository implements IBaseRepository<Avatar> {
    constructor(
      @InjectRepository(Avatar)
      private readonly repository: Repository<Avatar>,
    ) {}

    async findById(id: string): Promise<Avatar | null> {
      return this.repository.findOne({ where: { id, deletedAt: IsNull() } });
    }

    async findByUserId(userId: string): Promise<Avatar[]> {
      return this.repository.find({
        where: { userId, deletedAt: IsNull() },
        order: { createdAt: 'DESC' }
      });
    }

    // ... more methods
  }
  ```
- [ ] Implement MeasurementRepository
- [ ] Implement PhotoRepository
- [ ] Implement ProcessingJobRepository
- [ ] Implement AvatarModelRepository (MongoDB)
- [ ] Write unit tests for repositories

**Deliverables**:
- All repository classes
- Unit tests (>80% coverage)
- Repository documentation

**Team**: Backend Developer (1)
**Estimated Time**: 1 day

### 3.2 Week 2: Basic API Structure

#### Day 1-3: API Module Setup
**Tasks**:
- [ ] Create avatar module structure
  ```
  src/modules/avatar/
  ├── avatar.module.ts
  ├── controllers/
  │   ├── avatar.controller.ts
  │   └── measurement.controller.ts
  ├── services/
  │   ├── avatar.service.ts
  │   ├── measurement.service.ts
  │   └── validation.service.ts
  ├── dto/
  │   ├── create-avatar.dto.ts
  │   ├── update-avatar.dto.ts
  │   └── measurement.dto.ts
  ├── repositories/
  └── interfaces/
  ```
- [ ] Implement DTOs with validation
  ```typescript
  // src/modules/avatar/dto/create-avatar-from-photos.dto.ts
  export class CreateAvatarFromPhotosDto {
    @IsString()
    @IsNotEmpty()
    @MinLength(1)
    @MaxLength(255)
    name: string;

    @IsEnum(['metric', 'imperial'])
    @IsOptional()
    unit?: 'metric' | 'imperial' = 'metric';

    @IsObject()
    @IsOptional()
    customization?: AvatarCustomizationDto;
  }
  ```
- [ ] Implement AvatarController with all endpoints
  ```typescript
  @Controller('api/v1/avatars')
  @UseGuards(JwtAuthGuard)
  @ApiTags('Avatars')
  export class AvatarController {
    constructor(private readonly avatarService: AvatarService) {}

    @Post('photo-based')
    @UseInterceptors(FileFieldsInterceptor([
      { name: 'front', maxCount: 1 },
      { name: 'side', maxCount: 1 },
      { name: 'back', maxCount: 1 },
    ]))
    async createFromPhotos(
      @UploadedFiles() files: PhotoFiles,
      @Body() dto: CreateAvatarFromPhotosDto,
      @CurrentUser() user: User,
    ): Promise<CreateAvatarResponse> {
      return this.avatarService.createFromPhotos(user.id, files, dto);
    }

    @Get()
    async listAvatars(
      @Query() query: ListAvatarsQueryDto,
      @CurrentUser() user: User,
    ): Promise<PaginatedResponse<Avatar>> {
      return this.avatarService.listAvatars(user.id, query);
    }

    @Get(':id')
    async getAvatar(
      @Param('id', ParseUUIDPipe) id: string,
      @CurrentUser() user: User,
    ): Promise<Avatar> {
      return this.avatarService.getAvatar(id, user.id);
    }

    @Patch(':id')
    async updateAvatar(
      @Param('id', ParseUUIDPipe) id: string,
      @Body() dto: UpdateAvatarDto,
      @CurrentUser() user: User,
    ): Promise<Avatar> {
      return this.avatarService.updateAvatar(id, user.id, dto);
    }

    @Delete(':id')
    async deleteAvatar(
      @Param('id', ParseUUIDPipe) id: string,
      @Query('hard') hard: boolean,
      @CurrentUser() user: User,
    ): Promise<void> {
      return this.avatarService.deleteAvatar(id, user.id, hard);
    }
  }
  ```
- [ ] Implement MeasurementController
- [ ] Add Swagger documentation
- [ ] Write controller tests

**Deliverables**:
- Complete controller implementation
- All DTOs with validation
- Swagger API documentation
- Controller tests

**Team**: Backend Developer (1)
**Estimated Time**: 3 days

#### Day 4-5: Core Service Layer
**Tasks**:
- [ ] Implement AvatarService with business logic
  ```typescript
  @Injectable()
  export class AvatarService {
    constructor(
      private readonly avatarRepo: AvatarRepository,
      private readonly measurementRepo: MeasurementRepository,
      private readonly photoRepo: PhotoRepository,
      private readonly processingJobRepo: ProcessingJobRepository,
      private readonly storageService: StorageService,
      private readonly queueService: QueueService,
      private readonly eventEmitter: EventEmitter2,
    ) {}

    async createFromPhotos(
      userId: string,
      files: PhotoFiles,
      dto: CreateAvatarFromPhotosDto,
    ): Promise<CreateAvatarResponse> {
      // 1. Validate files
      await this.validatePhotos(files);

      // 2. Create avatar record
      const avatar = await this.avatarRepo.create({
        userId,
        name: dto.name,
        status: 'processing',
      });

      // 3. Upload photos to S3
      const photoUrls = await this.uploadPhotos(avatar.id, files);

      // 4. Save photo records
      await this.savePhotoRecords(avatar.id, photoUrls);

      // 5. Queue processing job
      const job = await this.queueService.addJob('avatar:process-photos', {
        avatarId: avatar.id,
        userId,
        photoUrls,
        unit: dto.unit,
        customization: dto.customization,
      });

      // 6. Emit event
      this.eventEmitter.emit('avatar.created', {
        avatarId: avatar.id,
        userId,
        timestamp: new Date(),
      });

      return {
        avatarId: avatar.id,
        status: 'processing',
        estimatedCompletionTime: 60,
        processingJobId: job.id,
      };
    }

    async getAvatar(id: string, userId: string): Promise<Avatar> {
      const avatar = await this.avatarRepo.findById(id);

      if (!avatar) {
        throw new NotFoundException('Avatar not found');
      }

      // Check ownership
      if (avatar.userId !== userId) {
        throw new ForbiddenException('Access denied');
      }

      return avatar;
    }

    // ... more methods
  }
  ```
- [ ] Implement MeasurementService
- [ ] Implement ValidationService
- [ ] Add error handling
- [ ] Write service tests

**Deliverables**:
- Complete service layer
- Business logic implementation
- Error handling
- Service tests (>80% coverage)

**Team**: Backend Developer (1)
**Estimated Time**: 2 days

### 3.3 Week 3: File Upload Infrastructure

#### Day 1-3: S3 Integration
**Tasks**:
- [ ] Set up AWS SDK v3 for S3
  ```bash
  npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner
  ```
- [ ] Create StorageService
  ```typescript
  @Injectable()
  export class StorageService {
    private s3Client: S3Client;

    constructor(private readonly configService: ConfigService) {
      this.s3Client = new S3Client({
        region: configService.get('AWS_REGION'),
        credentials: {
          accessKeyId: configService.get('AWS_ACCESS_KEY_ID'),
          secretAccessKey: configService.get('AWS_SECRET_ACCESS_KEY'),
        },
      });
    }

    async uploadPhoto(
      avatarId: string,
      file: Express.Multer.File,
      type: 'front' | 'side' | 'back',
    ): Promise<string> {
      const key = `avatars/${avatarId}/photos/${type}-${Date.now()}.jpg`;

      const command = new PutObjectCommand({
        Bucket: this.configService.get('S3_AVATAR_BUCKET'),
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype,
        ServerSideEncryption: 'AES256',
        Metadata: {
          avatarId,
          type,
          uploadedAt: new Date().toISOString(),
        },
      });

      await this.s3Client.send(command);

      return `https://${this.configService.get('S3_AVATAR_BUCKET')}.s3.amazonaws.com/${key}`;
    }

    async uploadModel(
      avatarId: string,
      modelData: Buffer,
      format: 'gltf' | 'glb',
    ): Promise<string> {
      const key = `avatars/${avatarId}/models/avatar.${format}`;

      const command = new PutObjectCommand({
        Bucket: this.configService.get('S3_AVATAR_BUCKET'),
        Key: key,
        Body: modelData,
        ContentType: format === 'gltf' ? 'model/gltf+json' : 'model/gltf-binary',
        CacheControl: 'max-age=31536000, immutable',
        ServerSideEncryption: 'AES256',
      });

      await this.s3Client.send(command);

      return key;
    }

    async generateSignedUrl(key: string, expiresIn: number = 3600): Promise<string> {
      const command = new GetObjectCommand({
        Bucket: this.configService.get('S3_AVATAR_BUCKET'),
        Key: key,
      });

      return getSignedUrl(this.s3Client, command, { expiresIn });
    }

    async deleteFile(key: string): Promise<void> {
      const command = new DeleteObjectCommand({
        Bucket: this.configService.get('S3_AVATAR_BUCKET'),
        Key: key,
      });

      await this.s3Client.send(command);
    }
  }
  ```
- [ ] Implement photo validation
  ```typescript
  @Injectable()
  export class PhotoValidationService {
    async validatePhoto(file: Express.Multer.File): Promise<void> {
      // Check file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        throw new BadRequestException('File size exceeds 10MB limit');
      }

      // Check MIME type
      const allowedTypes = ['image/jpeg', 'image/png'];
      if (!allowedTypes.includes(file.mimetype)) {
        throw new BadRequestException('Only JPEG and PNG files are allowed');
      }

      // Check magic number (file signature)
      const isValid = await this.checkMagicNumber(file.buffer);
      if (!isValid) {
        throw new BadRequestException('Invalid file format');
      }

      // Check image dimensions
      const metadata = await sharp(file.buffer).metadata();
      if (!metadata.width || !metadata.height) {
        throw new BadRequestException('Invalid image');
      }

      if (metadata.width < 640 || metadata.height < 480) {
        throw new BadRequestException('Image resolution too low (min 640x480)');
      }
    }

    private async checkMagicNumber(buffer: Buffer): Promise<boolean> {
      // Check JPEG magic number (FF D8 FF)
      if (buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF) {
        return true;
      }

      // Check PNG magic number (89 50 4E 47)
      if (buffer[0] === 0x89 && buffer[1] === 0x50 &&
          buffer[2] === 0x4E && buffer[3] === 0x47) {
        return true;
      }

      return false;
    }
  }
  ```
- [ ] Implement EXIF data stripping
  ```typescript
  async stripExifData(buffer: Buffer): Promise<Buffer> {
    return sharp(buffer)
      .rotate() // Auto-rotate based on EXIF
      .withMetadata({
        exif: {}, // Remove EXIF data
      })
      .jpeg({ quality: 90 })
      .toBuffer();
  }
  ```
- [ ] Set up S3 buckets (dev, staging, prod)
- [ ] Configure S3 lifecycle policies
- [ ] Write storage service tests

**Deliverables**:
- Complete S3 integration
- Photo validation service
- EXIF stripping
- Storage service tests

**Team**: Backend Developer (1)
**Estimated Time**: 3 days

#### Day 4-5: Multipart Upload Handler
**Tasks**:
- [ ] Configure multer for file uploads
  ```typescript
  // src/modules/avatar/config/multer.config.ts
  export const multerConfig: MulterModuleOptions = {
    storage: multer.memoryStorage(),
    limits: {
      fileSize: 10 * 1024 * 1024, // 10MB
      files: 3, // max 3 files (front, side, back)
    },
    fileFilter: (req, file, cb) => {
      if (!file.mimetype.match(/^image\/(jpeg|png)$/)) {
        return cb(new BadRequestException('Only JPEG and PNG allowed'), false);
      }
      cb(null, true);
    },
  };
  ```
- [ ] Create file upload interceptor
- [ ] Add progress tracking for uploads
- [ ] Implement upload error handling
- [ ] Write upload integration tests

**Deliverables**:
- Multipart upload configuration
- Upload interceptors
- Error handling
- Integration tests

**Team**: Backend Developer (1)
**Estimated Time**: 2 days

### 3.4 Week 4: Development Environment & Testing

#### Day 1-2: Docker Development Environment
**Tasks**:
- [ ] Create docker-compose.yml for local development
  ```yaml
  version: '3.8'

  services:
    postgres:
      image: postgres:15-alpine
      environment:
        POSTGRES_DB: fashion_wallet_dev
        POSTGRES_USER: dev
        POSTGRES_PASSWORD: dev_password
      ports:
        - "5432:5432"
      volumes:
        - postgres_data:/var/lib/postgresql/data
        - ./scripts/init-db.sql:/docker-entrypoint-initdb.d/init.sql

    mongodb:
      image: mongo:7
      environment:
        MONGO_INITDB_ROOT_USERNAME: dev
        MONGO_INITDB_ROOT_PASSWORD: dev_password
      ports:
        - "27017:27017"
      volumes:
        - mongodb_data:/data/db

    redis:
      image: redis:7-alpine
      ports:
        - "6379:6379"
      volumes:
        - redis_data:/data

    localstack:
      image: localstack/localstack:latest
      environment:
        SERVICES: s3
        DEFAULT_REGION: us-east-1
      ports:
        - "4566:4566"
      volumes:
        - localstack_data:/tmp/localstack

  volumes:
    postgres_data:
    mongodb_data:
    redis_data:
    localstack_data:
  ```
- [ ] Create init scripts for databases
- [ ] Set up LocalStack for S3 testing
- [ ] Create development seed data
- [ ] Document local setup process

**Deliverables**:
- Complete docker-compose setup
- Database initialization scripts
- LocalStack configuration
- Developer documentation

**Team**: Backend Developer (1), DevOps (0.5)
**Estimated Time**: 2 days

#### Day 3-5: Integration Testing
**Tasks**:
- [ ] Set up Jest testing environment
  ```typescript
  // test/avatar.e2e-spec.ts
  describe('Avatar API (e2e)', () => {
    let app: INestApplication;
    let authToken: string;

    beforeAll(async () => {
      const moduleFixture = await Test.createTestingModule({
        imports: [AppModule],
      }).compile();

      app = moduleFixture.createNestApplication();
      await app.init();

      // Get auth token
      authToken = await getAuthToken(app);
    });

    describe('POST /api/v1/avatars/photo-based', () => {
      it('should create avatar from photos', async () => {
        const response = await request(app.getHttpServer())
          .post('/api/v1/avatars/photo-based')
          .set('Authorization', `Bearer ${authToken}`)
          .field('name', 'Test Avatar')
          .field('unit', 'metric')
          .attach('front', './test/fixtures/front.jpg')
          .expect(201);

        expect(response.body).toMatchObject({
          avatarId: expect.any(String),
          status: 'processing',
          estimatedCompletionTime: expect.any(Number),
          processingJobId: expect.any(String),
        });
      });

      it('should reject invalid file types', async () => {
        await request(app.getHttpServer())
          .post('/api/v1/avatars/photo-based')
          .set('Authorization', `Bearer ${authToken}`)
          .field('name', 'Test Avatar')
          .attach('front', './test/fixtures/invalid.txt')
          .expect(400);
      });

      it('should reject oversized files', async () => {
        await request(app.getHttpServer())
          .post('/api/v1/avatars/photo-based')
          .set('Authorization', `Bearer ${authToken}`)
          .field('name', 'Test Avatar')
          .attach('front', './test/fixtures/large.jpg') // > 10MB
          .expect(400);
      });
    });

    describe('GET /api/v1/avatars', () => {
      it('should list user avatars', async () => {
        const response = await request(app.getHttpServer())
          .get('/api/v1/avatars')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body).toMatchObject({
          data: expect.any(Array),
          total: expect.any(Number),
          page: 1,
          limit: 10,
        });
      });
    });
  });
  ```
- [ ] Write integration tests for all endpoints
- [ ] Test database interactions
- [ ] Test S3 uploads with LocalStack
- [ ] Test error scenarios
- [ ] Set up test coverage reporting

**Deliverables**:
- Complete integration test suite
- Test fixtures and helpers
- Coverage reports (>70%)
- CI pipeline configuration

**Team**: Backend Developer (1)
**Estimated Time**: 3 days

---

## 4. Phase 2: Core Avatar Processing (Weeks 5-8)

### 4.1 Week 5: Job Queue System

#### Day 1-3: BullMQ Integration
**Tasks**:
- [ ] Install BullMQ dependencies
  ```bash
  npm install @nestjs/bull bullmq
  ```
- [ ] Create queue module
  ```typescript
  // src/modules/queue/queue.module.ts
  @Module({
    imports: [
      BullModule.forRoot({
        connection: {
          host: configService.get('REDIS_HOST'),
          port: configService.get('REDIS_PORT'),
        },
      }),
      BullModule.registerQueue({
        name: 'avatar-processing',
        defaultJobOptions: {
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 2000,
          },
          removeOnComplete: {
            age: 3600, // Keep for 1 hour
          },
          removeOnFail: {
            age: 86400, // Keep for 24 hours
          },
        },
      }),
    ],
    exports: [BullModule],
  })
  export class QueueModule {}
  ```
- [ ] Implement QueueService
  ```typescript
  @Injectable()
  export class QueueService {
    constructor(
      @InjectQueue('avatar-processing')
      private avatarQueue: Queue,
    ) {}

    async addProcessingJob(
      data: AvatarProcessingJobData,
      priority: number = 5,
    ): Promise<Job> {
      return this.avatarQueue.add('avatar:process-photos', data, {
        priority,
        jobId: `avatar-${data.avatarId}-${Date.now()}`,
      });
    }

    async getJob(jobId: string): Promise<Job | undefined> {
      return this.avatarQueue.getJob(jobId);
    }

    async getJobStatus(jobId: string): Promise<JobStatus> {
      const job = await this.getJob(jobId);
      if (!job) {
        throw new NotFoundException('Job not found');
      }

      const state = await job.getState();
      const progress = job.progress;

      return {
        id: job.id,
        state,
        progress,
        data: job.data,
        returnvalue: job.returnvalue,
        failedReason: job.failedReason,
      };
    }

    async removeJob(jobId: string): Promise<void> {
      const job = await this.getJob(jobId);
      if (job) {
        await job.remove();
      }
    }
  }
  ```
- [ ] Configure queue priority levels
- [ ] Set up retry strategy
- [ ] Implement job cleanup
- [ ] Write queue tests

**Deliverables**:
- Complete BullMQ integration
- Queue service implementation
- Retry and cleanup configuration
- Queue tests

**Team**: Backend Developer (1)
**Estimated Time**: 3 days

#### Day 4-5: Processing Worker Foundation
**Tasks**:
- [ ] Create worker processor
  ```typescript
  // src/modules/avatar/processors/avatar-processing.processor.ts
  @Processor('avatar-processing')
  export class AvatarProcessingProcessor {
    private readonly logger = new Logger(AvatarProcessingProcessor.name);

    constructor(
      private readonly avatarRepo: AvatarRepository,
      private readonly processingJobRepo: ProcessingJobRepository,
      private readonly mlService: MLService,
      private readonly modelService: ModelGenerationService,
      private readonly storageService: StorageService,
      private readonly eventEmitter: EventEmitter2,
    ) {}

    @Process('avatar:process-photos')
    async processPhotos(job: Job<AvatarProcessingJobData>): Promise<ProcessingResult> {
      const { avatarId, userId, photoUrls, unit, customization } = job.data;

      this.logger.log(`Starting processing for avatar ${avatarId}`);

      try {
        // Update job record
        await this.processingJobRepo.create({
          id: job.id,
          avatarId,
          jobType: 'photo-processing',
          status: 'processing',
          startedAt: new Date(),
        });

        // Step 1: Download photos (10%)
        await job.updateProgress(10);
        await this.updateAvatarStatus(avatarId, 'processing', 'Loading photos');
        const photos = await this.downloadPhotos(photoUrls);

        // Step 2: Background removal (20%)
        await job.updateProgress(20);
        await this.updateAvatarStatus(avatarId, 'processing', 'Removing background');
        const maskedPhotos = await this.mlService.removeBackground(photos);

        // Step 3: Pose detection (40%)
        await job.updateProgress(40);
        await this.updateAvatarStatus(avatarId, 'processing', 'Detecting body landmarks');
        const landmarks = await this.mlService.detectPose(maskedPhotos);

        // Step 4: Measurement extraction (60%)
        await job.updateProgress(60);
        await this.updateAvatarStatus(avatarId, 'processing', 'Extracting measurements');
        const measurements = await this.mlService.extractMeasurements(landmarks, photos[0], unit);

        // Step 5: Body type classification (70%)
        await job.updateProgress(70);
        const bodyType = await this.mlService.classifyBodyType(measurements);

        // Step 6: 3D model generation (75%)
        await job.updateProgress(75);
        await this.updateAvatarStatus(avatarId, 'processing', 'Generating 3D model');
        const model = await this.modelService.generateModel({
          measurements,
          bodyType,
          landmarks,
          customization,
        });

        // Step 7: Model optimization (90%)
        await job.updateProgress(90);
        await this.updateAvatarStatus(avatarId, 'processing', 'Optimizing model');
        const optimized = await this.modelService.optimizeModel(model);

        // Step 8: Upload and save (95%)
        await job.updateProgress(95);
        await this.updateAvatarStatus(avatarId, 'processing', 'Saving results');
        const modelUrls = await this.uploadModel(avatarId, optimized);

        // Step 9: Save to database
        await this.saveResults(avatarId, {
          measurements,
          bodyType,
          modelUrls,
          landmarks,
        });

        // Complete
        await job.updateProgress(100);
        await this.updateAvatarStatus(avatarId, 'ready', 'Complete');

        // Emit event
        this.eventEmitter.emit('avatar.processing.completed', {
          avatarId,
          userId,
          jobId: job.id,
          processingTime: Date.now() - job.timestamp,
        });

        this.logger.log(`Completed processing for avatar ${avatarId}`);

        return {
          success: true,
          avatarId,
          modelUrls,
        };

      } catch (error) {
        this.logger.error(`Failed to process avatar ${avatarId}:`, error);

        await this.updateAvatarStatus(avatarId, 'error', error.message);

        this.eventEmitter.emit('avatar.processing.failed', {
          avatarId,
          userId,
          jobId: job.id,
          error: error.message,
        });

        throw error;
      }
    }

    private async updateAvatarStatus(
      avatarId: string,
      status: string,
      message?: string,
    ): Promise<void> {
      await this.avatarRepo.update(avatarId, { status });

      // Emit WebSocket event for real-time updates
      this.eventEmitter.emit('avatar.status.update', {
        avatarId,
        status,
        message,
        timestamp: new Date(),
      });
    }
  }
  ```
- [ ] Implement error handling and retries
- [ ] Add progress tracking
- [ ] Set up worker monitoring
- [ ] Write worker tests

**Deliverables**:
- Worker processor implementation
- Progress tracking
- Error handling
- Worker tests

**Team**: Backend Developer (1)
**Estimated Time**: 2 days

### 4.2 Week 6: ML Pipeline Integration

#### Day 1-2: ML Service Interface
**Tasks**:
- [ ] Create ML service interface
  ```typescript
  // src/modules/avatar/services/ml.service.ts
  export interface IMLService {
    removeBackground(photos: Photo[]): Promise<Photo[]>;
    detectPose(photos: Photo[]): Promise<Landmarks>;
    extractMeasurements(landmarks: Landmarks, photo: Photo, unit: string): Promise<Measurements>;
    classifyBodyType(measurements: Measurements): Promise<BodyType>;
  }

  @Injectable()
  export class MLService implements IMLService {
    private readonly logger = new Logger(MLService.name);

    constructor(
      private readonly httpService: HttpService,
      private readonly configService: ConfigService,
    ) {}

    async removeBackground(photos: Photo[]): Promise<Photo[]> {
      // Call Python ML service
      const mlServiceUrl = this.configService.get('ML_SERVICE_URL');

      const response = await this.httpService.axiosRef.post(
        `${mlServiceUrl}/background-removal`,
        {
          photos: photos.map(p => ({
            url: p.url,
            type: p.type,
          })),
        },
        {
          timeout: 30000, // 30 seconds
        },
      );

      return response.data.processedPhotos;
    }

    async detectPose(photos: Photo[]): Promise<Landmarks> {
      const mlServiceUrl = this.configService.get('ML_SERVICE_URL');

      const response = await this.httpService.axiosRef.post(
        `${mlServiceUrl}/pose-detection`,
        { photos },
        { timeout: 30000 },
      );

      // Validate landmarks
      this.validateLandmarks(response.data.landmarks);

      return response.data.landmarks;
    }

    async extractMeasurements(
      landmarks: Landmarks,
      photo: Photo,
      unit: string,
    ): Promise<Measurements> {
      const mlServiceUrl = this.configService.get('ML_SERVICE_URL');

      const response = await this.httpService.axiosRef.post(
        `${mlServiceUrl}/measurement-extraction`,
        {
          landmarks,
          photoMetadata: photo.metadata,
          unit,
        },
        { timeout: 20000 },
      );

      // Validate measurements
      this.validateMeasurements(response.data.measurements);

      return response.data.measurements;
    }

    async classifyBodyType(measurements: Measurements): Promise<BodyType> {
      const mlServiceUrl = this.configService.get('ML_SERVICE_URL');

      const response = await this.httpService.axiosRef.post(
        `${mlServiceUrl}/body-type-classification`,
        { measurements },
        { timeout: 10000 },
      );

      return response.data.bodyType;
    }

    private validateLandmarks(landmarks: Landmarks): void {
      if (!landmarks || !landmarks.points || landmarks.points.length < 33) {
        throw new Error('Invalid landmarks data');
      }

      // Check confidence scores
      const avgConfidence = landmarks.points.reduce((sum, p) => sum + p.confidence, 0) / landmarks.points.length;

      if (avgConfidence < 0.6) {
        throw new Error('Low confidence in pose detection');
      }
    }

    private validateMeasurements(measurements: Measurements): void {
      // Check required measurements
      const required = ['height', 'chest', 'waist', 'hip'];
      for (const key of required) {
        if (!measurements[key] || measurements[key] <= 0) {
          throw new Error(`Invalid or missing measurement: ${key}`);
        }
      }

      // Sanity checks
      if (measurements.height < 140 || measurements.height > 220) {
        throw new Error('Height out of reasonable range');
      }
    }
  }
  ```
- [ ] Implement mock ML service for testing
- [ ] Add timeout and retry logic
- [ ] Implement result validation
- [ ] Write ML service tests

**Deliverables**:
- ML service interface
- HTTP client integration
- Mock service for testing
- Service tests

**Team**: Backend Developer (1)
**Estimated Time**: 2 days

#### Day 3-5: Python ML Service Stub
**Tasks**:
- [ ] Create Python Flask service structure
  ```python
  # ml_service/app.py
  from flask import Flask, request, jsonify
  import logging

  app = Flask(__name__)
  logging.basicConfig(level=logging.INFO)
  logger = logging.getLogger(__name__)

  @app.route('/health', methods=['GET'])
  def health():
      return jsonify({'status': 'healthy'})

  @app.route('/background-removal', methods=['POST'])
  def remove_background():
      """Remove background from photos using SAM/U2-Net"""
      data = request.json
      photos = data.get('photos', [])

      logger.info(f"Processing {len(photos)} photos for background removal")

      # TODO: Implement actual background removal
      # For now, return stub response
      processed_photos = []
      for photo in photos:
          processed_photos.append({
              'url': photo['url'].replace('.jpg', '_masked.jpg'),
              'type': photo['type'],
              'maskQuality': 0.95,
          })

      return jsonify({'processedPhotos': processed_photos})

  @app.route('/pose-detection', methods=['POST'])
  def detect_pose():
      """Detect body pose using MediaPipe"""
      data = request.json
      photos = data.get('photos', [])

      logger.info(f"Detecting pose for {len(photos)} photos")

      # TODO: Implement actual pose detection
      # Return stub landmarks
      landmarks = {
          'points': [
              {'x': 0.5, 'y': 0.2, 'z': 0.0, 'confidence': 0.95, 'name': 'nose'},
              # ... 32 more landmarks
          ],
          'averageConfidence': 0.92,
      }

      return jsonify({'landmarks': landmarks})

  @app.route('/measurement-extraction', methods=['POST'])
  def extract_measurements():
      """Extract body measurements from landmarks"""
      data = request.json
      landmarks = data.get('landmarks')
      unit = data.get('unit', 'metric')

      logger.info("Extracting measurements")

      # TODO: Implement actual measurement extraction
      # Return stub measurements
      measurements = {
          'height': 175.0,
          'shoulderWidth': 45.0,
          'chestCircumference': 95.0,
          'waistCircumference': 80.0,
          'hipCircumference': 100.0,
          'confidence': 0.89,
      }

      return jsonify({'measurements': measurements})

  @app.route('/body-type-classification', methods=['POST'])
  def classify_body_type():
      """Classify body type from measurements"""
      data = request.json
      measurements = data.get('measurements')

      logger.info("Classifying body type")

      # TODO: Implement actual classification
      body_type = 'rectangle'

      return jsonify({'bodyType': body_type, 'confidence': 0.87})

  if __name__ == '__main__':
      app.run(host='0.0.0.0', port=5000)
  ```
- [ ] Add requirements.txt
  ```
  Flask==3.0.0
  numpy==1.24.0
  opencv-python==4.8.0
  pillow==10.0.0
  mediapipe==0.10.0
  torch==2.0.0
  torchvision==0.15.0
  ```
- [ ] Create Dockerfile for ML service
  ```dockerfile
  FROM python:3.11-slim

  WORKDIR /app

  # Install system dependencies
  RUN apt-get update && apt-get install -y \
      libglib2.0-0 \
      libsm6 \
      libxext6 \
      libxrender-dev \
      libgomp1 \
      && rm -rf /var/lib/apt/lists/*

  # Copy requirements
  COPY requirements.txt .
  RUN pip install --no-cache-dir -r requirements.txt

  # Copy application
  COPY . .

  EXPOSE 5000

  CMD ["python", "app.py"]
  ```
- [ ] Add to docker-compose.yml
- [ ] Document ML service API
- [ ] Test ML service integration

**Deliverables**:
- Python ML service stub
- Docker configuration
- API documentation
- Integration tests

**Team**: ML Engineer (1), Backend Developer (0.5)
**Estimated Time**: 3 days

### 4.3 Week 7-8: Measurement Processing

#### Day 1-3: Measurement Service Implementation
**Tasks**:
- [ ] Implement MeasurementService
  ```typescript
  @Injectable()
  export class MeasurementService {
    constructor(
      private readonly measurementRepo: MeasurementRepository,
      private readonly avatarRepo: AvatarRepository,
      private readonly eventEmitter: EventEmitter2,
    ) {}

    async saveMeasurements(
      avatarId: string,
      measurements: Partial<Measurements>,
      source: 'auto' | 'manual' = 'auto',
    ): Promise<Measurements> {
      // Validate measurements
      this.validateMeasurements(measurements);

      // Convert to metric if needed
      const metricMeasurements = this.convertToMetric(measurements);

      // Check if measurements exist
      const existing = await this.measurementRepo.findByAvatarId(avatarId);

      let saved: Measurements;
      if (existing) {
        saved = await this.measurementRepo.update(existing.id, {
          ...metricMeasurements,
          source,
          updatedAt: new Date(),
        });
      } else {
        saved = await this.measurementRepo.create({
          avatarId,
          ...metricMeasurements,
          source,
          unit: 'metric',
        });
      }

      // Emit event
      this.eventEmitter.emit('avatar.measurements.updated', {
        avatarId,
        measurements: saved,
        source,
      });

      return saved;
    }

    async getMeasurements(
      avatarId: string,
      unit: 'metric' | 'imperial' = 'metric',
    ): Promise<Measurements> {
      const measurements = await this.measurementRepo.findByAvatarId(avatarId);

      if (!measurements) {
        throw new NotFoundException('Measurements not found');
      }

      if (unit === 'imperial') {
        return this.convertToImperial(measurements);
      }

      return measurements;
    }

    async updateMeasurement(
      avatarId: string,
      key: keyof Measurements,
      value: number,
      regenerateModel: boolean = false,
    ): Promise<Measurements> {
      const measurements = await this.measurementRepo.findByAvatarId(avatarId);

      if (!measurements) {
        throw new NotFoundException('Measurements not found');
      }

      // Update single measurement
      measurements[key] = value;
      measurements.source = 'manual';

      // Validate
      this.validateMeasurements(measurements);

      // Save
      const updated = await this.measurementRepo.update(measurements.id, measurements);

      // Trigger model regeneration if requested
      if (regenerateModel) {
        this.eventEmitter.emit('avatar.regeneration.requested', {
          avatarId,
          reason: 'measurement_update',
          measurements: updated,
        });
      }

      return updated;
    }

    private validateMeasurements(measurements: Partial<Measurements>): void {
      const validations = [
        { key: 'height', min: 140, max: 220 },
        { key: 'shoulderWidth', min: 30, max: 60 },
        { key: 'chestCircumference', min: 70, max: 150 },
        { key: 'waistCircumference', min: 60, max: 150 },
        { key: 'hipCircumference', min: 70, max: 160 },
      ];

      for (const { key, min, max } of validations) {
        const value = measurements[key];
        if (value !== undefined && (value < min || value > max)) {
          throw new BadRequestException(
            `${key} must be between ${min} and ${max} cm`,
          );
        }
      }
    }

    private convertToMetric(measurements: Partial<Measurements>): Partial<Measurements> {
      // Implementation depends on unit field
      // If already metric, return as-is
      return measurements;
    }

    private convertToImperial(measurements: Measurements): Measurements {
      // Convert cm to inches
      const converted = { ...measurements };

      const cmFields = [
        'height', 'shoulderWidth', 'chestCircumference',
        'waistCircumference', 'hipCircumference',
      ];

      for (const field of cmFields) {
        if (converted[field]) {
          converted[field] = Number((converted[field] / 2.54).toFixed(2));
        }
      }

      converted.unit = 'imperial';

      return converted;
    }
  }
  ```
- [ ] Implement measurement validation rules
- [ ] Add unit conversion utilities
- [ ] Implement measurement confidence scoring
- [ ] Write measurement service tests

**Deliverables**:
- Complete measurement service
- Validation logic
- Unit conversion
- Service tests

**Team**: Backend Developer (1)
**Estimated Time**: 3 days

#### Day 4-5: Measurement Update Flow
**Tasks**:
- [ ] Implement measurement update API
- [ ] Add model regeneration trigger
- [ ] Implement validation endpoint
- [ ] Add measurement history tracking
- [ ] Write integration tests

**Deliverables**:
- Measurement update endpoints
- Regeneration flow
- History tracking
- Integration tests

**Team**: Backend Developer (1)
**Estimated Time**: 2 days

---

## 5. Phase 3: 3D Model Generation (Weeks 9-12)

### 5.1 Week 9: Model Generation Service

#### Day 1-3: Three.js Integration
**Tasks**:
- [ ] Install Three.js dependencies
  ```bash
  npm install three @types/three
  npm install draco3d gltf-pipeline
  ```
- [ ] Create ModelGenerationService
  ```typescript
  @Injectable()
  export class ModelGenerationService {
    private readonly logger = new Logger(ModelGenerationService.name);

    async generateModel(params: ModelGenerationParams): Promise<AvatarModel> {
      const { measurements, bodyType, landmarks, customization } = params;

      this.logger.log('Starting 3D model generation');

      // 1. Load base template
      const template = await this.loadBaseTemplate(bodyType);

      // 2. Apply measurements to template
      const morphedMesh = this.applyMeasurements(template, measurements);

      // 3. Apply landmark-based refinements
      if (landmarks) {
        this.applyLandmarkRefinements(morphedMesh, landmarks);
      }

      // 4. Apply customizations
      if (customization) {
        this.applyCustomizations(morphedMesh, customization);
      }

      // 5. Generate textures
      const textures = await this.generateTextures(morphedMesh);

      // 6. Create final model
      const model: AvatarModel = {
        mesh: this.serializeMesh(morphedMesh),
        textures,
        skeleton: this.createSkeleton(morphedMesh),
        metadata: {
          bodyType,
          measurements,
          generatedAt: new Date(),
        },
      };

      return model;
    }

    private async loadBaseTemplate(bodyType: BodyType): Promise<THREE.Mesh> {
      // Load appropriate base mesh for body type
      const templatePath = `./assets/templates/${bodyType}.glb`;

      // Use GLTFLoader to load the template
      // This is simplified - actual implementation would use proper loading
      const mesh = new THREE.Mesh();

      return mesh;
    }

    private applyMeasurements(
      mesh: THREE.Mesh,
      measurements: Measurements,
    ): THREE.Mesh {
      // Apply parametric deformations based on measurements
      const geometry = mesh.geometry as THREE.BufferGeometry;
      const positions = geometry.attributes.position;

      // Scale factors
      const heightScale = measurements.height / 175; // 175cm is base height
      const chestScale = measurements.chestCircumference / 95;
      const waistScale = measurements.waistCircumference / 80;
      const hipScale = measurements.hipCircumference / 100;

      // Apply vertex deformations
      for (let i = 0; i < positions.count; i++) {
        const x = positions.getX(i);
        const y = positions.getY(i);
        const z = positions.getZ(i);

        // Height scaling (Y-axis)
        let newY = y * heightScale;

        // Circumference scaling (X and Z axes)
        let scale = 1.0;

        if (y > 1.2) { // Chest area
          scale = chestScale;
        } else if (y > 0.8 && y <= 1.2) { // Waist area
          scale = waistScale;
        } else if (y <= 0.8) { // Hip area
          scale = hipScale;
        }

        const newX = x * scale;
        const newZ = z * scale;

        positions.setXYZ(i, newX, newY, newZ);
      }

      positions.needsUpdate = true;
      geometry.computeVertexNormals();

      return mesh;
    }

    private serializeMesh(mesh: THREE.Mesh): MeshData {
      const geometry = mesh.geometry as THREE.BufferGeometry;

      return {
        vertices: Buffer.from(geometry.attributes.position.array.buffer),
        faces: Buffer.from(geometry.index!.array.buffer),
        normals: Buffer.from(geometry.attributes.normal.array.buffer),
        uvs: Buffer.from(geometry.attributes.uv.array.buffer),
        vertexCount: geometry.attributes.position.count,
        faceCount: geometry.index!.count / 3,
      };
    }
  }
  ```
- [ ] Implement base template loading
- [ ] Implement parametric deformation
- [ ] Add mesh validation
- [ ] Write model generation tests

**Deliverables**:
- Model generation service
- Template loading
- Parametric deformation
- Service tests

**Team**: Backend Developer (1), ML Engineer (0.5)
**Estimated Time**: 3 days

#### Day 4-5: Model Optimization
**Tasks**:
- [ ] Implement mesh decimation
  ```typescript
  async decimateMesh(
    mesh: THREE.Mesh,
    targetFaceCount: number,
  ): Promise<THREE.Mesh> {
    // Use simplification algorithm
    // This would typically use a library like meshoptimizer

    const geometry = mesh.geometry as THREE.BufferGeometry;
    const currentFaceCount = geometry.index!.count / 3;

    if (currentFaceCount <= targetFaceCount) {
      return mesh;
    }

    const ratio = targetFaceCount / currentFaceCount;

    // Apply decimation (simplified)
    // Real implementation would use proper mesh simplification

    return mesh;
  }
  ```
- [ ] Implement LOD (Level of Detail) generation
  ```typescript
  async generateLODs(baseMesh: THREE.Mesh): Promise<LODLevel[]> {
    const lods: LODLevel[] = [];

    // LOD 0: Full quality (base mesh)
    // Already generated

    // LOD 1: 50% faces
    const lod1 = await this.decimateMesh(baseMesh.clone(),
      (baseMesh.geometry as THREE.BufferGeometry).index!.count / 6);
    lods.push({
      level: 1,
      ...this.serializeMesh(lod1),
    });

    // LOD 2: 25% faces
    const lod2 = await this.decimateMesh(baseMesh.clone(),
      (baseMesh.geometry as THREE.BufferGeometry).index!.count / 12);
    lods.push({
      level: 2,
      ...this.serializeMesh(lod2),
    });

    return lods;
  }
  ```
- [ ] Implement texture compression
- [ ] Add GLTF export
  ```typescript
  async exportToGLTF(model: AvatarModel): Promise<Buffer> {
    // Create scene
    const scene = new THREE.Scene();

    // Recreate mesh from model data
    const mesh = this.deserializeMesh(model.mesh);
    scene.add(mesh);

    // Export to GLTF using GLTFExporter
    const exporter = new GLTFExporter();

    return new Promise((resolve, reject) => {
      exporter.parse(
        scene,
        (gltf) => {
          const buffer = Buffer.from(JSON.stringify(gltf));
          resolve(buffer);
        },
        (error) => reject(error),
        { binary: false },
      );
    });
  }

  async exportToGLB(model: AvatarModel): Promise<Buffer> {
    // Similar to GLTF but binary format
    const exporter = new GLTFExporter();

    return new Promise((resolve, reject) => {
      exporter.parse(
        scene,
        (glb) => {
          resolve(Buffer.from(glb as ArrayBuffer));
        },
        (error) => reject(error),
        { binary: true },
      );
    });
  }
  ```
- [ ] Write optimization tests

**Deliverables**:
- Mesh optimization
- LOD generation
- GLTF/GLB export
- Tests

**Team**: Backend Developer (1)
**Estimated Time**: 2 days

### 5.2 Week 10: MongoDB Model Storage

#### Day 1-3: Model Storage Implementation
**Tasks**:
- [ ] Implement AvatarModelRepository
  ```typescript
  @Injectable()
  export class AvatarModelRepository {
    constructor(
      @InjectModel(AvatarModel.name)
      private readonly model: Model<AvatarModelDocument>,
    ) {}

    async saveModel(avatarId: string, modelData: AvatarModel): Promise<void> {
      // Check if model exists
      const existing = await this.model.findOne({ avatarId });

      if (existing) {
        // Update existing
        await this.model.updateOne(
          { avatarId },
          {
            $set: {
              mesh: modelData.mesh,
              lod: modelData.lod,
              textures: modelData.textures,
              skeleton: modelData.skeleton,
              generationMetadata: modelData.generationMetadata,
              updatedAt: new Date(),
            },
          },
        );
      } else {
        // Create new
        await this.model.create({
          avatarId,
          ...modelData,
        });
      }
    }

    async getModel(avatarId: string): Promise<AvatarModel | null> {
      return this.model.findOne({ avatarId }).lean();
    }

    async getLOD(avatarId: string, level: number): Promise<LODLevel | null> {
      const model = await this.model.findOne(
        { avatarId },
        { lod: { $elemMatch: { level } } },
      );

      return model?.lod?.[0] || null;
    }

    async deleteModel(avatarId: string): Promise<void> {
      await this.model.deleteOne({ avatarId });
    }

    async getModelSize(avatarId: string): Promise<number> {
      const model = await this.model.findOne({ avatarId });

      if (!model) {
        return 0;
      }

      // Calculate total size in bytes
      let size = 0;
      size += model.mesh.vertices.length;
      size += model.mesh.faces.length;
      size += model.mesh.normals.length;
      size += model.mesh.uvs.length;

      for (const lod of model.lod || []) {
        size += lod.vertices.length;
        size += lod.faces.length;
      }

      return size;
    }
  }
  ```
- [ ] Implement efficient binary storage
- [ ] Add compression for large models
- [ ] Optimize queries with indexes
- [ ] Write repository tests

**Deliverables**:
- Model repository
- Binary storage
- Compression
- Tests

**Team**: Backend Developer (1)
**Estimated Time**: 3 days

#### Day 4-5: Model Retrieval API
**Tasks**:
- [ ] Implement model download endpoints
  ```typescript
  @Controller('api/v1/avatars/:id/model')
  @UseGuards(JwtAuthGuard)
  export class AvatarModelController {
    constructor(
      private readonly modelService: ModelService,
      private readonly avatarService: AvatarService,
    ) {}

    @Get()
    async getModel(
      @Param('id') avatarId: string,
      @Query('format') format: 'gltf' | 'glb' = 'glb',
      @Query('lod') lod: number = 0,
      @CurrentUser() user: User,
    ): Promise<StreamableFile> {
      // Check authorization
      await this.avatarService.checkAccess(avatarId, user.id);

      // Get model
      const modelData = await this.modelService.getModelFile(avatarId, format, lod);

      return new StreamableFile(modelData, {
        type: format === 'gltf' ? 'model/gltf+json' : 'model/gltf-binary',
        disposition: `attachment; filename="avatar-${avatarId}.${format}"`,
      });
    }

    @Get('preview')
    async getPreview(
      @Param('id') avatarId: string,
      @CurrentUser() user: User,
    ): Promise<string> {
      await this.avatarService.checkAccess(avatarId, user.id);

      // Return signed URL for thumbnail
      const avatar = await this.avatarService.getAvatar(avatarId, user.id);

      if (!avatar.thumbnailUrl) {
        throw new NotFoundException('Thumbnail not available');
      }

      return avatar.thumbnailUrl;
    }
  }
  ```
- [ ] Add format conversion on-the-fly
- [ ] Implement streaming for large files
- [ ] Add download tracking
- [ ] Write API tests

**Deliverables**:
- Model retrieval API
- Format conversion
- Streaming support
- API tests

**Team**: Backend Developer (1)
**Estimated Time**: 2 days

### 5.3 Week 11-12: Model Processing Pipeline

#### Week 11: End-to-End Pipeline Integration
**Tasks**:
- [ ] Integrate all components in worker
- [ ] Test complete pipeline with real data
- [ ] Fix integration issues
- [ ] Optimize performance bottlenecks
- [ ] Add comprehensive logging
- [ ] Test error scenarios
- [ ] Document pipeline

**Deliverables**:
- Complete working pipeline
- Performance optimizations
- Error handling
- Documentation

**Team**: Backend Developer (1), ML Engineer (1)
**Estimated Time**: 5 days

#### Week 12: Thumbnail Generation
**Tasks**:
- [ ] Implement thumbnail rendering service
  ```typescript
  @Injectable()
  export class ThumbnailService {
    async generateThumbnail(
      avatarId: string,
      model: AvatarModel,
    ): Promise<Buffer> {
      // Use Three.js with headless rendering
      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 1000);

      // Add model to scene
      const mesh = this.deserializeMesh(model.mesh);
      scene.add(mesh);

      // Set up lighting
      const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
      const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
      directionalLight.position.set(1, 1, 1);
      scene.add(ambientLight, directionalLight);

      // Position camera
      camera.position.set(0, 1.5, 3);
      camera.lookAt(0, 1, 0);

      // Render
      const renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true,
      });
      renderer.setSize(512, 512);
      renderer.render(scene, camera);

      // Get image buffer
      const canvas = renderer.domElement;
      const buffer = canvas.toBuffer('image/png');

      return buffer;
    }
  }
  ```
- [ ] Add thumbnail to S3
- [ ] Generate multiple view angles
- [ ] Optimize thumbnail size
- [ ] Write thumbnail tests

**Deliverables**:
- Thumbnail generation
- Multiple views
- S3 integration
- Tests

**Team**: Backend Developer (1)
**Estimated Time**: 5 days

---

## 6. Phase 4: Advanced Features & Production (Weeks 13-16)

### 6.1 Week 13: WebSocket Real-Time Updates

#### Day 1-3: WebSocket Gateway
**Tasks**:
- [ ] Install Socket.IO
  ```bash
  npm install @nestjs/websockets @nestjs/platform-socket.io socket.io
  ```
- [ ] Create AvatarGateway
  ```typescript
  @WebSocketGateway({
    namespace: '/avatar',
    cors: {
      origin: process.env.FRONTEND_URL,
      credentials: true,
    },
  })
  export class AvatarGateway implements OnGatewayConnection, OnGatewayDisconnect {
    @WebSocketServer()
    server: Server;

    private readonly logger = new Logger(AvatarGateway.name);
    private userSockets = new Map<string, Set<string>>(); // userId -> socketIds

    constructor(
      private readonly jwtService: JwtService,
    ) {}

    async handleConnection(client: Socket) {
      try {
        // Authenticate
        const token = client.handshake.auth.token;
        const payload = await this.jwtService.verifyAsync(token);

        client.data.userId = payload.userId;

        // Track socket
        if (!this.userSockets.has(payload.userId)) {
          this.userSockets.set(payload.userId, new Set());
        }
        this.userSockets.get(payload.userId)!.add(client.id);

        this.logger.log(`Client connected: ${client.id} (user: ${payload.userId})`);

      } catch (error) {
        this.logger.error('Connection authentication failed:', error);
        client.disconnect();
      }
    }

    handleDisconnect(client: Socket) {
      const userId = client.data.userId;

      if (userId && this.userSockets.has(userId)) {
        this.userSockets.get(userId)!.delete(client.id);

        if (this.userSockets.get(userId)!.size === 0) {
          this.userSockets.delete(userId);
        }
      }

      this.logger.log(`Client disconnected: ${client.id}`);
    }

    @SubscribeMessage('avatar:subscribe')
    handleSubscribe(
      @ConnectedSocket() client: Socket,
      @MessageBody() data: { avatarId: string },
    ) {
      client.join(`avatar:${data.avatarId}`);
      this.logger.log(`Client ${client.id} subscribed to avatar ${data.avatarId}`);

      return { event: 'subscribed', avatarId: data.avatarId };
    }

    @SubscribeMessage('avatar:unsubscribe')
    handleUnsubscribe(
      @ConnectedSocket() client: Socket,
      @MessageBody() data: { avatarId: string },
    ) {
      client.leave(`avatar:${data.avatarId}`);
      this.logger.log(`Client ${client.id} unsubscribed from avatar ${data.avatarId}`);

      return { event: 'unsubscribed', avatarId: data.avatarId };
    }

    // Called by event listeners
    emitProcessingUpdate(avatarId: string, update: ProcessingUpdate) {
      this.server.to(`avatar:${avatarId}`).emit('avatar:processing:update', update);
    }

    emitProcessingComplete(avatarId: string, data: any) {
      this.server.to(`avatar:${avatarId}`).emit('avatar:processing:complete', data);
    }

    emitProcessingError(avatarId: string, error: any) {
      this.server.to(`avatar:${avatarId}`).emit('avatar:processing:error', error);
    }

    emitToUser(userId: string, event: string, data: any) {
      const socketIds = this.userSockets.get(userId);

      if (socketIds) {
        socketIds.forEach(socketId => {
          this.server.to(socketId).emit(event, data);
        });
      }
    }
  }
  ```
- [ ] Implement event subscribers
  ```typescript
  @Injectable()
  export class AvatarEventSubscriber {
    constructor(
      private readonly avatarGateway: AvatarGateway,
    ) {}

    @OnEvent('avatar.status.update')
    handleStatusUpdate(payload: StatusUpdateEvent) {
      this.avatarGateway.emitProcessingUpdate(payload.avatarId, {
        avatarId: payload.avatarId,
        status: payload.status,
        message: payload.message,
        timestamp: payload.timestamp,
      });
    }

    @OnEvent('avatar.processing.progress')
    handleProgress(payload: ProgressEvent) {
      this.avatarGateway.emitProcessingUpdate(payload.avatarId, {
        avatarId: payload.avatarId,
        progress: payload.progress,
        currentStep: payload.currentStep,
        timestamp: new Date(),
      });
    }

    @OnEvent('avatar.processing.completed')
    handleProcessingComplete(payload: CompletedEvent) {
      this.avatarGateway.emitProcessingComplete(payload.avatarId, {
        avatarId: payload.avatarId,
        modelUrl: payload.modelUrl,
        thumbnailUrl: payload.thumbnailUrl,
        processingTime: payload.processingTime,
      });
    }

    @OnEvent('avatar.processing.failed')
    handleProcessingFailed(payload: FailedEvent) {
      this.avatarGateway.emitProcessingError(payload.avatarId, {
        avatarId: payload.avatarId,
        error: payload.error,
        retryable: payload.retryable,
      });
    }
  }
  ```
- [ ] Add authentication middleware
- [ ] Implement room management
- [ ] Write WebSocket tests

**Deliverables**:
- WebSocket gateway
- Event subscribers
- Authentication
- Tests

**Team**: Backend Developer (1)
**Estimated Time**: 3 days

#### Day 4-5: Frontend WebSocket Client (Example)
**Tasks**:
- [ ] Create WebSocket client utilities
- [ ] Add reconnection logic
- [ ] Implement progress visualization
- [ ] Write client tests

**Deliverables**:
- Client utilities
- Reconnection handling
- Progress UI
- Tests

**Team**: Frontend Developer (1)
**Estimated Time**: 2 days

### 6.2 Week 14: Caching Strategy

#### Day 1-3: Redis Caching Implementation
**Tasks**:
- [ ] Implement cache service
  ```typescript
  @Injectable()
  export class CacheService {
    constructor(
      @InjectRedis() private readonly redis: Redis,
    ) {}

    async cacheAvatar(avatarId: string, avatar: Avatar, ttl: number = 3600): Promise<void> {
      const key = `avatar:${avatarId}:metadata`;
      await this.redis.setex(key, ttl, JSON.stringify(avatar));
    }

    async getCachedAvatar(avatarId: string): Promise<Avatar | null> {
      const key = `avatar:${avatarId}:metadata`;
      const cached = await this.redis.get(key);

      return cached ? JSON.parse(cached) : null;
    }

    async cacheMeasurements(
      avatarId: string,
      measurements: Measurements,
      ttl: number = 3600,
    ): Promise<void> {
      const key = `avatar:${avatarId}:measurements`;
      await this.redis.setex(key, ttl, JSON.stringify(measurements));
    }

    async getCachedMeasurements(avatarId: string): Promise<Measurements | null> {
      const key = `avatar:${avatarId}:measurements`;
      const cached = await this.redis.get(key);

      return cached ? JSON.parse(cached) : null;
    }

    async cacheUserAvatars(userId: string, avatarIds: string[], ttl: number = 1800): Promise<void> {
      const key = `user:${userId}:avatars`;
      await this.redis.setex(key, ttl, JSON.stringify(avatarIds));
    }

    async getCachedUserAvatars(userId: string): Promise<string[] | null> {
      const key = `user:${userId}:avatars`;
      const cached = await this.redis.get(key);

      return cached ? JSON.parse(cached) : null;
    }

    async invalidateAvatar(avatarId: string): Promise<void> {
      const keys = [
        `avatar:${avatarId}:metadata`,
        `avatar:${avatarId}:measurements`,
        `avatar:${avatarId}:processing`,
      ];

      await this.redis.del(...keys);
    }

    async invalidateUserAvatars(userId: string): Promise<void> {
      const key = `user:${userId}:avatars`;
      await this.redis.del(key);
    }
  }
  ```
- [ ] Add cache-aside pattern to repositories
- [ ] Implement cache invalidation
- [ ] Add cache warming
- [ ] Write cache tests

**Deliverables**:
- Cache service
- Cache-aside implementation
- Invalidation logic
- Tests

**Team**: Backend Developer (1)
**Estimated Time**: 3 days

#### Day 4-5: Rate Limiting
**Tasks**:
- [ ] Implement rate limiting service
  ```typescript
  @Injectable()
  export class RateLimitService {
    constructor(@InjectRedis() private readonly redis: Redis) {}

    async checkRateLimit(
      userId: string,
      action: string,
      limit: number,
      window: number, // seconds
    ): Promise<{ allowed: boolean; remaining: number }> {
      const key = `ratelimit:${action}:${userId}`;

      const current = await this.redis.incr(key);

      if (current === 1) {
        await this.redis.expire(key, window);
      }

      const remaining = Math.max(0, limit - current);

      return {
        allowed: current <= limit,
        remaining,
      };
    }

    async checkAvatarCreationLimit(userId: string): Promise<boolean> {
      const result = await this.checkRateLimit(
        userId,
        'avatar:create',
        5, // 5 avatars
        3600, // per hour
      );

      return result.allowed;
    }
  }
  ```
- [ ] Add rate limiting middleware
- [ ] Configure limits per endpoint
- [ ] Add rate limit headers to responses
- [ ] Write rate limit tests

**Deliverables**:
- Rate limiting service
- Middleware
- Configuration
- Tests

**Team**: Backend Developer (1)
**Estimated Time**: 2 days

### 6.3 Week 15-16: Monitoring & Production Deployment

#### Week 15: Monitoring & Observability
**Tasks**:
- [ ] Set up Prometheus metrics
  ```typescript
  @Injectable()
  export class MetricsService {
    private readonly avatarProcessingDuration: Histogram;
    private readonly avatarProcessingTotal: Counter;
    private readonly avatarProcessingErrors: Counter;
    private readonly activeProcessingJobs: Gauge;

    constructor(private readonly promClient: typeof prometheus) {
      this.avatarProcessingDuration = new promClient.Histogram({
        name: 'avatar_processing_duration_seconds',
        help: 'Duration of avatar processing in seconds',
        labelNames: ['status'],
        buckets: [10, 30, 60, 90, 120, 180],
      });

      this.avatarProcessingTotal = new promClient.Counter({
        name: 'avatar_processing_total',
        help: 'Total number of avatar processing jobs',
        labelNames: ['status'],
      });

      this.avatarProcessingErrors = new promClient.Counter({
        name: 'avatar_processing_errors_total',
        help: 'Total number of avatar processing errors',
        labelNames: ['error_type'],
      });

      this.activeProcessingJobs = new promClient.Gauge({
        name: 'avatar_active_processing_jobs',
        help: 'Number of currently active processing jobs',
      });
    }

    recordProcessingDuration(duration: number, status: string) {
      this.avatarProcessingDuration.observe({ status }, duration);
    }

    incrementProcessingTotal(status: string) {
      this.avatarProcessingTotal.inc({ status });
    }

    incrementProcessingError(errorType: string) {
      this.avatarProcessingErrors.inc({ error_type: errorType });
    }

    setActiveJobs(count: number) {
      this.activeProcessingJobs.set(count);
    }
  }
  ```
- [ ] Configure CloudWatch integration
- [ ] Set up Sentry error tracking
- [ ] Create Grafana dashboards
- [ ] Configure alerts
- [ ] Document monitoring setup

**Deliverables**:
- Prometheus metrics
- CloudWatch logs
- Sentry integration
- Grafana dashboards
- Alert configuration

**Team**: Backend Developer (1), DevOps (1)
**Estimated Time**: 5 days

#### Week 16: Production Deployment
**Tasks**:
- [ ] Create production Kubernetes manifests
- [ ] Set up production databases
- [ ] Configure production S3 buckets
- [ ] Set up CloudFront CDN
- [ ] Configure production secrets
- [ ] Set up CI/CD pipeline
- [ ] Run smoke tests
- [ ] Deploy to staging
- [ ] Run load tests
- [ ] Deploy to production
- [ ] Monitor deployment
- [ ] Document deployment process

**Deliverables**:
- Production infrastructure
- CI/CD pipeline
- Deployment documentation
- Load test results
- Production deployment

**Team**: Backend Developer (1), DevOps (1), QA (1)
**Estimated Time**: 5 days

---

## 7. Phase 5: Optimization & Scale (Weeks 17-20)

### 7.1 Week 17-18: Performance Optimization

#### Performance Testing
**Tasks**:
- [ ] Set up k6 load testing
  ```javascript
  // loadtest/avatar-creation.js
  import http from 'k6/http';
  import { check, sleep } from 'k6';

  export let options = {
    stages: [
      { duration: '2m', target: 100 },  // Ramp up to 100 users
      { duration: '5m', target: 100 },  // Stay at 100 users
      { duration: '2m', target: 200 },  // Ramp up to 200 users
      { duration: '5m', target: 200 },  // Stay at 200 users
      { duration: '2m', target: 0 },    // Ramp down to 0 users
    ],
    thresholds: {
      http_req_duration: ['p(95)<2000'], // 95% of requests must complete within 2s
      http_req_failed: ['rate<0.01'],    // Error rate must be less than 1%
    },
  };

  export default function () {
    const url = 'https://api.fashionwallet.com/api/v1/avatars/photo-based';

    const formData = {
      name: 'Load Test Avatar',
      unit: 'metric',
      front: http.file(open('./fixtures/front.jpg', 'b'), 'front.jpg'),
    };

    const params = {
      headers: {
        'Authorization': `Bearer ${__ENV.AUTH_TOKEN}`,
      },
    };

    const res = http.post(url, formData, params);

    check(res, {
      'status is 201': (r) => r.status === 201,
      'has avatarId': (r) => JSON.parse(r.body).avatarId !== undefined,
    });

    sleep(1);
  }
  ```
- [ ] Run load tests
- [ ] Identify bottlenecks
- [ ] Optimize database queries
- [ ] Optimize S3 uploads
- [ ] Optimize model generation
- [ ] Re-run load tests
- [ ] Document performance improvements

**Deliverables**:
- Load test suite
- Performance benchmarks
- Optimization implementations
- Performance report

**Team**: Backend Developer (1), DevOps (1)
**Estimated Time**: 10 days

### 7.2 Week 19: Security Hardening

#### Security Audit
**Tasks**:
- [ ] Run security scan (npm audit, Snyk)
- [ ] Implement input sanitization
- [ ] Add request signing for ML service
- [ ] Implement photo malware scanning
  ```typescript
  @Injectable()
  export class SecurityService {
    async scanFile(file: Express.Multer.File): Promise<ScanResult> {
      // Use ClamAV or similar
      const scanner = new ClamAV();

      const result = await scanner.scanBuffer(file.buffer);

      if (result.isInfected) {
        this.logger.warn(`Infected file detected: ${result.viruses.join(', ')}`);
        throw new BadRequestException('File contains malware');
      }

      return {
        safe: true,
        scannedAt: new Date(),
      };
    }
  }
  ```
- [ ] Implement CSRF protection
- [ ] Add API key rotation
- [ ] Review and fix security vulnerabilities
- [ ] Run penetration tests
- [ ] Document security measures

**Deliverables**:
- Security scan results
- Security implementations
- Penetration test report
- Security documentation

**Team**: Backend Developer (1), Security Engineer (0.5)
**Estimated Time**: 5 days

### 7.3 Week 20: Documentation & Handoff

#### Comprehensive Documentation
**Tasks**:
- [ ] Complete API documentation (OpenAPI/Swagger)
- [ ] Write developer guide
- [ ] Create architecture diagrams
- [ ] Document deployment procedures
- [ ] Create troubleshooting guide
- [ ] Write user guide
- [ ] Record demo videos
- [ ] Conduct knowledge transfer sessions
- [ ] Create runbooks for operations

**Deliverables**:
- Complete API documentation
- Developer guide
- Architecture documentation
- Deployment guide
- Troubleshooting guide
- Demo videos
- Runbooks

**Team**: Backend Developer (1), Technical Writer (0.5)
**Estimated Time**: 5 days

---

## 8. Testing Strategy

### 8.1 Unit Testing
```yaml
Target Coverage: >80%
Framework: Jest
Files to Test:
  - Services
  - Repositories
  - Utils
  - Validators
  - DTOs

Example:
  # src/modules/avatar/services/__tests__/avatar.service.spec.ts
```

### 8.2 Integration Testing
```yaml
Target Coverage: >70%
Framework: Jest + Supertest
Environment: Docker Compose

Tests:
  - API endpoints
  - Database operations
  - S3 interactions
  - Queue operations
  - WebSocket events
```

### 8.3 E2E Testing
```yaml
Framework: Playwright (optional)
Environment: Staging

Scenarios:
  - Complete avatar creation flow
  - Photo upload and processing
  - Measurement updates
  - Model download
  - Error scenarios
```

### 8.4 Performance Testing
```yaml
Tool: k6
Scenarios:
  - Load test: 1000 concurrent users
  - Stress test: Find breaking point
  - Spike test: Sudden traffic burst
  - Soak test: 24-hour sustained load

Metrics:
  - Response time p95 < 2s
  - Error rate < 1%
  - Processing time < 60s
```

---

## 9. Risk Management

### 9.1 Technical Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| ML model accuracy too low | Medium | High | Implement fallback to manual measurements |
| Processing time exceeds 60s | High | Medium | Optimize pipeline, add more workers |
| S3 costs too high | Medium | Medium | Implement lifecycle policies, compression |
| MongoDB storage grows quickly | High | Medium | Add data retention policies |
| Worker crashes | Medium | High | Implement robust error handling and retries |

### 9.2 Schedule Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| ML integration delays | High | High | Start with stub service, parallel development |
| 3D model generation complexity | Medium | High | Simplify initial implementation |
| Performance issues | Medium | Medium | Early load testing, continuous optimization |
| Team resource constraints | Low | High | Cross-train team members |

---

## 10. Dependencies & Prerequisites

### 10.1 External Dependencies
- [ ] AWS account with S3, CloudFront access
- [ ] PostgreSQL 15+ instance
- [ ] MongoDB 7+ instance
- [ ] Redis 7+ instance
- [ ] Authentication service (JWT tokens)
- [ ] User service (user data)

### 10.2 Development Tools
- [ ] Node.js 20+
- [ ] TypeScript 5+
- [ ] Docker & Docker Compose
- [ ] Python 3.11+ (for ML service)
- [ ] GPU instance for ML (optional for development)

### 10.3 Team Skills Required
- Backend development (Node.js, NestJS)
- Database design (PostgreSQL, MongoDB)
- ML/AI (Python, TensorFlow/PyTorch)
- 3D graphics (Three.js)
- DevOps (Docker, Kubernetes, AWS)
- Testing (Jest, k6)

---

## 11. Success Metrics

### 11.1 Technical Metrics
- [ ] Avatar processing time p95 < 60 seconds
- [ ] Measurement accuracy ±2cm (validated against manual measurements)
- [ ] API response time p95 < 200ms
- [ ] 99.9% uptime
- [ ] Error rate < 1%
- [ ] Test coverage > 80%

### 11.2 Business Metrics
- [ ] 1000+ concurrent processing jobs support
- [ ] Support 10,000+ active users
- [ ] <1% user-reported accuracy issues
- [ ] <5% processing failure rate
- [ ] 95% user satisfaction score

---

## 12. Timeline Summary

| Phase | Duration | Key Deliverables |
|-------|----------|------------------|
| Phase 1: Foundation | 4 weeks | Database, API, File uploads |
| Phase 2: Core Processing | 4 weeks | Queue system, ML integration, Measurements |
| Phase 3: 3D Generation | 4 weeks | Model generation, Storage, Complete pipeline |
| Phase 4: Production Ready | 4 weeks | WebSocket, Caching, Monitoring, Deployment |
| Phase 5: Optimization | 4 weeks | Performance, Security, Documentation |
| **Total** | **20 weeks** | **Production-ready Avatar Service** |

---

## 13. Next Steps

### Immediate Actions (Week 1)
1. Set up development environment
2. Create database schemas
3. Initialize project structure
4. Set up Docker Compose
5. Begin API implementation

### Review Checkpoints
- **Week 4**: Foundation review (database, API, uploads)
- **Week 8**: Processing review (queue, ML, measurements)
- **Week 12**: Model generation review (3D models, storage)
- **Week 16**: Production readiness review
- **Week 20**: Final delivery and handoff

---

## Document Metadata

**Version**: 1.0
**Author**: Fashion Wallet Development Team
**Status**: Draft
**Review Cycle**: Weekly during implementation
**Next Review**: Start of Phase 1

**Related Documents**:
- spec-arch-01-avatar-service.md (Architecture Specification)
- plan-infra-00.md (Database Infrastructure Plan)

---

**End of Avatar Service Implementation Plan**

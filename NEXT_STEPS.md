# Next Steps for Avatar Service Implementation

## 🚦 Quick Start Guide

### Step 1: Fix Build Errors (REQUIRED FIRST)

The project currently has 94 build errors that must be resolved before proceeding.

```bash
# Check current errors
npm run build 2>&1 | grep "ERROR" | wc -l

# Most errors are in utility files, not core Avatar Service
# You may be able to temporarily comment out problematic utilities
# or fix them one by one
```

**Option A**: Fix all errors (recommended but time-consuming)
**Option B**: Comment out broken utilities temporarily to get a working build
**Option C**: Use `ts-node` to run migrations without a full build

---

### Step 2: Start Docker & Create Database

```bash
# Start all services
docker-compose up -d

# Check services are running
docker ps

# You should see:
# - fashion_wallet_postgres
# - fashion_wallet_mongodb
# - fashion_wallet_redis
# - fashion_wallet_minio
# - fashion_wallet_ml_service

# Run the migration
npm run migration:run

# Verify migration succeeded
npm run migration:show

# Check tables were created
docker exec -it fashion_wallet_postgres psql -U postgres -d fashion_wallet

# In psql:
\c fashion_wallet
\dn  # List schemas (should see 'avatar')
\dt avatar.*  # List tables (should see avatars, measurements, photos, processing_jobs)
\q  # Quit
```

---

### Step 3: Implement AvatarService.createFromPhotos()

**File**: `src/modules/avatar/services/avatar.service.ts`

**Current state**: Skeleton with stub methods

**What to implement**:

```typescript
async createFromPhotos(
  userId: string,
  files: PhotoFiles,
  dto: CreateAvatarFromPhotosDto,
): Promise<CreateAvatarResponse> {
  // 1. Validate photos
  await this.photoValidationService.validatePhotos(files);

  // 2. Create avatar record
  const avatar = await this.avatarRepo.create({
    userId,
    name: dto.name,
    status: AvatarStatus.PENDING,
    source: AvatarSource.PHOTO_BASED,
    customization: dto.customization,
  });

  // 3. Upload photos to S3
  const photoUploads = await Promise.all([
    files.front?.[0] && this.storageService.uploadPhoto(avatar.id, files.front[0], 'front'),
    files.side?.[0] && this.storageService.uploadPhoto(avatar.id, files.side[0], 'side'),
    files.back?.[0] && this.storageService.uploadPhoto(avatar.id, files.back[0], 'back'),
  ].filter(Boolean));

  // 4. Save photo records
  for (const upload of photoUploads) {
    if (upload) {
      await this.photoRepo.create({
        avatarId: avatar.id,
        type: upload.type, // You'll need to track this
        status: PhotoStatus.UPLOADED,
        originalUrl: upload.url,
        originalS3Key: upload.key,
        originalFilename: upload.filename,
        fileSizeBytes: upload.size,
        mimeType: upload.mimeType,
      });
    }
  }

  // 5. Queue processing job
  const job = await this.queueService.addProcessingJob({
    avatarId: avatar.id,
    userId,
    photoUrls: {
      front: photoUploads[0]?.url,
      side: photoUploads[1]?.url,
      back: photoUploads[2]?.url,
    },
    unit: dto.unit,
    customization: dto.customization,
  });

  // 6. Update avatar status
  await this.avatarRepo.update(avatar.id, {
    status: AvatarStatus.PROCESSING,
  });

  // 7. Emit event
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
```

**Dependencies to inject**:
- `AvatarRepository`
- `PhotoRepository`
- `StorageService`
- `PhotoValidationService`
- `QueueService` (from queue module)
- `EventEmitter2`

---

### Step 4: Implement AvatarProcessingProcessor

**File**: `src/modules/avatar/processors/avatar-processing.processor.ts`

**Template**:

```typescript
import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { EventEmitter2 } from '@nestjs/event-emitter';

@Processor('avatar-processing')
export class AvatarProcessingProcessor {
  private readonly logger = new Logger(AvatarProcessingProcessor.name);

  constructor(
    private readonly avatarRepo: AvatarRepository,
    private readonly measurementRepo: MeasurementRepository,
    private readonly photoRepo: PhotoRepository,
    private readonly processingJobRepo: ProcessingJobRepository,
    private readonly mlService: MockMLService, // Use MockMLService for now
    private readonly modelGenerationService: ModelGenerationService,
    private readonly storageService: StorageService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  @Process('avatar:process-photos')
  async processPhotos(job: Job<AvatarProcessingJobData>): Promise<ProcessingResult> {
    const { avatarId, userId, photoUrls, unit, customization } = job.data;

    this.logger.log(`Processing avatar ${avatarId}`);

    try {
      // Create processing job record
      await this.processingJobRepo.create({
        id: job.id as string,
        avatarId,
        userId,
        jobType: ProcessingJobType.PHOTO_PROCESSING,
        status: ProcessingJobStatus.PROCESSING,
        inputData: { photoUrls, unit, customization },
        startedAt: new Date(),
      });

      // Step 1: Get photos (10%)
      await job.updateProgress(10);
      await this.updateStatus(avatarId, 'processing', 'Loading photos');
      const photos = await this.getPhotos(avatarId);

      // Step 2: Background removal (20%)
      await job.updateProgress(20);
      await this.updateStatus(avatarId, 'processing', 'Removing background');
      const processedPhotos = await this.mlService.removeBackground(
        photos.map(p => ({ url: p.originalUrl, type: p.type }))
      );

      // Step 3: Pose detection (40%)
      await job.updateProgress(40);
      await this.updateStatus(avatarId, 'processing', 'Detecting pose');
      const landmarks = await this.mlService.detectPose(processedPhotos);

      // Step 4: Measurement extraction (60%)
      await job.updateProgress(60);
      await this.updateStatus(avatarId, 'processing', 'Extracting measurements');
      const measurements = await this.mlService.extractMeasurements(
        landmarks,
        processedPhotos[0],
        unit
      );

      // Step 5: Save measurements (70%)
      await job.updateProgress(70);
      await this.saveMeasurements(avatarId, measurements);

      // Step 6: Body type classification (75%)
      await job.updateProgress(75);
      const bodyType = await this.mlService.classifyBodyType(measurements);
      await this.avatarRepo.update(avatarId, { bodyType: bodyType.bodyType });

      // Step 7: 3D model generation (80%)
      await job.updateProgress(80);
      await this.updateStatus(avatarId, 'processing', 'Generating 3D model');
      // TODO: Implement when ModelGenerationService is ready
      // const model = await this.modelGenerationService.generateModel({...});

      // Step 8: Complete (100%)
      await job.updateProgress(100);
      await this.updateStatus(avatarId, 'ready', 'Processing complete');

      // Update job record
      await this.processingJobRepo.update(job.id as string, {
        status: ProcessingJobStatus.COMPLETED,
        completedAt: new Date(),
        resultData: { measurements, bodyType },
      });

      // Emit completion event
      this.eventEmitter.emit('avatar.processing.completed', {
        avatarId,
        userId,
        jobId: job.id,
      });

      return {
        success: true,
        avatarId,
      };

    } catch (error) {
      this.logger.error(`Failed to process avatar ${avatarId}:`, error);

      await this.updateStatus(avatarId, 'error', error.message);

      await this.processingJobRepo.update(job.id as string, {
        status: ProcessingJobStatus.FAILED,
        failedAt: new Date(),
        errorMessage: error.message,
        errorStack: error.stack,
      });

      this.eventEmitter.emit('avatar.processing.failed', {
        avatarId,
        userId,
        error: error.message,
      });

      throw error;
    }
  }

  private async updateStatus(
    avatarId: string,
    status: string,
    message?: string,
  ): Promise<void> {
    await this.avatarRepo.updateStatus(avatarId, status as AvatarStatus, message);

    this.eventEmitter.emit('avatar.status.update', {
      avatarId,
      status,
      message,
      timestamp: new Date(),
    });
  }

  private async getPhotos(avatarId: string): Promise<Photo[]> {
    return this.photoRepo.findByAvatarId(avatarId);
  }

  private async saveMeasurements(
    avatarId: string,
    measurements: any,
  ): Promise<void> {
    await this.measurementRepo.create({
      avatarId,
      ...measurements,
      source: MeasurementSource.AUTO,
    });
  }
}
```

---

### Step 5: Test the Flow

#### 5.1. Create a Test Script

**File**: `test-avatar-creation.sh`

```bash
#!/bin/bash

# Test avatar creation
curl -X POST http://localhost:3000/api/v1/avatars/photo-based \
  -H "Content-Type: multipart/form-data" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "name=Test Avatar" \
  -F "unit=metric" \
  -F "front=@./test/fixtures/front.jpg" \
  -F "side=@./test/fixtures/side.jpg" \
  -F "back=@./test/fixtures/back.jpg"
```

#### 5.2. Check Results

```bash
# Check if avatar was created in database
docker exec -it fashion_wallet_postgres psql -U postgres -d fashion_wallet -c \
  "SELECT id, name, status, created_at FROM avatar.avatars;"

# Check if photos were uploaded
docker exec -it fashion_wallet_postgres psql -U postgres -d fashion_wallet -c \
  "SELECT id, avatar_id, type, status FROM avatar.photos;"

# Check processing job
docker exec -it fashion_wallet_postgres psql -U postgres -d fashion_wallet -c \
  "SELECT id, avatar_id, status, progress FROM avatar.processing_jobs;"

# Check queue in Redis
docker exec -it fashion_wallet_redis redis-cli KEYS "bull:avatar-processing:*"
```

---

## 🔧 Troubleshooting

### Build Errors

**Problem**: 94 build errors
**Solution**: Focus on fixing errors in core files first:
1. Queue module (fixed ✅)
2. Avatar service files
3. Processor files
4. Leave utility file errors for later

### Database Connection Issues

**Problem**: Cannot connect to PostgreSQL
**Solution**:
1. Check Docker is running: `docker ps`
2. Check environment variables in `.env`
3. Try direct connection: `psql -h localhost -U postgres -d fashion_wallet`

### Queue Not Processing

**Problem**: Jobs stuck in queue
**Solution**:
1. Check Redis is running
2. Check BullMQ worker is registered
3. Check logs: `docker logs fashion_wallet_backend`

### S3 Upload Fails

**Problem**: Photos not uploading
**Solution**:
1. Check MinIO is running: `docker ps`
2. Access MinIO console: `http://localhost:9001`
3. Create bucket manually if needed
4. Check AWS SDK configuration

---

## 📚 Key References

### Documentation
- Implementation plan: `docs/plans/plan-arch-01-avatar-service.md`
- Progress report: `IMPLEMENTATION_PROGRESS.md`
- This file: `NEXT_STEPS.md`

### Code Files (Priority Order)
1. `src/modules/avatar/services/avatar.service.ts` - **START HERE**
2. `src/modules/avatar/processors/avatar-processing.processor.ts` - **THEN THIS**
3. `src/modules/avatar/repositories/*.repository.ts` - Already done ✅
4. `src/infrastructure/database/migrations/postgres/1732100000000-CreateAvatarTables.ts` - Done ✅

### Dependencies
- Avatar service needs: QueueService (from QueueModule)
- Processor needs: All repositories + ML service
- Both need: EventEmitter2

---

## ✅ Success Criteria

You'll know you're done when:

1. ✅ Build completes with 0 errors
2. ✅ Migration runs successfully
3. ✅ Can create an avatar via API
4. ✅ Photos upload to MinIO
5. ✅ Job appears in queue
6. ✅ Worker processes the job
7. ✅ Measurements saved to database
8. ✅ Avatar status = "ready"
9. ✅ Can retrieve avatar via API

---

## 💬 Questions to Answer

As you implement, ask yourself:

1. **Does the controller have all the right decorators?** (@Post, @UseGuards, @UseInterceptors)
2. **Are all dependencies injected?** (Constructor parameters)
3. **Is error handling comprehensive?** (Try-catch blocks, meaningful errors)
4. **Are events being emitted?** (For WebSocket real-time updates)
5. **Is progress being tracked?** (Job progress updates)
6. **Are database transactions needed?** (For multi-table operations)
7. **Is the code testable?** (Can you mock dependencies?)

---

**Last Updated**: November 17, 2025
**Next Review**: After Step 3 (AvatarService) is complete

Good luck! 🚀

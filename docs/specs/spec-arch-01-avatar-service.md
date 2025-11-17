# Architecture Specification: Avatar Service

## Document Overview

**Version**: 1.0
**Last Updated**: November 2025
**Document Type**: Architecture Specification
**Status**: Draft
**Spec ID**: spec-arch-01

---

## 1. Executive Summary

The Avatar Service is a microservice responsible for creating, processing, and managing personalized 3D user avatars. It combines computer vision, machine learning, and parametric 3D modeling to generate measurement-accurate digital representations of users for garment visualization and virtual try-on experiences.

### 1.1 Architecture Goals

- **Performance**: Process avatar photos in under 60 seconds
- **Scalability**: Handle 1000+ concurrent avatar processing jobs
- **Accuracy**: Achieve ±2cm measurement accuracy
- **Reliability**: 99.9% uptime with graceful degradation
- **Security**: GDPR-compliant photo and measurement storage

---

## 2. System Architecture Overview

### 2.1 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Client Layer                             │
│  (Web App, Mobile App, API Clients)                             │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                      API Gateway Layer                           │
│  - Authentication/Authorization (JWT)                            │
│  - Rate Limiting                                                 │
│  - Request Validation                                            │
│  - API Versioning                                                │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                   Avatar Service (Node.js)                       │
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │   REST API   │  │  WebSocket   │  │   GraphQL    │         │
│  │  Controllers │  │   Handler    │  │   Resolver   │         │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘         │
│         │                  │                  │                  │
│         └──────────────────┼──────────────────┘                  │
│                            │                                     │
│  ┌─────────────────────────┴─────────────────────────┐          │
│  │           Business Logic Layer                     │          │
│  │  ┌──────────────┐  ┌──────────────┐               │          │
│  │  │Avatar Service│  │Measurement   │               │          │
│  │  │              │  │Extraction Svc│               │          │
│  │  └──────┬───────┘  └──────┬───────┘               │          │
│  │         │                  │                        │          │
│  │  ┌──────┴───────┐  ┌──────┴───────┐               │          │
│  │  │3D Model Gen  │  │Validation Svc│               │          │
│  │  │Service       │  │              │               │          │
│  │  └──────────────┘  └──────────────┘               │          │
│  └───────────────────────────────────────────────────┘          │
│                            │                                     │
│  ┌─────────────────────────┴─────────────────────────┐          │
│  │           Data Access Layer                        │          │
│  │  ┌──────────────┐  ┌──────────────┐               │          │
│  │  │Avatar Repo   │  │Measurement   │               │          │
│  │  │              │  │Repo          │               │          │
│  │  └──────────────┘  └──────────────┘               │          │
│  └────────────────────────────────────────────────────┘          │
└────────────────────────┬────────────────────────────────────────┘
                         │
         ┌───────────────┼───────────────┐
         │               │               │
         ▼               ▼               ▼
┌─────────────┐ ┌─────────────┐ ┌─────────────┐
│ PostgreSQL  │ │  MongoDB    │ │   Redis     │
│ (Metadata)  │ │ (3D Models) │ │  (Cache)    │
└─────────────┘ └─────────────┘ └─────────────┘
         │               │               │
         └───────────────┼───────────────┘
                         │
         ┌───────────────┼───────────────┐
         │               │               │
         ▼               ▼               ▼
┌─────────────┐ ┌─────────────┐ ┌─────────────┐
│     S3      │ │   BullMQ    │ │   ML/AI     │
│ (Storage)   │ │  (Queue)    │ │  Services   │
└─────────────┘ └─────────────┘ └─────────────┘
         │               │               │
         └───────────────┼───────────────┘
                         │
         ┌───────────────┼───────────────┐
         │               │               │
         ▼               ▼               ▼
┌─────────────┐ ┌─────────────┐ ┌─────────────┐
│ CloudWatch  │ │   Sentry    │ │ DataDog     │
│ (Logs)      │ │  (Errors)   │ │ (Metrics)   │
└─────────────┘ └─────────────┘ └─────────────┘
```

### 2.2 Component Responsibilities

#### 2.2.1 API Layer
- **REST API Controllers**: Handle synchronous HTTP requests
- **WebSocket Handler**: Real-time processing updates
- **GraphQL Resolver**: Flexible data querying

#### 2.2.2 Business Logic Layer
- **Avatar Service**: Core avatar CRUD operations
- **Measurement Extraction Service**: ML-powered measurement extraction
- **3D Model Generation Service**: Parametric model creation
- **Validation Service**: Measurement and data validation

#### 2.2.3 Data Layer
- **PostgreSQL**: Structured metadata, measurements, relationships
- **MongoDB**: Binary 3D model data, flexible schemas
- **Redis**: Caching, session management, rate limiting
- **S3**: Photo storage, model files, exports

#### 2.2.4 Processing Layer
- **BullMQ**: Job queue for async processing
- **ML/AI Services**: Computer vision models
- **Worker Pools**: Parallel processing capabilities

---

## 3. Component Architecture

### 3.1 Avatar Processing Pipeline

```
Photo Upload → Validation → Storage → Queue Job → ML Processing
                                            ↓
                                     Background Removal
                                            ↓
                                     Pose Detection
                                            ↓
                                  Measurement Extraction
                                            ↓
                                   Body Type Classification
                                            ↓
                                    3D Model Generation
                                            ↓
                                   Model Optimization
                                            ↓
                                  Storage & Notification
```

#### 3.1.1 Photo Upload & Validation
```typescript
┌─────────────────────────────────────────────────────────┐
│                    Photo Upload Flow                     │
│                                                          │
│  Client Request                                          │
│       ↓                                                  │
│  ┌─────────────────────┐                                │
│  │ Multipart Parser    │ - Parse form data              │
│  │                     │ - Extract photos               │
│  └──────────┬──────────┘                                │
│             ↓                                            │
│  ┌─────────────────────┐                                │
│  │ Photo Validator     │ - Check file size (< 10MB)    │
│  │                     │ - Verify format (JPEG/PNG)     │
│  │                     │ - Validate resolution          │
│  │                     │ - EXIF data extraction         │
│  └──────────┬──────────┘                                │
│             ↓                                            │
│  ┌─────────────────────┐                                │
│  │ Privacy Handler     │ - Strip location data          │
│  │                     │ - Remove sensitive EXIF        │
│  │                     │ - Hash filename                │
│  └──────────┬──────────┘                                │
│             ↓                                            │
│  ┌─────────────────────┐                                │
│  │ S3 Upload           │ - Generate unique key          │
│  │                     │ - Upload to temp bucket        │
│  │                     │ - Return signed URL            │
│  └──────────┬──────────┘                                │
│             ↓                                            │
│  ┌─────────────────────┐                                │
│  │ Job Queue           │ - Create processing job        │
│  │                     │ - Set priority                 │
│  │                     │ - Return job ID                │
│  └─────────────────────┘                                │
└──────────────────────────────────────────────────────────┘
```

#### 3.1.2 ML Processing Pipeline
```typescript
┌─────────────────────────────────────────────────────────┐
│                  ML Processing Worker                    │
│                                                          │
│  Job Start                                               │
│       ↓                                                  │
│  ┌─────────────────────┐                                │
│  │ Download Photos     │ - Fetch from S3                │
│  │                     │ - Load into memory             │
│  └──────────┬──────────┘                                │
│             ↓                                            │
│  ┌─────────────────────┐                                │
│  │ Background Removal  │ - SAM/U2-Net model             │
│  │                     │ - Alpha mask generation        │
│  │                     │ - Quality check                │
│  └──────────┬──────────┘                                │
│             ↓                                            │
│  ┌─────────────────────┐                                │
│  │ Pose Detection      │ - MediaPipe/OpenPose           │
│  │                     │ - 33+ body landmarks           │
│  │                     │ - Confidence scoring           │
│  └──────────┬──────────┘                                │
│             ↓                                            │
│  ┌─────────────────────┐                                │
│  │ Measurement Extract │ - Calculate pixel ratio        │
│  │                     │ - Compute measurements         │
│  │                     │ - Validate proportions         │
│  └──────────┬──────────┘                                │
│             ↓                                            │
│  ┌─────────────────────┐                                │
│  │ Body Classification │ - Classify body type           │
│  │                     │ - Determine proportions        │
│  └──────────┬──────────┘                                │
│             ↓                                            │
│  ┌─────────────────────┐                                │
│  │ 3D Model Generation │ - Load base template           │
│  │                     │ - Apply measurements           │
│  │                     │ - Generate mesh                │
│  │                     │ - Create LOD levels            │
│  └──────────┬──────────┘                                │
│             ↓                                            │
│  ┌─────────────────────┐                                │
│  │ Model Optimization  │ - Mesh decimation              │
│  │                     │ - Texture compression          │
│  │                     │ - GLTF packaging               │
│  └──────────┬──────────┘                                │
│             ↓                                            │
│  ┌─────────────────────┐                                │
│  │ Save Results        │ - Upload to S3                 │
│  │                     │ - Save to PostgreSQL           │
│  │                     │ - Save to MongoDB              │
│  │                     │ - Send notification            │
│  └─────────────────────┘                                │
└──────────────────────────────────────────────────────────┘
```

### 3.2 Data Architecture

#### 3.2.1 PostgreSQL Schema Design
```sql
-- Schema: avatar

-- Core avatar metadata table
CREATE TABLE avatar.avatars (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES shared.users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'processing',
  is_default BOOLEAN DEFAULT false,

  -- Classification
  body_type VARCHAR(50),

  -- File references (S3 URLs)
  model_url TEXT,
  thumbnail_url TEXT,
  lod1_url TEXT,
  lod2_url TEXT,

  -- Metadata
  tags TEXT[],
  metadata JSONB DEFAULT '{}'::jsonb,
  version INTEGER DEFAULT 1,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_used_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ,

  -- Constraints
  CONSTRAINT chk_status CHECK (status IN ('processing', 'ready', 'error', 'archived')),
  CONSTRAINT chk_body_type CHECK (body_type IN ('pear', 'apple', 'rectangle', 'hourglass', 'inverted_triangle'))
);

-- Indexes
CREATE INDEX idx_avatars_user_id ON avatar.avatars(user_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_avatars_status ON avatar.avatars(status);
CREATE UNIQUE INDEX uidx_avatars_default_per_user
  ON avatar.avatars(user_id) WHERE is_default = true AND deleted_at IS NULL;

-- Measurements table
CREATE TABLE avatar.measurements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  avatar_id UUID NOT NULL REFERENCES avatar.avatars(id) ON DELETE CASCADE,

  -- Core measurements (stored in cm)
  height DECIMAL(6,2),
  shoulder_width DECIMAL(6,2),
  chest_circumference DECIMAL(6,2),
  waist_circumference DECIMAL(6,2),
  hip_circumference DECIMAL(6,2),

  -- Extended measurements
  neck_circumference DECIMAL(6,2),
  arm_length DECIMAL(6,2),
  inseam_length DECIMAL(6,2),
  thigh_circumference DECIMAL(6,2),
  calf_circumference DECIMAL(6,2),
  bicep_circumference DECIMAL(6,2),
  forearm_circumference DECIMAL(6,2),

  -- Derived measurements
  torso_length DECIMAL(6,2),
  leg_length DECIMAL(6,2),
  arm_span DECIMAL(6,2),

  -- Metadata
  unit VARCHAR(20) NOT NULL DEFAULT 'metric',
  confidence DECIMAL(5,2),
  measurement_confidence JSONB,
  source VARCHAR(20) DEFAULT 'auto',

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(avatar_id)
);

-- Photos table
CREATE TABLE avatar.photos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  avatar_id UUID NOT NULL REFERENCES avatar.avatars(id) ON DELETE CASCADE,
  type VARCHAR(20) NOT NULL,

  -- File references
  original_url TEXT NOT NULL,
  processed_url TEXT,

  -- Photo metadata
  width INTEGER,
  height INTEGER,
  file_size INTEGER,
  mime_type VARCHAR(50),

  -- Processing results
  landmarks JSONB,
  processing_metadata JSONB,

  uploaded_at TIMESTAMPTZ DEFAULT NOW(),
  processed_at TIMESTAMPTZ,

  CONSTRAINT chk_photo_type CHECK (type IN ('front', 'side', 'back'))
);

CREATE INDEX idx_photos_avatar_id ON avatar.photos(avatar_id);

-- Processing jobs table
CREATE TABLE avatar.processing_jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  avatar_id UUID NOT NULL REFERENCES avatar.avatars(id) ON DELETE CASCADE,
  status VARCHAR(20) NOT NULL DEFAULT 'queued',

  job_type VARCHAR(50) NOT NULL,
  priority INTEGER DEFAULT 5,

  -- Progress tracking
  progress INTEGER DEFAULT 0,
  current_step VARCHAR(100),
  total_steps INTEGER,

  -- Results
  result JSONB,
  error_message TEXT,

  -- Performance metrics
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  duration_ms INTEGER,

  -- Retry logic
  attempts INTEGER DEFAULT 0,
  max_attempts INTEGER DEFAULT 3,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT chk_status CHECK (status IN ('queued', 'processing', 'completed', 'failed', 'cancelled')),
  CONSTRAINT chk_progress CHECK (progress >= 0 AND progress <= 100)
);

CREATE INDEX idx_processing_jobs_status ON avatar.processing_jobs(status, priority);
CREATE INDEX idx_processing_jobs_avatar_id ON avatar.processing_jobs(avatar_id);
```

#### 3.2.2 MongoDB Schema Design
```javascript
// Collection: avatar_models
// Stores binary 3D model data and flexible nested structures

{
  _id: ObjectId,
  avatarId: UUID,  // Reference to PostgreSQL

  // Base mesh data
  mesh: {
    vertices: BinData,  // Binary float array
    faces: BinData,     // Binary int array
    normals: BinData,
    uvs: BinData,
    vertexCount: Number,
    faceCount: Number
  },

  // LOD (Level of Detail) models
  lod: [
    {
      level: Number,  // 1, 2, 3...
      vertices: BinData,
      faces: BinData,
      vertexCount: Number,
      faceCount: Number
    }
  ],

  // Textures
  textures: [
    {
      type: String,  // 'diffuse', 'normal', etc.
      format: String,  // 'png', 'jpg'
      resolution: { width: Number, height: Number },
      url: String,  // S3 URL
      data: BinData  // Optional embedded data
    }
  ],

  // Skeleton (if rigged)
  skeleton: {
    bones: Array,
    bindPose: Array
  },

  // Generation metadata
  generationMetadata: {
    algorithm: String,
    version: String,
    parameters: Object,
    generatedAt: Date,
    processingTime: Number
  },

  createdAt: Date,
  updatedAt: Date
}

// Indexes
db.avatar_models.createIndex({ avatarId: 1 }, { unique: true });
db.avatar_models.createIndex({ "generationMetadata.generatedAt": -1 });
```

#### 3.2.3 Redis Cache Strategy
```typescript
// Cache keys pattern: avatar:{avatarId}:{dataType}

// Avatar metadata cache
Key: `avatar:${avatarId}:metadata`
TTL: 1 hour
Data: {
  id, name, status, model_url, thumbnail_url, ...
}

// Measurements cache
Key: `avatar:${avatarId}:measurements`
TTL: 1 hour
Data: {
  height, chest, waist, hip, ...
}

// Processing status cache
Key: `avatar:${avatarId}:processing`
TTL: 2 hours
Data: {
  status, progress, currentStep, estimatedCompletion
}

// User's avatar list cache
Key: `user:${userId}:avatars`
TTL: 30 minutes
Data: [avatarId1, avatarId2, ...]

// Rate limiting
Key: `ratelimit:avatar:create:${userId}`
TTL: 1 hour
Data: count
```

### 3.3 API Architecture

#### 3.3.1 REST API Endpoints

```typescript
/**
 * Avatar Creation Endpoints
 */

// POST /api/v1/avatars/photo-based
// Create avatar from photos
interface CreateAvatarFromPhotosRequest {
  name: string;
  photos: {
    front: File;
    side?: File;
    back?: File;
  };
  unit?: 'metric' | 'imperial';
  customization?: Partial<AvatarCustomization>;
}

interface CreateAvatarFromPhotosResponse {
  avatarId: string;
  status: 'processing';
  estimatedCompletionTime: number;
  processingJobId: string;
}

// POST /api/v1/avatars/measurement-based
// Create avatar from manual measurements
interface CreateAvatarFromMeasurementsRequest {
  name: string;
  measurements: Partial<BodyMeasurements>;
  unit: 'metric' | 'imperial';
  customization?: Partial<AvatarCustomization>;
}

/**
 * Avatar Management Endpoints
 */

// GET /api/v1/avatars
// List user's avatars
interface ListAvatarsQuery {
  status?: 'processing' | 'ready' | 'error' | 'archived';
  search?: string;
  tags?: string[];
  page?: number;
  limit?: number;
  sortBy?: 'createdAt' | 'updatedAt' | 'name' | 'lastUsedAt';
  sortOrder?: 'asc' | 'desc';
}

// GET /api/v1/avatars/:id
// Get single avatar with full details

// PATCH /api/v1/avatars/:id
// Update avatar metadata or measurements

// DELETE /api/v1/avatars/:id
// Soft delete avatar (or hard delete with ?hard=true)

/**
 * Measurement Endpoints
 */

// GET /api/v1/avatars/:id/measurements
// Get avatar measurements

// PUT /api/v1/avatars/:id/measurements
// Update measurements (triggers model regeneration if requested)

// POST /api/v1/avatars/:id/measurements/validate
// Validate measurements without saving
```

#### 3.3.2 WebSocket Events

```typescript
// Client subscribes to avatar updates
socket.emit('avatar:subscribe', { avatarId: string });

// Server emits processing updates
socket.on('avatar:processing:update', {
  avatarId: string;
  status: 'processing' | 'ready' | 'error';
  progress: number;  // 0-100
  currentStep: string;
  message: string;
  error?: string;
});

// Processing complete
socket.on('avatar:processing:complete', {
  avatarId: string;
  modelUrl: string;
  thumbnailUrl: string;
});

// Processing failed
socket.on('avatar:processing:error', {
  avatarId: string;
  error: string;
  retryable: boolean;
});
```

---

## 4. Technology Stack

### 4.1 Backend Services

```yaml
Runtime:
  - Node.js: v20.x LTS
  - TypeScript: 5.x

Framework:
  - Express.js: REST API framework
  - Socket.io: WebSocket communication
  - Apollo Server: GraphQL (optional)

Database:
  - PostgreSQL: 15.x (Primary database)
  - MongoDB: 7.x (3D model storage)
  - Redis: 7.x (Caching, sessions, rate limiting)

Storage:
  - AWS S3: Photo and model file storage
  - CloudFront: CDN for model delivery

Queue:
  - BullMQ: Job queue for async processing
  - Redis: Queue backend

ML/AI:
  - Python: 3.11 (ML services)
  - TensorFlow: 2.x
  - PyTorch: 2.x
  - MediaPipe: Pose detection
  - SAM/U2-Net: Background removal
```

### 4.2 ML/AI Services

```yaml
Computer Vision Models:
  Background Removal:
    - Primary: SAM (Segment Anything Model)
    - Fallback: U2-Net
    - Hardware: GPU (NVIDIA T4 or better)

  Pose Detection:
    - Primary: MediaPipe Pose
    - Fallback: OpenPose
    - Output: 33 body landmarks (x, y, z, visibility)

  Measurement Extraction:
    - Custom trained model
    - Rule-based system as fallback
    - Confidence scoring per measurement

  Body Type Classification:
    - Custom CNN classifier
    - Categories: 5 body types
    - Accuracy target: >90%

3D Model Generation:
  - Three.js: 3D rendering and manipulation
  - Draco: 3D model compression
  - GLTF Pipeline: Model optimization
```

### 4.3 Infrastructure

```yaml
Deployment:
  - Docker: Container runtime
  - Kubernetes: Container orchestration
  - AWS ECS: Alternative container platform

Monitoring:
  - CloudWatch: Logs and basic metrics
  - DataDog: Application metrics
  - Sentry: Error tracking
  - Prometheus: Custom metrics
  - Grafana: Dashboards

CI/CD:
  - GitHub Actions: CI/CD pipeline
  - AWS CodePipeline: Deployment
  - AWS CodeBuild: Build service

Security:
  - AWS WAF: Web application firewall
  - AWS KMS: Encryption keys
  - HashiCorp Vault: Secrets management
```

---

## 5. Service Integration Architecture

### 5.1 Inter-Service Communication

```typescript
┌─────────────────────────────────────────────────────────┐
│                  Service Communication                   │
│                                                          │
│  Avatar Service ←→ User Service                         │
│       ↓              (User validation, permissions)      │
│       │                                                  │
│  Avatar Service ←→ Design Service                       │
│       ↓              (Avatar usage in designs)           │
│       │                                                  │
│  Avatar Service ←→ Notification Service                 │
│       ↓              (Processing updates)                │
│       │                                                  │
│  Avatar Service ←→ Analytics Service                    │
│                    (Usage tracking)                      │
└─────────────────────────────────────────────────────────┘
```

### 5.2 Event-Driven Architecture

```typescript
// Event publishing
interface AvatarEvents {
  'avatar.created': {
    avatarId: string;
    userId: string;
    timestamp: Date;
  };

  'avatar.processing.started': {
    avatarId: string;
    jobId: string;
  };

  'avatar.processing.completed': {
    avatarId: string;
    jobId: string;
    processingTime: number;
  };

  'avatar.processing.failed': {
    avatarId: string;
    jobId: string;
    error: string;
  };

  'avatar.updated': {
    avatarId: string;
    changes: object;
  };

  'avatar.deleted': {
    avatarId: string;
    userId: string;
  };
}

// Event subscribers
class AvatarEventSubscriber {
  @Subscribe('avatar.processing.completed')
  async onProcessingComplete(event: AvatarProcessingCompletedEvent) {
    // Send notification to user
    await this.notificationService.send({
      userId: event.userId,
      type: 'avatar_ready',
      data: { avatarId: event.avatarId }
    });

    // Track analytics
    await this.analyticsService.track({
      event: 'avatar_created',
      properties: {
        avatarId: event.avatarId,
        processingTime: event.processingTime
      }
    });
  }
}
```

---

## 6. Processing Architecture

### 6.1 Queue Architecture

```yaml
Queue Structure:
  avatar-processing:
    Priority Levels:
      1: Premium users (highest)
      3: Regular users
      5: Free tier users
      9: Batch processing

    Concurrency: 10 workers

    Job Types:
      - avatar:process-photos
      - avatar:regenerate-model
      - avatar:export

    Retry Strategy:
      Max Attempts: 3
      Backoff: Exponential (2s, 4s, 8s)
      Timeout: 120 seconds

    Dead Letter Queue:
      - Failed jobs after max retries
      - Manual review and reprocessing
```

### 6.2 Worker Architecture

```typescript
// Worker pool configuration
const workerConfig = {
  concurrency: process.env.WORKER_CONCURRENCY || 10,
  limiter: {
    max: 100,  // Max jobs per interval
    duration: 60000  // 1 minute
  },

  // Worker settings
  settings: {
    lockDuration: 120000,  // 2 minutes
    maxStalledCount: 2,
    stalledInterval: 30000
  }
};

// Photo processing worker
class PhotoProcessingWorker {
  async process(job: Job<PhotoProcessingData>) {
    const { avatarId, photoUrls, customization, unit } = job.data;

    try {
      // Update progress: 10%
      await job.updateProgress(10);
      await this.updateStatus(avatarId, 'Loading photos');

      // Step 1: Download and load photos
      const photos = await this.loadPhotos(photoUrls);

      // Update progress: 20%
      await job.updateProgress(20);
      await this.updateStatus(avatarId, 'Removing background');

      // Step 2: Background removal
      const maskedPhotos = await this.backgroundRemoval.process(photos);

      // Update progress: 40%
      await job.updateProgress(40);
      await this.updateStatus(avatarId, 'Detecting body landmarks');

      // Step 3: Pose detection
      const landmarks = await this.poseDetection.process(maskedPhotos);

      // Update progress: 60%
      await job.updateProgress(60);
      await this.updateStatus(avatarId, 'Extracting measurements');

      // Step 4: Measurement extraction
      const measurements = await this.measurementExtraction.process(
        landmarks,
        photos[0].metadata,
        unit
      );

      // Update progress: 75%
      await job.updateProgress(75);
      await this.updateStatus(avatarId, 'Generating 3D model');

      // Step 5: 3D model generation
      const model = await this.modelGenerator.generate({
        measurements,
        bodyType: this.classifyBodyType(measurements),
        customization,
        landmarks
      });

      // Update progress: 90%
      await job.updateProgress(90);
      await this.updateStatus(avatarId, 'Optimizing model');

      // Step 6: Optimize and compress
      const optimized = await this.modelOptimizer.optimize(model);

      // Step 7: Upload to storage
      const modelUrls = await this.uploadModel(avatarId, optimized);

      // Update progress: 95%
      await job.updateProgress(95);
      await this.updateStatus(avatarId, 'Saving results');

      // Step 8: Save to database
      await this.saveResults(avatarId, {
        measurements,
        bodyType,
        modelUrls,
        landmarks
      });

      // Complete
      await job.updateProgress(100);
      await this.markComplete(avatarId);

      return { success: true, avatarId, modelUrls };

    } catch (error) {
      await this.handleError(avatarId, error);
      throw error;
    }
  }
}
```

### 6.3 Scaling Strategy

```yaml
Horizontal Scaling:
  API Servers:
    - Auto-scaling based on CPU/memory
    - Min: 2 instances
    - Max: 20 instances
    - Scale up threshold: 70% CPU
    - Scale down threshold: 30% CPU

  Workers:
    - Auto-scaling based on queue depth
    - Min: 2 workers
    - Max: 50 workers
    - Scale up: Queue depth > 100
    - Scale down: Queue depth < 10

Vertical Scaling:
  ML Processing:
    - GPU instances for ML workloads
    - Instance type: p3.2xlarge (1 GPU)
    - Can upgrade to p3.8xlarge (4 GPUs)

Database Scaling:
  PostgreSQL:
    - Read replicas: 2-5 replicas
    - Connection pooling: PgBouncer
    - Partitioning: Time-based for analytics

  MongoDB:
    - Replica set: 3 nodes
    - Sharding: User-based sharding key

  Redis:
    - Cluster mode: 3 master + 3 replica
    - Sentinel for high availability
```

---

## 7. Security Architecture

### 7.1 Authentication & Authorization

```typescript
// JWT-based authentication
interface JWTPayload {
  userId: string;
  email: string;
  role: 'user' | 'premium' | 'admin';
  permissions: string[];
  iat: number;
  exp: number;
}

// Authorization middleware
class AvatarAuthorizationService {
  async canAccessAvatar(userId: string, avatarId: string): Promise<boolean> {
    const avatar = await this.avatarRepository.findById(avatarId);

    // User owns avatar
    if (avatar.userId === userId) {
      return true;
    }

    // Avatar is shared
    const sharing = await this.sharingRepository.findSharing(avatarId, userId);
    if (sharing && sharing.permissions.canView) {
      return true;
    }

    return false;
  }

  async canModifyAvatar(userId: string, avatarId: string): Promise<boolean> {
    const avatar = await this.avatarRepository.findById(avatarId);
    return avatar.userId === userId;
  }
}
```

### 7.2 Data Privacy

```yaml
Photo Privacy:
  - Photos encrypted at rest (AES-256)
  - Photos deleted after processing (configurable)
  - Temporary processing files cleaned up
  - EXIF data stripped (GPS, device info)
  - User consent required for ML training

Measurement Privacy:
  - Measurements encrypted in database
  - Access controlled by user ownership
  - Sharing requires explicit permission
  - Anonymization options available

Model Privacy:
  - Private models in user-specific S3 paths
  - Signed URLs with 1-hour expiration
  - Watermarking for public shares
  - Download tracking and limits
```

### 7.3 Security Controls

```yaml
Input Validation:
  - File type validation (magic numbers)
  - File size limits (10MB)
  - Image dimension validation
  - Malware scanning (ClamAV)
  - SQL injection prevention (parameterized queries)
  - XSS prevention (input sanitization)

Rate Limiting:
  - Avatar creation: 5 per hour per user
  - API requests: 100 per minute per user
  - Photo uploads: 10 per hour per user
  - WebSocket connections: 5 concurrent per user

Encryption:
  - Data at rest: AES-256 (AWS KMS)
  - Data in transit: TLS 1.3
  - Database connections: SSL/TLS
  - S3 uploads: SSE-S3

Access Control:
  - Role-based access control (RBAC)
  - Resource-level permissions
  - API key rotation
  - Session management
```

---

## 8. Monitoring & Observability

### 8.1 Metrics

```yaml
Application Metrics:
  - avatar_processing_duration_seconds (histogram)
  - avatar_processing_success_rate (counter)
  - avatar_processing_error_rate (counter)
  - photo_upload_size_bytes (histogram)
  - model_generation_duration_seconds (histogram)
  - api_request_duration_seconds (histogram)
  - active_processing_jobs (gauge)
  - queue_depth (gauge)

Business Metrics:
  - avatars_created_total (counter)
  - avatars_created_daily (gauge)
  - photos_uploaded_total (counter)
  - measurements_extracted_total (counter)
  - average_confidence_score (gauge)
  - premium_vs_free_users (gauge)

Infrastructure Metrics:
  - cpu_usage_percent (gauge)
  - memory_usage_percent (gauge)
  - disk_usage_percent (gauge)
  - network_throughput_bytes (counter)
  - database_connections (gauge)
  - cache_hit_rate (gauge)
```

### 8.2 Logging Strategy

```yaml
Log Levels:
  - ERROR: System errors, processing failures
  - WARN: Validation failures, retries
  - INFO: Avatar created, processing complete
  - DEBUG: Detailed processing steps

Structured Logging:
  Format: JSON
  Fields:
    - timestamp
    - level
    - service: "avatar-service"
    - avatarId
    - userId
    - jobId
    - duration
    - error
    - trace_id

Log Aggregation:
  - CloudWatch Logs: Primary log storage
  - DataDog: Log analysis and alerts
  - Retention: 30 days hot, 1 year archive
```

### 8.3 Alerting

```yaml
Critical Alerts:
  - Processing failure rate > 5%
  - API error rate > 1%
  - Database connection errors
  - Queue depth > 1000
  - Disk usage > 85%

Warning Alerts:
  - Processing time > 90 seconds
  - Queue depth > 500
  - Cache miss rate > 30%
  - Database slow queries

Notification Channels:
  - PagerDuty: Critical alerts
  - Slack: All alerts
  - Email: Daily summary
```

---

## 9. Performance Optimization

### 9.1 Caching Strategy

```typescript
// Multi-level caching
class AvatarCacheStrategy {
  // L1: In-memory cache (application level)
  private memoryCache = new LRU({
    max: 1000,
    ttl: 1000 * 60 * 5  // 5 minutes
  });

  // L2: Redis cache (distributed)
  private redisCache: Redis;

  // L3: Database
  private database: AvatarRepository;

  async getAvatar(avatarId: string): Promise<Avatar> {
    // Check L1
    let avatar = this.memoryCache.get(avatarId);
    if (avatar) return avatar;

    // Check L2
    const cached = await this.redisCache.get(`avatar:${avatarId}:metadata`);
    if (cached) {
      avatar = JSON.parse(cached);
      this.memoryCache.set(avatarId, avatar);
      return avatar;
    }

    // Check L3
    avatar = await this.database.findById(avatarId);

    // Populate caches
    await this.redisCache.setex(
      `avatar:${avatarId}:metadata`,
      3600,
      JSON.stringify(avatar)
    );
    this.memoryCache.set(avatarId, avatar);

    return avatar;
  }
}
```

### 9.2 Database Optimization

```sql
-- Partitioning strategy for analytics table
CREATE TABLE avatar.analytics (
  id BIGSERIAL,
  avatar_id UUID,
  event_type VARCHAR(50),
  event_data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
) PARTITION BY RANGE (created_at);

-- Create monthly partitions
CREATE TABLE avatar.analytics_2025_11
  PARTITION OF avatar.analytics
  FOR VALUES FROM ('2025-11-01') TO ('2025-12-01');

-- Indexes for common queries
CREATE INDEX idx_analytics_avatar_id ON avatar.analytics(avatar_id, created_at);
CREATE INDEX idx_analytics_event_type ON avatar.analytics(event_type, created_at);

-- Materialized views for reporting
CREATE MATERIALIZED VIEW avatar.daily_stats AS
SELECT
  DATE(created_at) as date,
  COUNT(*) as total_avatars,
  AVG(EXTRACT(EPOCH FROM (completed_at - created_at))) as avg_processing_time,
  COUNT(*) FILTER (WHERE status = 'ready') as successful,
  COUNT(*) FILTER (WHERE status = 'error') as failed
FROM avatar.avatars
WHERE created_at >= NOW() - INTERVAL '90 days'
GROUP BY DATE(created_at)
WITH DATA;

-- Refresh daily
REFRESH MATERIALIZED VIEW CONCURRENTLY avatar.daily_stats;
```

### 9.3 CDN Strategy

```yaml
CloudFront Distribution:
  Origins:
    - S3 bucket: avatar-models-prod
    - S3 bucket: avatar-photos-prod

  Cache Behaviors:
    3D Models:
      Path: /models/*
      TTL: 1 year (immutable)
      Compress: Yes (gzip, brotli)

    Thumbnails:
      Path: /thumbnails/*
      TTL: 1 month
      Compress: Yes
      Image optimization: Yes

    Photos:
      Path: /photos/*
      TTL: 1 day
      Signed URLs: Yes

  Edge Locations:
    - Global distribution
    - Price class: All edge locations
```

---

## 10. Disaster Recovery & High Availability

### 10.1 Backup Strategy

```yaml
Database Backups:
  PostgreSQL:
    - Continuous WAL archiving to S3
    - Point-in-time recovery enabled
    - Daily full backups (retained 30 days)
    - Weekly backups (retained 1 year)
    - Cross-region replication

  MongoDB:
    - Continuous backup via Atlas
    - Snapshot every 6 hours
    - Point-in-time restore (last 7 days)
    - Weekly snapshots (retained 1 year)

File Storage Backups:
  S3:
    - Versioning enabled
    - Cross-region replication
    - Glacier archive after 90 days
    - MFA delete protection

Recovery Objectives:
  - RPO (Recovery Point Objective): 1 hour
  - RTO (Recovery Time Objective): 4 hours
```

### 10.2 High Availability

```yaml
Multi-AZ Deployment:
  API Servers:
    - Deployed across 3 availability zones
    - Auto-scaling groups
    - Health checks every 30 seconds
    - Automatic failover

  Databases:
    PostgreSQL:
      - Primary in us-east-1a
      - Read replicas in us-east-1b, us-east-1c
      - Automatic failover to replica

    MongoDB:
      - 3-node replica set across AZs
      - Automatic primary election

    Redis:
      - Cluster mode with 3 shards
      - Each shard: 1 primary + 1 replica
      - Sentinel for monitoring

Load Balancing:
  - Application Load Balancer (ALB)
  - Cross-zone load balancing
  - Health checks
  - Connection draining
  - Sticky sessions for WebSocket
```

---

## 11. Deployment Architecture

### 11.1 Container Strategy

```dockerfile
# Multi-stage Dockerfile for Avatar Service

# Stage 1: Build
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build

# Stage 2: ML Dependencies
FROM python:3.11-slim AS ml-builder
WORKDIR /ml
COPY ml/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Stage 3: Production
FROM node:20-alpine
WORKDIR /app

# Install Python runtime
RUN apk add --no-cache python3 py3-pip

# Copy Node.js app
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package*.json ./

# Copy ML dependencies
COPY --from=ml-builder /usr/local/lib/python3.11/site-packages /usr/local/lib/python3.11/site-packages
COPY ml/ ./ml/

# Health check
HEALTH CHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD node healthcheck.js

EXPOSE 3000
CMD ["node", "dist/index.js"]
```

### 11.2 Kubernetes Deployment

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: avatar-service
  namespace: fashion-wallet
spec:
  replicas: 3
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0
  selector:
    matchLabels:
      app: avatar-service
  template:
    metadata:
      labels:
        app: avatar-service
        version: v1
    spec:
      containers:
      - name: avatar-service
        image: avatar-service:latest
        ports:
        - containerPort: 3000
          name: http
        - containerPort: 3001
          name: websocket
        env:
        - name: NODE_ENV
          value: "production"
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: avatar-secrets
              key: database-url
        - name: REDIS_URL
          valueFrom:
            secretKeyRef:
              name: avatar-secrets
              key: redis-url
        resources:
          requests:
            memory: "512Mi"
            cpu: "500m"
          limits:
            memory: "2Gi"
            cpu: "2000m"
        livenessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /ready
            port: 3000
          initialDelaySeconds: 5
          periodSeconds: 5
---
apiVersion: v1
kind: Service
metadata:
  name: avatar-service
  namespace: fashion-wallet
spec:
  selector:
    app: avatar-service
  ports:
  - name: http
    port: 80
    targetPort: 3000
  - name: websocket
    port: 3001
    targetPort: 3001
  type: LoadBalancer
---
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: avatar-service-hpa
  namespace: fashion-wallet
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: avatar-service
  minReplicas: 2
  maxReplicas: 20
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
```

---

## 12. Testing Architecture

### 12.1 Testing Strategy

```yaml
Unit Tests:
  Framework: Jest
  Coverage Target: >80%
  Files:
    - services/*.test.ts
    - repositories/*.test.ts
    - utils/*.test.ts

  Focus Areas:
    - Business logic
    - Data validation
    - Error handling
    - Edge cases

Integration Tests:
  Framework: Jest + Supertest
  Environment: Docker Compose

  Tests:
    - API endpoint tests
    - Database integration
    - Queue processing
    - External service mocking

  Coverage: >70%

E2E Tests:
  Framework: Playwright
  Environment: Staging

  Scenarios:
    - Complete avatar creation flow
    - Photo upload and processing
    - Measurement updates
    - Avatar export

Performance Tests:
  Tool: k6

  Scenarios:
    - Load test: 1000 concurrent users
    - Stress test: Gradual increase to failure
    - Spike test: Sudden traffic burst
    - Soak test: Sustained load for 24 hours

  Metrics:
    - Response time < 200ms (p95)
    - Error rate < 1%
    - Throughput > 100 req/sec
```

### 12.2 CI/CD Pipeline

```yaml
# .github/workflows/avatar-service.yml

name: Avatar Service CI/CD

on:
  push:
    branches: [main, develop]
    paths:
      - 'services/avatar/**'
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_DB: avatar_test
          POSTGRES_PASSWORD: test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

      redis:
        image: redis:7
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run linter
        run: npm run lint

      - name: Run type check
        run: npm run type-check

      - name: Run unit tests
        run: npm run test:unit

      - name: Run integration tests
        run: npm run test:integration
        env:
          DATABASE_URL: postgresql://postgres:test@localhost:5432/avatar_test
          REDIS_URL: redis://localhost:6379

      - name: Upload coverage
        uses: codecov/codecov-action@v3

  build:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v2
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: us-east-1

      - name: Login to Amazon ECR
        id: login-ecr
        uses: aws-actions/amazon-ecr-login@v1

      - name: Build and push Docker image
        env:
          ECR_REGISTRY: ${{ steps.login-ecr.outputs.registry }}
          ECR_REPOSITORY: avatar-service
          IMAGE_TAG: ${{ github.sha }}
        run: |
          docker build -t $ECR_REGISTRY/$ECR_REPOSITORY:$IMAGE_TAG .
          docker push $ECR_REGISTRY/$ECR_REPOSITORY:$IMAGE_TAG
          docker tag $ECR_REGISTRY/$ECR_REPOSITORY:$IMAGE_TAG $ECR_REGISTRY/$ECR_REPOSITORY:latest
          docker push $ECR_REGISTRY/$ECR_REPOSITORY:latest

  deploy:
    needs: build
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
      - name: Deploy to production
        run: |
          # Update ECS service or K8s deployment
          # Trigger blue/green deployment
```

---

## Document Metadata

**Version**: 1.0
**Author**: Fashion Wallet Architecture Team
**Status**: Draft
**Review Cycle**: Bi-weekly
**Next Review**: December 2025

**Dependencies**:
- spec-infra-00 (Database Infrastructure)
- spec-infra-01 (Storage Infrastructure)
- spec-infra-02 (Authentication & Authorization)
- spec-infra-03 (Caching & Queue Infrastructure)
- spec-infra-04 (API Infrastructure)

**Related Documents**:
- spec-feature-01 (Avatar Service Features)
- spec-arch-02 (Catalog Service Architecture)
- spec-arch-03 (Design Service Architecture)

---

**End of Avatar Service Architecture Specification**

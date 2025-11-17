# Feature Specification: Avatar Service

## Document Overview

**Version**: 1.0
**Last Updated**: November 2025
**Document Type**: Feature Specification
**Status**: Draft
**Spec ID**: spec-feature-01

---

## 1. Executive Summary

The Avatar Service enables users to create personalized, measurement-accurate 3D avatars from photographs or manual measurements. This service is the foundation for accurate garment visualization and virtual try-on experiences in the Fashion Wallet platform.

### 1.1 Goals

- Enable quick avatar creation from user photos (< 60 seconds)
- Extract accurate body measurements (±2cm accuracy)
- Generate realistic 3D models suitable for garment visualization
- Support multiple avatar profiles per user
- Provide measurement editing and customization capabilities

### 1.2 Non-Goals (Out of Scope)

- Real-time video avatar creation
- Full body animation and rigging
- Facial feature customization beyond basic representation
- Avatar-to-avatar interactions
- AR/VR avatar integration (future phase)

---

## 2. Feature Requirements

### 2.1 Photo-Based Avatar Creation

#### 2.1.1 Photo Upload
```yaml
Requirements:
  Supported Formats: [JPEG, PNG, WebP]
  Maximum File Size: 10MB per photo
  Minimum Resolution: 1280x720 pixels
  Recommended Resolution: 1920x1080 pixels
  Photos Required: 1-3 (front mandatory, side/back optional)

  Photo Quality Validation:
    - Blur detection
    - Lighting quality check
    - Subject visibility validation
    - Background complexity check
```

#### 2.1.2 Photo Processing Pipeline
```typescript
interface PhotoProcessingSteps {
  step1: 'EXIF extraction and privacy handling';
  step2: 'Image format validation and conversion';
  step3: 'Background removal using ML model';
  step4: 'Pose detection and landmark identification';
  step5: 'Body measurement extraction';
  step6: 'Confidence scoring';
  step7: 'Quality assurance checks';
}

interface ProcessingResult {
  success: boolean;
  confidence: number;        // 0-100%
  measurements: Measurements;
  landmarks: BodyLandmarks;
  warnings: string[];
  errors: string[];
}
```

#### 2.1.3 AI/ML Components
```yaml
Computer Vision Models Required:
  Background Removal:
    Model: SAM (Segment Anything Model) or U2-Net
    Purpose: Isolate person from background
    Input: RGB image
    Output: Alpha mask

  Pose Detection:
    Model: MediaPipe Pose or OpenPose
    Purpose: Detect body landmarks
    Input: Masked image
    Output: 33+ body landmarks (x, y, z, visibility)

  Measurement Extraction:
    Model: Custom trained model or rule-based system
    Purpose: Calculate body dimensions from landmarks
    Input: Landmarks + image dimensions
    Output: Body measurements with confidence scores

  Body Type Classification:
    Model: Classification model
    Categories: [pear, apple, rectangle, hourglass, inverted_triangle]
    Purpose: Determine overall body shape
```

### 2.2 Measurement Management

#### 2.2.1 Supported Measurements
```typescript
interface BodyMeasurements {
  // Core measurements (required)
  height: Measurement;
  shoulderWidth: Measurement;
  chestCircumference: Measurement;
  waistCircumference: Measurement;
  hipCircumference: Measurement;

  // Extended measurements (optional)
  neckCircumference: Measurement;
  armLength: Measurement;
  inseamLength: Measurement;
  thighCircumference: Measurement;
  calfCircumference: Measurement;
  bicepCircumference: Measurement;
  forearmCircumference: Measurement;

  // Derived measurements
  torsoLength: Measurement;
  legLength: Measurement;
  armSpan: Measurement;
}

interface Measurement {
  value: number;
  unit: 'cm' | 'inch';
  confidence: number;      // 0-100%
  source: 'auto' | 'manual';
  validatedAt: Date;
}
```

#### 2.2.2 Measurement Validation
```typescript
interface ValidationRules {
  height: { min: 120, max: 250, unit: 'cm' };
  shoulderWidth: { min: 30, max: 70, unit: 'cm' };
  chestCircumference: { min: 60, max: 180, unit: 'cm' };
  waistCircumference: { min: 50, max: 200, unit: 'cm' };
  hipCircumference: { min: 60, max: 200, unit: 'cm' };

  // Proportional validation
  proportionChecks: {
    hipToWaist: { min: 0.8, max: 1.5 },
    shoulderToWaist: { min: 0.8, max: 2.0 },
    heightToInseam: { min: 1.8, max: 2.4 }
  };
}
```

### 2.3 3D Avatar Generation

#### 2.3.1 Parametric Model Generation
```yaml
3D Model Requirements:
  Format: GLTF 2.0
  Topology: Quad-based mesh
  Polygon Count:
    - Base: 5,000-8,000 triangles
    - LOD1: 2,000-3,000 triangles
    - LOD2: 500-1,000 triangles

  UV Mapping: Single UV map, optimized layout
  Textures:
    - Diffuse/Base Color: 2048x2048
    - Normal Map: 1024x1024 (optional)

  Rigging: Basic skeleton (optional for initial phase)

  Performance Targets:
    - Generation Time: < 45 seconds
    - File Size (compressed): < 5MB
    - Loading Time: < 3 seconds
```

#### 2.3.2 Avatar Customization Options
```typescript
interface AvatarCustomization {
  // Body adjustments
  bodyAdjustments: {
    muscleDefinition: number;      // 0-100
    bodyFat: number;               // 0-100
    posture: 'straight' | 'relaxed' | 'athletic';
  };

  // Visual customization
  appearance: {
    skinTone: string;              // Hex color
    hairStyle: 'none' | 'short' | 'medium' | 'long';
    hairColor: string;             // Hex color
  };

  // Measurement overrides
  measurementAdjustments: {
    [key in keyof BodyMeasurements]?: number;
  };
}
```

#### 2.3.3 Model Optimization
```yaml
Optimization Pipeline:
  1. Mesh Decimation:
     - Generate LOD levels
     - Preserve silhouette quality

  2. Texture Compression:
     - Use KTX2/Basis Universal
     - Maintain visual quality

  3. GLTF Optimization:
     - Draco compression
     - Buffer merging
     - Accessor optimization

  4. Quality Validation:
     - Visual inspection checks
     - File size verification
     - Loading performance test
```

### 2.4 Avatar Management

#### 2.4.1 Multi-Avatar Support
```typescript
interface AvatarProfile {
  id: string;
  userId: string;
  name: string;
  isDefault: boolean;
  status: 'processing' | 'ready' | 'error' | 'archived';

  // Avatar data
  measurements: BodyMeasurements;
  bodyType: BodyType;
  customization: AvatarCustomization;

  // Files
  photos: PhotoReference[];
  modelUrl: string;
  thumbnailUrl: string;
  lodUrls: {
    lod1: string;
    lod2: string;
  };

  // Metadata
  createdAt: Date;
  updatedAt: Date;
  lastUsedAt: Date;
  version: number;
  tags: string[];
}

// User can have multiple avatars
interface UserAvatars {
  userId: string;
  avatars: AvatarProfile[];
  defaultAvatarId: string;
  maxAvatars: number;         // Based on subscription tier
}
```

#### 2.4.2 Avatar Operations
```yaml
CRUD Operations:
  Create:
    - Photo-based creation
    - Measurement-based creation
    - Clone from existing avatar

  Read:
    - Get single avatar
    - List user's avatars
    - Get default avatar
    - Search avatars by name/tags

  Update:
    - Update measurements
    - Update customization
    - Regenerate 3D model
    - Update metadata

  Delete:
    - Soft delete (archive)
    - Hard delete (with confirmation)
    - Cascade delete photos and models
```

### 2.5 Export and Sharing

#### 2.5.1 Export Formats
```yaml
Export Options:
  3D Formats:
    - GLTF 2.0 (default)
    - FBX (optional)
    - OBJ (optional)

  Measurement Export:
    - JSON format
    - CSV format
    - PDF report (with visualization)

  Privacy Options:
    - Include/exclude photos
    - Include/exclude measurements
    - Watermark models
```

#### 2.5.2 Sharing Capabilities
```typescript
interface SharingOptions {
  visibility: 'private' | 'shared' | 'public';
  shareToken: string;            // For private sharing
  expiresAt?: Date;              // Optional expiration
  permissions: {
    canView: boolean;
    canDownload: boolean;
    canClone: boolean;
  };
}
```

---

## 3. API Specification

### 3.1 REST Endpoints

#### 3.1.1 Avatar Creation Endpoints

```typescript
// POST /api/v1/avatars/photo-based
interface CreateAvatarFromPhotosRequest {
  name: string;
  photos: {
    front: File;              // Required
    side?: File;              // Optional
    back?: File;              // Optional
  };
  unit?: 'metric' | 'imperial';
  customization?: Partial<AvatarCustomization>;
}

interface CreateAvatarFromPhotosResponse {
  avatarId: string;
  status: 'processing';
  estimatedCompletionTime: number;  // seconds
  processingJobId: string;
}

// POST /api/v1/avatars/measurement-based
interface CreateAvatarFromMeasurementsRequest {
  name: string;
  measurements: Partial<BodyMeasurements>;
  unit: 'metric' | 'imperial';
  customization?: Partial<AvatarCustomization>;
}

interface CreateAvatarFromMeasurementsResponse {
  avatarId: string;
  status: 'processing';
  estimatedCompletionTime: number;
}
```

#### 3.1.2 Avatar Management Endpoints

```typescript
// GET /api/v1/avatars
interface ListAvatarsQuery {
  status?: 'processing' | 'ready' | 'error' | 'archived';
  search?: string;
  tags?: string[];
  page?: number;
  limit?: number;
  sortBy?: 'createdAt' | 'updatedAt' | 'name' | 'lastUsedAt';
  sortOrder?: 'asc' | 'desc';
}

interface ListAvatarsResponse {
  avatars: AvatarProfile[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

// GET /api/v1/avatars/:id
interface GetAvatarResponse {
  avatar: AvatarProfile;
  downloadUrls: {
    model: string;
    thumbnail: string;
    lod1: string;
    lod2: string;
  };
}

// PATCH /api/v1/avatars/:id
interface UpdateAvatarRequest {
  name?: string;
  measurements?: Partial<BodyMeasurements>;
  customization?: Partial<AvatarCustomization>;
  tags?: string[];
  isDefault?: boolean;
}

// DELETE /api/v1/avatars/:id
interface DeleteAvatarQuery {
  hard?: boolean;  // true for permanent delete, false for archive
}
```

#### 3.1.3 Measurement Endpoints

```typescript
// GET /api/v1/avatars/:id/measurements
interface GetMeasurementsResponse {
  measurements: BodyMeasurements;
  bodyType: BodyType;
  lastUpdated: Date;
}

// PUT /api/v1/avatars/:id/measurements
interface UpdateMeasurementsRequest {
  measurements: Partial<BodyMeasurements>;
  regenerateModel?: boolean;  // Trigger 3D model regeneration
}

// POST /api/v1/avatars/:id/measurements/validate
interface ValidateMeasurementsRequest {
  measurements: Partial<BodyMeasurements>;
}

interface ValidateMeasurementsResponse {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  suggestions: MeasurementSuggestion[];
}
```

### 3.2 WebSocket Events

```typescript
// Real-time processing updates
interface ProcessingUpdateEvent {
  avatarId: string;
  status: 'processing' | 'ready' | 'error';
  progress: number;           // 0-100
  currentStep: string;
  message: string;
  error?: string;
}

// Client subscribes
socket.emit('avatar:subscribe', { avatarId });

// Server emits updates
socket.on('avatar:processing:update', (event: ProcessingUpdateEvent) => {
  // Handle update
});

// Processing complete
socket.on('avatar:processing:complete', (event: {
  avatarId: string;
  modelUrl: string;
  thumbnailUrl: string;
}) => {
  // Handle completion
});

// Processing failed
socket.on('avatar:processing:error', (event: {
  avatarId: string;
  error: string;
  retryable: boolean;
}) => {
  // Handle error
});
```

---

## 4. Data Models

### 4.1 PostgreSQL Schema

```sql
-- Avatar table (metadata)
CREATE TABLE avatar.avatars (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES shared.users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'processing',
  is_default BOOLEAN DEFAULT false,

  -- Body classification
  body_type VARCHAR(50),

  -- File references
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
CREATE INDEX idx_avatars_tags ON avatar.avatars USING GIN(tags);

-- One default avatar per user constraint
CREATE UNIQUE INDEX uidx_avatars_default_per_user
  ON avatar.avatars(user_id)
  WHERE is_default = true AND deleted_at IS NULL;

-- Measurements table
CREATE TABLE avatar.measurements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  avatar_id UUID NOT NULL REFERENCES avatar.avatars(id) ON DELETE CASCADE,

  -- Core measurements (cm)
  height DECIMAL(6,2),
  shoulder_width DECIMAL(6,2),
  chest_circumference DECIMAL(6,2),
  waist_circumference DECIMAL(6,2),
  hip_circumference DECIMAL(6,2),

  -- Extended measurements (cm)
  neck_circumference DECIMAL(6,2),
  arm_length DECIMAL(6,2),
  inseam_length DECIMAL(6,2),
  thigh_circumference DECIMAL(6,2),
  calf_circumference DECIMAL(6,2),
  bicep_circumference DECIMAL(6,2),
  forearm_circumference DECIMAL(6,2),

  -- Derived measurements (cm)
  torso_length DECIMAL(6,2),
  leg_length DECIMAL(6,2),
  arm_span DECIMAL(6,2),

  -- Metadata
  unit VARCHAR(20) NOT NULL DEFAULT 'metric',
  confidence DECIMAL(5,2),           -- Overall confidence 0-100
  measurement_confidence JSONB,      -- Per-measurement confidence
  source VARCHAR(20) DEFAULT 'auto', -- 'auto' or 'manual'

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  CONSTRAINT chk_unit CHECK (unit IN ('metric', 'imperial')),
  CONSTRAINT chk_confidence CHECK (confidence >= 0 AND confidence <= 100),
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
  exif_data JSONB,

  -- Processing results
  landmarks JSONB,
  processing_metadata JSONB,

  -- Timestamps
  uploaded_at TIMESTAMPTZ DEFAULT NOW(),
  processed_at TIMESTAMPTZ,

  -- Constraints
  CONSTRAINT chk_photo_type CHECK (type IN ('front', 'side', 'back'))
);

CREATE INDEX idx_photos_avatar_id ON avatar.photos(avatar_id);

-- Customization table
CREATE TABLE avatar.customizations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  avatar_id UUID NOT NULL REFERENCES avatar.avatars(id) ON DELETE CASCADE,

  -- Body adjustments
  muscle_definition INTEGER DEFAULT 50,
  body_fat INTEGER DEFAULT 50,
  posture VARCHAR(20) DEFAULT 'straight',

  -- Appearance
  skin_tone VARCHAR(7),              -- Hex color
  hair_style VARCHAR(20),
  hair_color VARCHAR(7),             -- Hex color

  -- Measurement overrides
  measurement_adjustments JSONB DEFAULT '{}'::jsonb,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  CONSTRAINT chk_muscle_definition CHECK (muscle_definition >= 0 AND muscle_definition <= 100),
  CONSTRAINT chk_body_fat CHECK (body_fat >= 0 AND body_fat <= 100),
  CONSTRAINT chk_posture CHECK (posture IN ('straight', 'relaxed', 'athletic')),
  UNIQUE(avatar_id)
);

-- Processing jobs table
CREATE TABLE avatar.processing_jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  avatar_id UUID NOT NULL REFERENCES avatar.avatars(id) ON DELETE CASCADE,
  status VARCHAR(20) NOT NULL DEFAULT 'queued',

  -- Job details
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

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  CONSTRAINT chk_status CHECK (status IN ('queued', 'processing', 'completed', 'failed', 'cancelled')),
  CONSTRAINT chk_progress CHECK (progress >= 0 AND progress <= 100),
  CONSTRAINT chk_priority CHECK (priority >= 1 AND priority <= 10)
);

CREATE INDEX idx_processing_jobs_status ON avatar.processing_jobs(status, priority);
CREATE INDEX idx_processing_jobs_avatar_id ON avatar.processing_jobs(avatar_id);
```

### 4.2 MongoDB Collections

```javascript
// avatar_models collection (3D model data)
{
  _id: ObjectId,
  avatarId: UUID,                    // Reference to PostgreSQL

  // Model data
  mesh: {
    vertices: BinData,               // Binary mesh data
    faces: BinData,
    normals: BinData,
    uvs: BinData,
    vertexCount: Number,
    faceCount: Number
  },

  // LOD models
  lod: [
    {
      level: Number,
      vertices: BinData,
      faces: BinData,
      vertexCount: Number,
      faceCount: Number
    }
  ],

  // Textures
  textures: [
    {
      type: String,                  // 'diffuse', 'normal', etc.
      format: String,
      resolution: { width: Number, height: Number },
      url: String,
      data: BinData                  // Optional embedded data
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

  // Timestamps
  createdAt: Date,
  updatedAt: Date
}

// Create indexes
db.avatar_models.createIndex({ avatarId: 1 }, { unique: true });
db.avatar_models.createIndex({ "generationMetadata.generatedAt": -1 });
```

---

## 5. Business Logic

### 5.1 Avatar Creation Flow

```typescript
// Service layer implementation
class AvatarService {
  async createFromPhotos(
    userId: string,
    request: CreateAvatarFromPhotosRequest
  ): Promise<CreateAvatarFromPhotosResponse> {

    // 1. Validate request
    this.validatePhotos(request.photos);

    // 2. Create avatar record
    const avatar = await this.avatarRepository.create({
      userId,
      name: request.name,
      status: 'processing'
    });

    // 3. Upload photos to storage
    const photoUrls = await this.uploadPhotos(avatar.id, request.photos);

    // 4. Create processing job
    const job = await this.processingQueue.add('avatar:process-photos', {
      avatarId: avatar.id,
      photoUrls,
      customization: request.customization,
      unit: request.unit || 'metric'
    }, {
      priority: 1,
      attempts: 3
    });

    // 5. Return response
    return {
      avatarId: avatar.id,
      status: 'processing',
      estimatedCompletionTime: 60,
      processingJobId: job.id
    };
  }

  async processPhotos(jobData: ProcessPhotoJobData): Promise<void> {
    const { avatarId, photoUrls, customization, unit } = jobData;

    try {
      // Update progress
      await this.updateProgress(avatarId, 10, 'Loading photos');

      // 1. Download and load photos
      const photos = await this.loadPhotos(photoUrls);

      // 2. Remove background
      await this.updateProgress(avatarId, 20, 'Removing background');
      const maskedPhotos = await this.backgroundRemoval.process(photos);

      // 3. Detect pose and landmarks
      await this.updateProgress(avatarId, 40, 'Detecting body landmarks');
      const landmarks = await this.poseDetection.process(maskedPhotos);

      // 4. Extract measurements
      await this.updateProgress(avatarId, 60, 'Extracting measurements');
      const measurements = await this.measurementExtraction.process(
        landmarks,
        photos[0].metadata,
        unit
      );

      // 5. Classify body type
      const bodyType = this.classifyBodyType(measurements);

      // 6. Generate 3D model
      await this.updateProgress(avatarId, 75, 'Generating 3D model');
      const model = await this.modelGenerator.generate({
        measurements,
        bodyType,
        customization,
        landmarks
      });

      // 7. Optimize and compress
      await this.updateProgress(avatarId, 90, 'Optimizing model');
      const optimized = await this.modelOptimizer.optimize(model);

      // 8. Upload model to storage
      const modelUrls = await this.uploadModel(avatarId, optimized);

      // 9. Save results to database
      await this.updateProgress(avatarId, 95, 'Saving results');
      await this.saveAvatarResults(avatarId, {
        measurements,
        bodyType,
        modelUrls,
        landmarks
      });

      // 10. Mark as complete
      await this.updateProgress(avatarId, 100, 'Complete');
      await this.avatarRepository.update(avatarId, {
        status: 'ready',
        ...modelUrls
      });

      // 11. Notify user via WebSocket
      this.notificationService.notifyAvatarReady(avatarId);

    } catch (error) {
      await this.handleProcessingError(avatarId, error);
    }
  }
}
```

### 5.2 Measurement Extraction Algorithm

```typescript
class MeasurementExtractionService {
  async extractMeasurements(
    landmarks: BodyLandmarks,
    imageMetadata: ImageMetadata,
    unit: 'metric' | 'imperial'
  ): Promise<BodyMeasurements> {

    // Calculate pixel-to-real-world ratio
    const pixelRatio = this.calculatePixelRatio(
      landmarks,
      imageMetadata
    );

    // Extract measurements
    const measurements = {
      height: this.calculateHeight(landmarks, pixelRatio),
      shoulderWidth: this.calculateShoulderWidth(landmarks, pixelRatio),
      chestCircumference: this.calculateChestCircumference(landmarks, pixelRatio),
      waistCircumference: this.calculateWaistCircumference(landmarks, pixelRatio),
      hipCircumference: this.calculateHipCircumference(landmarks, pixelRatio),
      // ... other measurements
    };

    // Calculate confidence scores
    const confidenceScores = this.calculateConfidenceScores(
      landmarks,
      measurements
    );

    // Validate and adjust measurements
    const validated = this.validateMeasurements(measurements);

    // Convert units if needed
    const converted = unit === 'imperial'
      ? this.convertToImperial(validated)
      : validated;

    return {
      ...converted,
      confidence: confidenceScores,
      source: 'auto',
      unit
    };
  }

  private calculateHeight(
    landmarks: BodyLandmarks,
    pixelRatio: number
  ): number {
    // Calculate distance from crown to ankle in pixels
    const crownY = landmarks.nose.y - (landmarks.nose.y - landmarks.crown.y);
    const ankleY = (landmarks.leftAnkle.y + landmarks.rightAnkle.y) / 2;
    const heightPixels = ankleY - crownY;

    // Convert to real-world measurement
    const heightCm = heightPixels * pixelRatio;

    return Math.round(heightCm * 10) / 10;  // Round to 1 decimal
  }

  // Similar calculations for other measurements...
}
```

### 5.3 3D Model Generation

```typescript
class ModelGenerationService {
  async generate(params: ModelGenerationParams): Promise<Model3D> {
    const { measurements, bodyType, customization, landmarks } = params;

    // 1. Load base template model
    const baseModel = await this.loadBaseTemplate(bodyType);

    // 2. Apply measurements to deform model
    const deformed = await this.applyMeasurements(baseModel, measurements);

    // 3. Apply customization
    const customized = await this.applyCustomization(deformed, customization);

    // 4. Refine mesh based on landmarks
    const refined = await this.refineMesh(customized, landmarks);

    // 5. Generate textures
    const textured = await this.generateTextures(refined, customization);

    // 6. Generate LOD levels
    const withLOD = await this.generateLOD(textured);

    return withLOD;
  }

  private async applyMeasurements(
    model: Model3D,
    measurements: BodyMeasurements
  ): Promise<Model3D> {
    // Parametric deformation based on measurements
    const deformers = [
      this.heightDeformer,
      this.shoulderDeformer,
      this.chestDeformer,
      this.waistDeformer,
      this.hipDeformer
    ];

    let deformed = model;
    for (const deformer of deformers) {
      deformed = await deformer.apply(deformed, measurements);
    }

    return deformed;
  }
}
```

---

## 6. Processing Pipeline

### 6.1 Queue Configuration

```typescript
// Avatar processing queue setup
const avatarQueue = new Queue('avatar-processing', {
  redis: redisConfig,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000
    },
    timeout: 120000,  // 2 minutes
    removeOnComplete: false,
    removeOnFail: false
  }
});

// Job processors
avatarQueue.process('avatar:process-photos', 5, async (job) => {
  return await avatarService.processPhotos(job.data);
});

avatarQueue.process('avatar:regenerate-model', 3, async (job) => {
  return await avatarService.regenerateModel(job.data);
});

avatarQueue.process('avatar:export', 10, async (job) => {
  return await avatarService.exportAvatar(job.data);
});

// Job event handlers
avatarQueue.on('completed', async (job, result) => {
  logger.info('Avatar processing completed', { jobId: job.id, result });
  await notificationService.notifyJobComplete(job.id);
});

avatarQueue.on('failed', async (job, error) => {
  logger.error('Avatar processing failed', { jobId: job.id, error });
  await notificationService.notifyJobFailed(job.id, error);
});
```

### 6.2 Processing Steps Timeline

```yaml
Photo-Based Avatar Creation Timeline:
  0-5s: Photo upload and validation
  5-15s: Background removal and preprocessing
  15-30s: Pose detection and landmark extraction
  30-45s: Measurement extraction and validation
  45-55s: 3D model generation
  55-60s: Model optimization and upload

Total: ~60 seconds

Measurement-Based Avatar Creation Timeline:
  0-5s: Measurement validation
  5-20s: 3D model generation
  20-30s: Model optimization and upload

Total: ~30 seconds
```

---

## 7. Testing Requirements

### 7.1 Unit Tests

```typescript
describe('AvatarService', () => {
  describe('createFromPhotos', () => {
    it('should validate photo formats', async () => {
      // Test invalid formats are rejected
    });

    it('should create avatar record with processing status', async () => {
      // Test avatar creation
    });

    it('should queue processing job', async () => {
      // Test job queuing
    });
  });

  describe('processPhotos', () => {
    it('should extract measurements from photos', async () => {
      // Test measurement extraction
    });

    it('should handle processing errors gracefully', async () => {
      // Test error handling
    });
  });
});

describe('MeasurementExtractionService', () => {
  it('should calculate height accurately', () => {
    // Test height calculation
  });

  it('should validate measurement proportions', () => {
    // Test proportional validation
  });

  it('should convert units correctly', () => {
    // Test unit conversion
  });
});

describe('ModelGenerationService', () => {
  it('should generate valid GLTF model', async () => {
    // Test model generation
  });

  it('should apply measurements correctly', async () => {
    // Test measurement application
  });

  it('should generate LOD levels', async () => {
    // Test LOD generation
  });
});
```

### 7.2 Integration Tests

```typescript
describe('Avatar Creation Flow (Integration)', () => {
  it('should create avatar from photos end-to-end', async () => {
    // 1. Upload photos
    const response = await request(app)
      .post('/api/v1/avatars/photo-based')
      .attach('front', 'test/fixtures/front.jpg')
      .field('name', 'Test Avatar');

    expect(response.status).toBe(202);
    const { avatarId } = response.body;

    // 2. Wait for processing
    await waitForAvatarReady(avatarId, 120000);

    // 3. Verify avatar is ready
    const avatar = await request(app)
      .get(`/api/v1/avatars/${avatarId}`);

    expect(avatar.body.status).toBe('ready');
    expect(avatar.body.modelUrl).toBeDefined();
    expect(avatar.body.measurements).toBeDefined();
  });
});
```

### 7.3 Performance Tests

```yaml
Performance Test Scenarios:
  1. Photo Processing Time:
     - Single photo: < 60 seconds
     - Multiple photos: < 90 seconds

  2. Concurrent Processing:
     - 10 concurrent avatars: All complete within 2 minutes
     - 50 concurrent avatars: All complete within 5 minutes

  3. Model Generation:
     - Generation time: < 30 seconds
     - File size: < 5MB compressed
     - Loading time: < 3 seconds

  4. API Response Times:
     - List avatars: < 200ms
     - Get avatar: < 100ms
     - Update measurements: < 500ms
```

---

## 8. Security Requirements

### 8.1 Data Privacy

```yaml
Photo Privacy:
  - Photos stored with encryption at rest
  - Photos deleted after processing (configurable)
  - User can opt-in to keep photos
  - Temporary processing files cleaned up

Measurement Privacy:
  - Measurements encrypted in database
  - Access controlled by user ownership
  - Sharing requires explicit permission

Model Privacy:
  - Private models stored in user-specific S3 paths
  - Signed URLs for downloads (expiration: 1 hour)
  - Watermarking for public shares
```

### 8.2 Access Control

```typescript
// Authorization checks
class AvatarAuthorizationService {
  async canAccessAvatar(userId: string, avatarId: string): Promise<boolean> {
    const avatar = await this.avatarRepository.findById(avatarId);

    // User owns avatar
    if (avatar.userId === userId) {
      return true;
    }

    // Avatar is shared with user
    const sharing = await this.sharingRepository.findSharing(avatarId, userId);
    if (sharing && sharing.permissions.canView) {
      return true;
    }

    // Avatar is public
    if (avatar.visibility === 'public') {
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

---

## 9. Monitoring and Analytics

### 9.1 Metrics to Track

```yaml
Processing Metrics:
  - avatar_processing_duration_seconds
  - avatar_processing_success_rate
  - avatar_processing_error_rate
  - photo_upload_size_bytes
  - model_generation_duration_seconds

Business Metrics:
  - avatars_created_total
  - avatars_created_daily
  - photos_uploaded_total
  - measurements_extracted_total
  - average_confidence_score

Performance Metrics:
  - api_request_duration_seconds
  - queue_depth
  - processing_queue_wait_time
  - model_file_size_bytes
```

### 9.2 Error Tracking

```typescript
// Error categories
enum AvatarErrorCategory {
  PHOTO_VALIDATION = 'photo_validation',
  BACKGROUND_REMOVAL = 'background_removal',
  POSE_DETECTION = 'pose_detection',
  MEASUREMENT_EXTRACTION = 'measurement_extraction',
  MODEL_GENERATION = 'model_generation',
  STORAGE = 'storage',
  UNKNOWN = 'unknown'
}

// Error reporting
class ErrorTracker {
  reportError(error: Error, context: ErrorContext) {
    const category = this.categorizeError(error);

    logger.error('Avatar processing error', {
      category,
      error: error.message,
      stack: error.stack,
      context
    });

    // Send to error tracking service (e.g., Sentry)
    Sentry.captureException(error, {
      tags: { category },
      extra: context
    });

    // Increment error metric
    metrics.increment('avatar_errors_total', { category });
  }
}
```

---

## 10. Documentation Requirements

```yaml
Required Documentation:
  API Documentation:
    - OpenAPI/Swagger specification
    - Request/response examples
    - Error code reference
    - Rate limiting details

  Developer Guide:
    - Integration guide
    - Photo preparation guidelines
    - Measurement guidelines
    - 3D model format specification

  User Documentation:
    - How to take proper photos
    - Understanding measurements
    - Avatar customization guide
    - Privacy and data handling

  Operations:
    - Deployment guide
    - Monitoring guide
    - Troubleshooting guide
    - Performance tuning guide
```

---

## 11. Success Criteria

```yaml
Feature Completion Criteria:
  Core Functionality:
    ✓ Photo-based avatar creation works end-to-end
    ✓ Measurement-based avatar creation works
    ✓ 3D model generation meets quality standards
    ✓ Multiple avatars per user supported
    ✓ Real-time processing updates via WebSocket

  Performance:
    ✓ Photo processing < 60 seconds (95th percentile)
    ✓ Model file size < 5MB compressed
    ✓ API response times meet targets
    ✓ Handles 50+ concurrent processing jobs

  Quality:
    ✓ Measurement accuracy ± 2cm
    ✓ 95%+ user satisfaction with avatar quality
    ✓ < 5% processing error rate
    ✓ Test coverage > 80%

  Security:
    ✓ All photos encrypted at rest
    ✓ Access control properly implemented
    ✓ No data leakage between users

  Documentation:
    ✓ API documentation complete
    ✓ Developer guide published
    ✓ User guide available
```

---

## 12. Future Enhancements

```yaml
Phase 2 Features:
  - Video-based avatar creation
  - AR body scanning integration
  - Advanced body shape analysis
  - Avatar animation and poses
  - Social avatar sharing gallery
  - Avatar comparison tools

Phase 3 Features:
  - Real-time avatar editing
  - AI-powered style recommendations
  - Virtual try-on optimization
  - Cross-platform avatar sync
  - Metaverse avatar export
```

---

## Document Metadata

**Version**: 1.0
**Author**: Fashion Wallet Feature Team
**Status**: Draft
**Review Cycle**: Bi-weekly
**Next Review**: December 2025
**Dependencies**:
  - spec-infra-00 (Database)
  - spec-infra-01 (Storage)
  - spec-infra-03 (Queue)

---

**End of Avatar Service Feature Specification**

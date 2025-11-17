# Architecture Specification: Design Service

## Document Overview

**Version**: 1.0
**Last Updated**: November 2025
**Document Type**: Architecture Specification
**Status**: Draft
**Spec ID**: spec-arch-03

---

## 1. Executive Summary

The Design Service is the core creative workspace microservice that enables users to create, customize, and manage fashion designs by combining avatars with catalog items in an interactive 3D environment. It provides real-time rendering, layer management, version control, and export capabilities.

### 1.1 Architecture Goals

- **Performance**: 60 FPS real-time 3D rendering
- **Responsiveness**: Layer updates reflect in < 100ms
- **Scalability**: Support 10,000+ concurrent designers
- **Reliability**: Auto-save every 30 seconds with no data loss
- **Collaboration**: Async collaboration with real-time updates

---

## 2. System Architecture Overview

### 2.1 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Client Layer                             │
│  (Web App with Three.js, Mobile App)                            │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                      API Gateway Layer                           │
│  - Authentication/Authorization                                  │
│  - WebSocket Upgrade                                             │
│  - Rate Limiting                                                 │
│  - Request Validation                                            │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                   Design Service (Node.js)                       │
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │   REST API   │  │  WebSocket   │  │   GraphQL    │         │
│  │  Controllers │  │   Server     │  │   Resolver   │         │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘         │
│         │                  │                  │                  │
│         └──────────────────┼──────────────────┘                  │
│                            │                                     │
│  ┌─────────────────────────┴─────────────────────────┐          │
│  │           Business Logic Layer                     │          │
│  │  ┌──────────────┐  ┌──────────────┐               │          │
│  │  │Design Service│  │Layer Service │               │          │
│  │  │              │  │              │               │          │
│  │  └──────┬───────┘  └──────┬───────┘               │          │
│  │         │                  │                        │          │
│  │  ┌──────┴───────┐  ┌──────┴───────┐               │          │
│  │  │Version       │  │Rendering     │               │          │
│  │  │Control Svc   │  │Service       │               │          │
│  │  └──────┬───────┘  └──────┬───────┘               │          │
│  │         │                  │                        │          │
│  │  ┌──────┴───────┐  ┌──────┴───────┐               │          │
│  │  │Export Service│  │Auto-Save Svc │               │          │
│  │  └──────────────┘  └──────────────┘               │          │
│  └───────────────────────────────────────────────────┘          │
│                            │                                     │
│  ┌─────────────────────────┴─────────────────────────┐          │
│  │           Data Access Layer                        │          │
│  │  ┌──────────────┐  ┌──────────────┐               │          │
│  │  │Design Repo   │  │Layer Repo    │               │          │
│  │  │              │  │              │               │          │
│  │  └──────────────┘  └──────────────┘               │          │
│  └────────────────────────────────────────────────────┘          │
└────────────────────────┬────────────────────────────────────────┘
                         │
         ┌───────────────┼───────────────┬──────────────┐
         │               │               │              │
         ▼               ▼               ▼              ▼
┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐
│ PostgreSQL  │ │  MongoDB    │ │   Redis     │ │     S3      │
│ (Metadata)  │ │ (Snapshots) │ │  (Cache)    │ │  (Assets)   │
└─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘
         │               │               │              │
         └───────────────┼───────────────┴──────────────┘
                         │
         ┌───────────────┼───────────────┬──────────────┐
         │               │               │              │
         ▼               ▼               ▼              ▼
┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐
│   BullMQ    │ │  Three.js   │ │   FFmpeg    │ │   Puppeteer │
│  (Queue)    │ │ (Rendering) │ │  (Video)    │ │(Screenshots)│
└─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘
```

### 2.2 Component Responsibilities

#### 2.2.1 API Layer
- **REST API Controllers**: Design CRUD, layer management
- **WebSocket Server**: Real-time updates, collaboration
- **GraphQL Resolver**: Complex queries, nested data

#### 2.2.2 Business Logic Layer
- **Design Service**: Core design operations
- **Layer Service**: Layer CRUD, reordering, grouping
- **Version Control Service**: Checkpoints, history, diff
- **Rendering Service**: 3D scene management, rendering
- **Export Service**: Image, video, 3D model exports
- **Auto-Save Service**: Periodic state persistence

#### 2.2.3 Rendering Layer
- **Three.js**: 3D rendering engine
- **FFmpeg**: Video encoding for turntables
- **Puppeteer**: High-quality screenshots

---

## 3. Component Architecture

### 3.1 Design Creation & Management Flow

```
┌─────────────────────────────────────────────────────────┐
│                Design Creation Flow                      │
│                                                          │
│  Create Design Request                                   │
│       ↓                                                  │
│  ┌─────────────────────┐                                │
│  │ Validate Request    │ - Check user permissions       │
│  │                     │ - Validate avatar exists       │
│  │                     │ - Check tier limits            │
│  └──────────┬──────────┘                                │
│             ↓                                            │
│  ┌─────────────────────┐                                │
│  │ Create Design       │ - Generate design ID           │
│  │ Record              │ - Set default status           │
│  │                     │ - Link to user & avatar        │
│  └──────────┬──────────┘                                │
│             ↓                                            │
│  ┌─────────────────────┐                                │
│  │ Initialize Canvas   │ - Create canvas settings       │
│  │ Settings            │ - Set default camera           │
│  │                     │ - Configure lighting           │
│  └──────────┬──────────┘                                │
│             ↓                                            │
│  ┌─────────────────────┐                                │
│  │ Create Initial      │ - Version 1                    │
│  │ Version             │ - Empty snapshot               │
│  └──────────┬──────────┘                                │
│             ↓                                            │
│  ┌─────────────────────┐                                │
│  │ Initialize 3D Scene │ - Load avatar model            │
│  │                     │ - Setup camera                 │
│  │                     │ - Setup lighting               │
│  │                     │ - Setup background             │
│  └──────────┬──────────┘                                │
│             ↓                                            │
│  ┌─────────────────────┐                                │
│  │ Cache Design State  │ - Store in Redis               │
│  │                     │ - Set TTL                      │
│  └──────────┬──────────┘                                │
│             ↓                                            │
│       Return Design                                      │
└──────────────────────────────────────────────────────────┘
```

### 3.2 Layer Management Architecture

```
┌─────────────────────────────────────────────────────────┐
│                  Layer Operations                        │
│                                                          │
│  Add Layer Request                                       │
│       ↓                                                  │
│  ┌─────────────────────┐                                │
│  │ Validate Access     │ - Check edit permission        │
│  │                     │ - Verify design exists         │
│  └──────────┬──────────┘                                │
│             ↓                                            │
│  ┌─────────────────────┐                                │
│  │ Validate Catalog    │ - Check item exists            │
│  │ Item                │ - Verify availability          │
│  │                     │ - Check compatibility          │
│  └──────────┬──────────┘                                │
│             ↓                                            │
│  ┌─────────────────────┐                                │
│  │ Determine Layer     │ - Get current max order        │
│  │ Order               │ - Apply z-index rules          │
│  └──────────┬──────────┘                                │
│             ↓                                            │
│  ┌─────────────────────┐                                │
│  │ Create Layer Record │ - Generate layer ID            │
│  │                     │ - Set default transform        │
│  │                     │ - Apply customization          │
│  └──────────┬──────────┘                                │
│             ↓                                            │
│  ┌─────────────────────┐                                │
│  │ Update 3D Scene     │ - Load catalog item model      │
│  │                     │ - Apply transformations        │
│  │                     │ - Add to scene graph           │
│  │                     │ - Update rendering             │
│  └──────────┬──────────┘                                │
│             ↓                                            │
│  ┌─────────────────────┐                                │
│  │ Record in History   │ - Save action                  │
│  │                     │ - Store undo data              │
│  └──────────┬──────────┘                                │
│             ↓                                            │
│  ┌─────────────────────┐                                │
│  │ Trigger Auto-Save   │ - Schedule save (30s)          │
│  │                     │ - Debounce                     │
│  └──────────┬──────────┘                                │
│             ↓                                            │
│  ┌─────────────────────┐                                │
│  │ Broadcast Update    │ - Send WebSocket event         │
│  │                     │ - Notify collaborators         │
│  └──────────┬──────────┘                                │
│             ↓                                            │
│       Return Layer                                       │
└──────────────────────────────────────────────────────────┘
```

### 3.3 Auto-Save Architecture

```
┌─────────────────────────────────────────────────────────┐
│                  Auto-Save System                        │
│                                                          │
│  Design Change Event                                     │
│       ↓                                                  │
│  ┌─────────────────────┐                                │
│  │ Debounce Timer      │ - Cancel existing timer        │
│  │                     │ - Start new 30s timer          │
│  └──────────┬──────────┘                                │
│             ↓                                            │
│      Wait 30 seconds                                     │
│             ↓                                            │
│  ┌─────────────────────┐                                │
│  │ Capture Design      │ - Get current state            │
│  │ State               │ - Serialize layers             │
│  │                     │ - Capture canvas settings      │
│  └──────────┬──────────┘                                │
│             ↓                                            │
│  ┌─────────────────────┐                                │
│  │ Calculate Diff      │ - Compare with last save       │
│  │                     │ - Identify changes             │
│  └──────────┬──────────┘                                │
│             ↓                                            │
│  ┌─────────────────────┐                                │
│  │ Save to MongoDB     │ - Store snapshot               │
│  │                     │ - Index by design ID           │
│  │                     │ - Set TTL (7 days)             │
│  └──────────┬──────────┘                                │
│             ↓                                            │
│  ┌─────────────────────┐                                │
│  │ Update PostgreSQL   │ - Update last_edited_at        │
│  │ Timestamp           │ - Increment version            │
│  └──────────┬──────────┘                                │
│             ↓                                            │
│  ┌─────────────────────┐                                │
│  │ Update Cache        │ - Refresh Redis                │
│  │                     │ - Update state hash            │
│  └──────────┬──────────┘                                │
│             ↓                                            │
│  ┌─────────────────────┐                                │
│  │ Emit Event          │ - Notify subscribers           │
│  │                     │ - Log save event               │
│  └─────────────────────┘                                │
└──────────────────────────────────────────────────────────┘
```

### 3.4 Rendering Architecture

```
┌─────────────────────────────────────────────────────────┐
│                  Rendering Pipeline                      │
│                                                          │
│  ┌─────────────────────────────────────────────────┐   │
│  │         Client-Side Rendering (Real-time)       │   │
│  │                                                  │   │
│  │  Browser/Three.js                                │   │
│  │       ↓                                          │   │
│  │  ┌──────────────────┐                           │   │
│  │  │ Load Avatar Model│  From S3/CDN              │   │
│  │  └────────┬─────────┘                           │   │
│  │           ↓                                      │   │
│  │  ┌──────────────────┐                           │   │
│  │  │ Load Layers      │  Load catalog items       │   │
│  │  └────────┬─────────┘                           │   │
│  │           ↓                                      │   │
│  │  ┌──────────────────┐                           │   │
│  │  │ Build Scene Graph│  Compose layers           │   │
│  │  └────────┬─────────┘                           │   │
│  │           ↓                                      │   │
│  │  ┌──────────────────┐                           │   │
│  │  │ Apply Transforms │  Position/rotate/scale    │   │
│  │  └────────┬─────────┘                           │   │
│  │           ↓                                      │   │
│  │  ┌──────────────────┐                           │   │
│  │  │ Render Loop      │  60 FPS target            │   │
│  │  │ (requestAnimFrame)                           │   │
│  │  └──────────────────┘                           │   │
│  └──────────────────────────────────────────────────┘   │
│                                                          │
│  ┌─────────────────────────────────────────────────┐   │
│  │      Server-Side Rendering (High Quality)       │   │
│  │                                                  │   │
│  │  Render Request                                  │   │
│  │       ↓                                          │   │
│  │  ┌──────────────────┐                           │   │
│  │  │ Check Cache      │  Hash(design + settings)  │   │
│  │  └────────┬─────────┘                           │   │
│  │           ↓                                      │   │
│  │      Cache Hit? ──YES──→ Return Cached          │   │
│  │           │                                      │   │
│  │          NO                                      │   │
│  │           ↓                                      │   │
│  │  ┌──────────────────┐                           │   │
│  │  │ Queue Render Job │  Priority by user tier    │   │
│  │  └────────┬─────────┘                           │   │
│  │           ↓                                      │   │
│  │  ┌──────────────────┐                           │   │
│  │  │ Worker Process   │  Headless Three.js        │   │
│  │  │                  │  or Puppeteer             │   │
│  │  └────────┬─────────┘                           │   │
│  │           ↓                                      │   │
│  │  ┌──────────────────┐                           │   │
│  │  │ Load Design State│  From database            │   │
│  │  └────────┬─────────┘                           │   │
│  │           ↓                                      │   │
│  │  ┌──────────────────┐                           │   │
│  │  │ Build Scene      │  Same as client           │   │
│  │  └────────┬─────────┘                           │   │
│  │           ↓                                      │   │
│  │  ┌──────────────────┐                           │   │
│  │  │ Render Frame     │  High quality settings    │   │
│  │  └────────┬─────────┘                           │   │
│  │           ↓                                      │   │
│  │  ┌──────────────────┐                           │   │
│  │  │ Post-Processing  │  Anti-aliasing, effects   │   │
│  │  └────────┬─────────┘                           │   │
│  │           ↓                                      │   │
│  │  ┌──────────────────┐                           │   │
│  │  │ Encode Image     │  PNG/JPEG/WebP            │   │
│  │  └────────┬─────────┘                           │   │
│  │           ↓                                      │   │
│  │  ┌──────────────────┐                           │   │
│  │  │ Upload to S3     │  Store result             │   │
│  │  └────────┬─────────┘                           │   │
│  │           ↓                                      │   │
│  │  ┌──────────────────┐                           │   │
│  │  │ Cache Result     │  Store in Redis           │   │
│  │  └────────┬─────────┘                           │   │
│  │           ↓                                      │   │
│  │       Return URL                                 │   │
│  └──────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────┘
```

### 3.5 Export Architecture

```
┌─────────────────────────────────────────────────────────┐
│                  Export Pipeline                         │
│                                                          │
│  Export Request (Image/Video/Model/TechPack)             │
│       ↓                                                  │
│  ┌─────────────────────┐                                │
│  │ Create Export       │ - Generate export ID           │
│  │ Record              │ - Store options                │
│  │                     │ - Set status: queued           │
│  └──────────┬──────────┘                                │
│             ↓                                            │
│  ┌─────────────────────┐                                │
│  │ Queue Export Job    │ - Determine priority           │
│  │                     │ - Add to BullMQ                │
│  └──────────┬──────────┘                                │
│             ↓                                            │
│       Return Export ID                                   │
│                                                          │
│  ╔═══════════════════════════════════════════════╗      │
│  ║           Worker Process (Async)              ║      │
│  ╚═══════════════════════════════════════════════╝      │
│                                                          │
│  ┌─────────────────────┐                                │
│  │ Update Status       │ - Status: processing           │
│  │                     │ - Progress: 0%                 │
│  └──────────┬──────────┘                                │
│             ↓                                            │
│  ┌─────────────────────┐                                │
│  │ Load Design State   │ - From MongoDB/PostgreSQL      │
│  │                     │ - Include all layers           │
│  └──────────┬──────────┘                                │
│             ↓                                            │
│             │                                            │
│    ┌────────┴────────┬──────────┬──────────┐           │
│    │                 │          │          │            │
│    ▼                 ▼          ▼          ▼            │
│ ┌─────┐          ┌─────┐    ┌─────┐    ┌──────┐       │
│ │Image│          │Video│    │Model│    │TechPk│       │
│ │     │          │     │    │     │    │      │       │
│ └──┬──┘          └──┬──┘    └──┬──┘    └───┬──┘       │
│    │                │          │           │            │
│    │   Render       │ Render   │ Export    │ Generate   │
│    │   Static       │ 360°     │ GLTF/FBX  │ PDF        │
│    │   Images       │ Frames   │ /OBJ      │ Report     │
│    │                │          │           │            │
│    │                ↓          │           │            │
│    │         ┌─────────────┐  │           │            │
│    │         │ FFmpeg      │  │           │            │
│    │         │ Encode Video│  │           │            │
│    │         └──────┬──────┘  │           │            │
│    │                │          │           │            │
│    └────────────────┼──────────┴───────────┘            │
│                     ↓                                    │
│  ┌─────────────────────┐                                │
│  │ Upload to S3        │ - Store result file            │
│  │                     │ - Generate signed URL          │
│  └──────────┬──────────┘                                │
│             ↓                                            │
│  ┌─────────────────────┐                                │
│  │ Update Export Record│ - Status: completed            │
│  │                     │ - File URL                     │
│  │                     │ - File size                    │
│  │                     │ - Set expiration               │
│  └──────────┬──────────┘                                │
│             ↓                                            │
│  ┌─────────────────────┐                                │
│  │ Notify User         │ - WebSocket event              │
│  │                     │ - Email notification           │
│  └─────────────────────┘                                │
└──────────────────────────────────────────────────────────┘
```

#### 3.5.1 Video Export Implementation

```typescript
class ExportService {
  async exportTurntable(
    designId: string,
    options: VideoExportOptions
  ): Promise<ExportResult> {

    // Create export record
    const exportRecord = await this.exportRepository.create({
      designId,
      type: 'video',
      format: options.format,
      options,
      status: 'queued'
    });

    // Queue job
    await this.exportQueue.add('export-turntable', {
      exportId: exportRecord.id,
      designId,
      options
    }, {
      priority: this.getUserPriority(this.currentUserId),
      timeout: 600000  // 10 minutes
    });

    return exportRecord;
  }

  async processTurntableExport(
    exportId: string,
    designId: string,
    options: VideoExportOptions
  ): Promise<void> {

    try {
      // Update status
      await this.updateExportStatus(exportId, 'processing', 0);

      // Get design state
      const state = await this.getDesignState(designId);

      // Calculate frame parameters
      const frameCount = options.duration * options.fps;
      const degreesPerFrame = options.rotationDegrees / frameCount;

      // Initialize rendering
      const renderer = await this.initializeRenderer(options);
      const scene = await this.buildScene(state);

      // Render frames
      const frames: Buffer[] = [];
      for (let i = 0; i < frameCount; i++) {
        // Rotate camera
        const angle = i * degreesPerFrame;
        this.rotateCameraAroundTarget(scene.camera, angle);

        // Render frame
        renderer.render(scene, scene.camera);
        const frameBuffer = await this.captureFrame(renderer);
        frames.push(frameBuffer);

        // Update progress
        const progress = Math.round((i / frameCount) * 90);
        await this.updateExportStatus(exportId, 'processing', progress);
      }

      // Encode video
      await this.updateExportStatus(exportId, 'processing', 90);
      const videoBuffer = await this.encodeVideo(frames, options);

      // Upload to S3
      await this.updateExportStatus(exportId, 'processing', 95);
      const fileUrl = await this.uploadExport(exportId, videoBuffer, options.format);

      // Update export record
      await this.exportRepository.update(exportId, {
        status: 'completed',
        progress: 100,
        fileUrl,
        fileName: `design-${designId}-turntable.${options.format}`,
        fileSize: videoBuffer.length,
        completedAt: new Date(),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)  // 7 days
      });

      // Notify user
      this.notificationService.notifyExportComplete(exportId, fileUrl);

      // Cleanup
      renderer.dispose();
      scene.dispose();

    } catch (error) {
      await this.handleExportError(exportId, error);
    }
  }

  private async encodeVideo(
    frames: Buffer[],
    options: VideoExportOptions
  ): Promise<Buffer> {

    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = [];

      // Spawn FFmpeg process
      const ffmpeg = spawn('ffmpeg', [
        '-f', 'image2pipe',                    // Input from pipe
        '-framerate', options.fps.toString(),   // Frame rate
        '-i', '-',                              // Input from stdin
        '-c:v', 'libx264',                      // Video codec
        '-pix_fmt', 'yuv420p',                  // Pixel format
        '-preset', 'medium',                    // Encoding preset
        '-crf', '23',                           // Quality (lower = better)
        '-movflags', '+faststart',              // Web optimization
        '-f', options.format,                   // Output format
        'pipe:1'                                // Output to stdout
      ]);

      // Collect output
      ffmpeg.stdout.on('data', (chunk) => chunks.push(chunk));

      // Handle completion
      ffmpeg.on('close', (code) => {
        if (code === 0) {
          resolve(Buffer.concat(chunks));
        } else {
          reject(new Error(`FFmpeg exited with code ${code}`));
        }
      });

      // Write frames to stdin
      for (const frame of frames) {
        ffmpeg.stdin.write(frame);
      }
      ffmpeg.stdin.end();
    });
  }
}
```

### 3.6 Data Architecture

#### 3.6.1 PostgreSQL Schema

```sql
-- Schema: design

-- Designs table
CREATE TABLE design.designs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES shared.users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,

  -- Avatar reference
  avatar_id UUID REFERENCES avatar.avatars(id) ON DELETE SET NULL,

  -- Categorization
  category VARCHAR(50),
  tags TEXT[],
  occasion TEXT[],
  season TEXT[],

  -- Status
  status VARCHAR(20) DEFAULT 'draft',
  visibility VARCHAR(20) DEFAULT 'private',

  -- Version control
  version INTEGER DEFAULT 1,
  fork_from UUID REFERENCES design.designs(id) ON DELETE SET NULL,

  -- Analytics
  view_count INTEGER DEFAULT 0,
  like_count INTEGER DEFAULT 0,
  fork_count INTEGER DEFAULT 0,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  published_at TIMESTAMPTZ,
  last_edited_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,

  CONSTRAINT chk_status CHECK (status IN ('draft', 'published', 'archived')),
  CONSTRAINT chk_visibility CHECK (visibility IN ('private', 'shared', 'public')),
  CONSTRAINT chk_category CHECK (category IN ('outfit', 'top', 'bottom', 'dress', 'outerwear', 'full_collection'))
);

-- Indexes
CREATE INDEX idx_designs_user_id ON design.designs(user_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_designs_status ON design.designs(status) WHERE deleted_at IS NULL;
CREATE INDEX idx_designs_visibility ON design.designs(visibility) WHERE deleted_at IS NULL;
CREATE INDEX idx_designs_tags ON design.designs USING GIN(tags);

-- Layers table
CREATE TABLE design.layers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  design_id UUID NOT NULL REFERENCES design.designs(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL,
  order_index INTEGER NOT NULL,
  name VARCHAR(255),

  -- Catalog item reference
  catalog_item_id UUID NOT NULL REFERENCES catalog.items(id) ON DELETE RESTRICT,
  catalog_item_type VARCHAR(50) NOT NULL,

  -- Transform (stored as JSONB)
  transform JSONB DEFAULT '{
    "position": {"x": 0, "y": 0, "z": 0},
    "rotation": {"x": 0, "y": 0, "z": 0},
    "scale": {"x": 1, "y": 1, "z": 1}
  }'::jsonb,

  -- Customization
  customization JSONB DEFAULT '{}'::jsonb,

  -- Visibility
  is_visible BOOLEAN DEFAULT true,
  is_locked BOOLEAN DEFAULT false,

  -- Blend mode
  blend_mode VARCHAR(20) DEFAULT 'normal',
  opacity INTEGER DEFAULT 100,

  notes TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT chk_layer_type CHECK (type IN ('silhouette', 'fabric', 'pattern', 'element', 'accessory')),
  CONSTRAINT chk_blend_mode CHECK (blend_mode IN ('normal', 'multiply', 'screen', 'overlay', 'add')),
  CONSTRAINT chk_opacity CHECK (opacity >= 0 AND opacity <= 100)
);

CREATE INDEX idx_layers_design_id ON design.layers(design_id, order_index);
CREATE INDEX idx_layers_catalog_item ON design.layers(catalog_item_id);

-- Canvas settings
CREATE TABLE design.canvas_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  design_id UUID NOT NULL REFERENCES design.designs(id) ON DELETE CASCADE,

  camera JSONB DEFAULT '{
    "position": {"x": 0, "y": 1.6, "z": 3},
    "target": {"x": 0, "y": 1, "z": 0},
    "fov": 50
  }'::jsonb,

  lighting JSONB DEFAULT '{
    "preset": "studio"
  }'::jsonb,

  background JSONB DEFAULT '{
    "type": "color",
    "value": "#f0f0f0"
  }'::jsonb,

  show_grid BOOLEAN DEFAULT false,
  show_guides BOOLEAN DEFAULT false,
  snap_to_grid BOOLEAN DEFAULT false,
  grid_size DECIMAL(10,2) DEFAULT 10,

  render_quality VARCHAR(20) DEFAULT 'standard',
  antialiasing BOOLEAN DEFAULT true,
  shadows BOOLEAN DEFAULT true,
  ambient_occlusion BOOLEAN DEFAULT false,

  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(design_id)
);

-- Versions
CREATE TABLE design.versions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  design_id UUID NOT NULL REFERENCES design.designs(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  message TEXT,

  snapshot_ref VARCHAR(255),  -- MongoDB reference
  diff JSONB,

  created_by UUID REFERENCES shared.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(design_id, version_number)
);

CREATE INDEX idx_versions_design_id ON design.versions(design_id, version_number DESC);

-- History (partitioned)
CREATE TABLE design.history (
  id BIGSERIAL,
  design_id UUID NOT NULL REFERENCES design.designs(id) ON DELETE CASCADE,
  user_id UUID REFERENCES shared.users(id),
  action VARCHAR(50) NOT NULL,
  data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
) PARTITION BY RANGE (created_at);

CREATE TABLE design.history_2025_11
  PARTITION OF design.history
  FOR VALUES FROM ('2025-11-01') TO ('2025-12-01');

CREATE INDEX idx_history_design_id ON design.history(design_id, created_at DESC);

-- Collaborators
CREATE TABLE design.collaborators (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  design_id UUID NOT NULL REFERENCES design.designs(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES shared.users(id) ON DELETE CASCADE,
  role VARCHAR(20) NOT NULL,
  added_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(design_id, user_id),
  CONSTRAINT chk_role CHECK (role IN ('viewer', 'commenter', 'editor', 'owner'))
);

-- Exports
CREATE TABLE design.exports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  design_id UUID NOT NULL REFERENCES design.designs(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES shared.users(id),

  type VARCHAR(50) NOT NULL,
  format VARCHAR(20),
  options JSONB,

  status VARCHAR(20) DEFAULT 'queued',
  progress INTEGER DEFAULT 0,

  file_url TEXT,
  file_name VARCHAR(255),
  file_size BIGINT,

  error_message TEXT,
  retry_count INTEGER DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,

  CONSTRAINT chk_export_status CHECK (status IN ('queued', 'processing', 'completed', 'failed')),
  CONSTRAINT chk_export_type CHECK (type IN ('image', 'video', 'model', 'techpack')),
  CONSTRAINT chk_progress CHECK (progress >= 0 AND progress <= 100)
);

CREATE INDEX idx_exports_design ON design.exports(design_id, created_at DESC);
CREATE INDEX idx_exports_status ON design.exports(status) WHERE status IN ('queued', 'processing');
```

#### 3.6.2 MongoDB Collections

```javascript
// design_snapshots collection
{
  _id: ObjectId,
  designId: UUID,
  versionId: UUID,

  snapshot: {
    design: {
      id: UUID,
      name: String,
      avatar_id: UUID,
      // ... metadata
    },
    layers: [
      {
        id: UUID,
        type: String,
        catalog_item_id: UUID,
        transform: Object,
        customization: Object,
        order_index: Number
      }
    ],
    canvasSettings: Object,
    renderState: {
      cameraPosition: Object,
      lighting: Object,
      background: Object
    }
  },

  createdAt: Date
}

db.design_snapshots.createIndex({ designId: 1, versionId: 1 }, { unique: true });
db.design_snapshots.createIndex({ createdAt: -1 });

// design_autosaves collection (TTL: 7 days)
{
  _id: ObjectId,
  designId: UUID,
  userId: UUID,

  state: {
    design: Object,
    layers: Array,
    canvasSettings: Object
  },

  autosaveNumber: Number,
  createdAt: Date
}

db.design_autosaves.createIndex({ createdAt: 1 }, { expireAfterSeconds: 604800 });
db.design_autosaves.createIndex({ designId: 1, createdAt: -1 });

// render_cache collection (TTL: 30 days)
{
  _id: ObjectId,
  designId: UUID,
  renderHash: String,  // Hash of design state + render settings

  imageUrl: String,
  renderSettings: Object,

  hitCount: Number,
  lastAccessed: Date,
  createdAt: Date
}

db.render_cache.createIndex({ createdAt: 1 }, { expireAfterSeconds: 2592000 });
db.render_cache.createIndex({ renderHash: 1 }, { unique: true });
```

---

## 4. Technology Stack

### 4.1 Backend Services

```yaml
Runtime:
  - Node.js: v20.x LTS
  - TypeScript: 5.x

Framework:
  - Express.js: REST API
  - Socket.io: WebSocket
  - Apollo Server: GraphQL (optional)

Database:
  - PostgreSQL: 15.x
  - MongoDB: 7.x
  - Redis: 7.x

Storage:
  - AWS S3: File storage
  - CloudFront: CDN

Queue:
  - BullMQ: Job queue
  - Redis: Queue backend

Rendering:
  - Three.js: 3D rendering (node-gl)
  - Puppeteer: Screenshots
  - FFmpeg: Video encoding
  - Sharp: Image processing
```

### 4.2 Client-Side

```yaml
Framework:
  - React: UI framework
  - Three.js: 3D rendering
  - React Three Fiber: React + Three.js

State Management:
  - Zustand: Application state
  - React Query: Server state

Real-time:
  - Socket.io Client: WebSocket
```

---

## 5. Performance Optimization

### 5.1 Real-Time Rendering Optimization

```typescript
// Client-side optimization strategies
class RenderOptimizer {
  // LOD (Level of Detail) management
  updateLOD(camera: Camera, objects: Object3D[]): void {
    for (const object of objects) {
      const distance = camera.position.distanceTo(object.position);

      // Switch LOD based on distance
      if (distance < 5) {
        object.visible = true;
        object.userData.lodLevel = 'high';
      } else if (distance < 15) {
        object.visible = true;
        object.userData.lodLevel = 'medium';
      } else {
        object.visible = true;
        object.userData.lodLevel = 'low';
      }
    }
  }

  // Frustum culling
  enableFrustumCulling(scene: Scene, camera: Camera): void {
    scene.traverse((object) => {
      if (object.frustumCulled === undefined) {
        object.frustumCulled = true;
      }
    });
  }

  // Texture compression
  async compressTexture(texture: Texture): Promise<CompressedTexture> {
    // Use KTX2/Basis Universal for web
    const compressed = await this.ktx2Loader.load(texture.source);
    return compressed;
  }

  // Geometry instancing for repeated elements
  createInstancedMesh(
    geometry: BufferGeometry,
    material: Material,
    count: number
  ): InstancedMesh {
    return new InstancedMesh(geometry, material, count);
  }
}
```

### 5.2 Caching Strategy

```typescript
class DesignCacheStrategy {
  // L1: Browser memory
  private memoryCache = new LRU({
    max: 100,
    ttl: 1000 * 60 * 5
  });

  // L2: IndexedDB (browser)
  private idbCache: IDBDatabase;

  // L3: Redis (server)
  private redisCache: Redis;

  async getDesignState(designId: string): Promise<DesignState> {
    // Check L1
    let state = this.memoryCache.get(designId);
    if (state) return state;

    // Check L2 (browser only)
    if (typeof window !== 'undefined') {
      state = await this.getFromIndexedDB(designId);
      if (state) {
        this.memoryCache.set(designId, state);
        return state;
      }
    }

    // Check L3 (server)
    const cached = await this.redisCache.get(`design:${designId}:state`);
    if (cached) {
      state = JSON.parse(cached);
      this.memoryCache.set(designId, state);
      if (typeof window !== 'undefined') {
        await this.saveToIndexedDB(designId, state);
      }
      return state;
    }

    // Fetch from database
    state = await this.fetchFromDatabase(designId);

    // Populate caches
    await this.redisCache.setex(
      `design:${designId}:state`,
      1800,  // 30 minutes
      JSON.stringify(state)
    );
    this.memoryCache.set(designId, state);

    return state;
  }
}
```

---

## 6. Monitoring & Observability

### 6.1 Key Metrics

```yaml
Design Metrics:
  - design_created_total (counter)
  - design_active_sessions (gauge)
  - design_auto_save_duration_ms (histogram)
  - design_layer_operations_total (counter)

Rendering Metrics:
  - render_fps (gauge)
  - render_frame_time_ms (histogram)
  - render_queue_depth (gauge)
  - export_duration_seconds (histogram)

Collaboration Metrics:
  - concurrent_editors_per_design (gauge)
  - websocket_connections_total (gauge)
  - collaboration_conflicts_total (counter)

Performance Metrics:
  - api_response_time_ms (histogram)
  - cache_hit_rate (gauge)
  - memory_usage_mb (gauge)
```

---

## Document Metadata

**Version**: 1.0
**Author**: Fashion Wallet Architecture Team
**Status**: Draft
**Review Cycle**: Bi-weekly
**Next Review**: December 2025

**Dependencies**:
- spec-arch-01 (Avatar Service Architecture)
- spec-arch-02 (Catalog Service Architecture)
- spec-infra-00 (Database Infrastructure)
- spec-infra-01 (Storage Infrastructure)
- spec-infra-03 (Caching & Queue Infrastructure)
- spec-infra-04 (API Infrastructure)

**Related Documents**:
- spec-feature-03 (Design Service Features)

---

**End of Design Service Architecture Specification**

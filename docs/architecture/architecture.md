# Fashion Wallet Technical Architecture

## Document Overview

**Version**: 1.0
**Last Updated**: November 2025
**Document Type**: Technical Architecture
**Status**: Draft

---

## 1. Executive Summary

This document describes the technical architecture for Fashion Wallet, a digital fashion design platform. The architecture follows a modular monolith pattern with service-oriented design, enabling rapid development while maintaining clear boundaries for future microservices migration if needed.

---

## 2. Architecture Principles

### 2.1 Core Principles
- **Modularity**: Clear separation of concerns between services
- **Scalability**: Horizontal and vertical scaling capabilities
- **Performance**: Real-time 3D rendering and responsive user experience
- **Security**: Data protection and privacy by design
- **Maintainability**: Clean code, comprehensive documentation
- **Cost-effectiveness**: Pragmatic technology choices

### 2.2 Design Patterns
- Domain-Driven Design (DDD) for service boundaries
- Event-driven architecture for cross-service communication
- CQRS for read/write optimization where needed
- Repository pattern for data access
- Factory pattern for object creation
- Strategy pattern for algorithm variations

---

## 3. High-Level Architecture

### 3.1 System Overview

```
┌────────────────────────────────────────────────────────────┐
│                        Client Layer                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │ Web App      │  │ Mobile Web   │  │ Admin Panel  │     │
│  │ (React)      │  │ (React)      │  │ (React)      │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
└────────────────────────────┬───────────────────────────────┘
                             │
┌────────────────────────────┼───────────────────────────────┐
│                    CDN / Edge Layer                         │
│              (Cloudflare / CloudFront)                      │
│         Static Assets, Images, 3D Models                    │
└────────────────────────────┬───────────────────────────────┘
                             │
┌────────────────────────────┼───────────────────────────────┐
│                     API Gateway Layer                       │
│  ┌──────────────────────────────────────────────┐          │
│  │  - Rate Limiting                             │          │
│  │  - Authentication & Authorization            │          │
│  │  - Request/Response Transformation           │          │
│  │  - API Versioning                            │          │
│  │  - SSL Termination                           │          │
│  └──────────────────────────────────────────────┘          │
└────────────────────────────┬───────────────────────────────┘
                             │
┌────────────────────────────┼───────────────────────────────┐
│                  Application Server Layer                   │
│  ┌─────────────────────────────────────────────────────┐   │
│  │            NestJS Application Server                │   │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐          │   │
│  │  │ Avatar   │  │ Catalog  │  │ Design   │          │   │
│  │  │ Module   │  │ Module   │  │ Module   │          │   │
│  │  └──────────┘  └──────────┘  └──────────┘          │   │
│  │  ┌────────────────────────────────────────┐         │   │
│  │  │        Shared Services Layer           │         │   │
│  │  │  Auth, Storage, Cache, Queue, Search   │         │   │
│  │  └────────────────────────────────────────┘         │   │
│  └─────────────────────────────────────────────────────┘   │
└────────────────────────────┬───────────────────────────────┘
                             │
┌────────────────────────────┼───────────────────────────────┐
│                  Processing Layer                           │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │ Avatar       │  │ Render       │  │ Export       │     │
│  │ Processor    │  │ Engine       │  │ Generator    │     │
│  │ (Python ML)  │  │ (Three.js)   │  │ (FFmpeg)     │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
└────────────────────────────┬───────────────────────────────┘
                             │
┌────────────────────────────┼───────────────────────────────┐
│                      Data Layer                             │
│  ┌──────────┬──────────┬──────────┬──────────┬──────────┐  │
│  │PostgreSQL│ MongoDB  │  Redis   │   S3     │  Search  │  │
│  │(Primary) │(Document)│ (Cache)  │(Objects) │  (ES)    │  │
│  └──────────┴──────────┴──────────┴──────────┴──────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### 3.2 Deployment Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                   Production Environment                     │
│  ┌──────────────────────────────────────────────────────┐   │
│  │              Kubernetes Cluster (EKS)                │   │
│  │  ┌────────────────────────────────────────────────┐  │   │
│  │  │  Load Balancer (NGINX Ingress)                 │  │   │
│  │  └────────────────────────────────────────────────┘  │   │
│  │  ┌────────────────────────────────────────────────┐  │   │
│  │  │  API Pods (Auto-scaling 2-10 instances)        │  │   │
│  │  └────────────────────────────────────────────────┘  │   │
│  │  ┌────────────────────────────────────────────────┐  │   │
│  │  │  Worker Pods (Processing, Auto-scaling)        │  │   │
│  │  └────────────────────────────────────────────────┘  │   │
│  │  ┌────────────────────────────────────────────────┐  │   │
│  │  │  Socket.io Pods (Real-time, Sticky sessions)   │  │   │
│  │  └────────────────────────────────────────────────┘  │   │
│  └──────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │                  Managed Services                    │   │
│  │  - RDS PostgreSQL (Multi-AZ)                        │   │
│  │  - DocumentDB / MongoDB Atlas                       │   │
│  │  - ElastiCache Redis (Cluster mode)                 │   │
│  │  - S3 (Multi-region replication)                    │   │
│  │  - Elasticsearch Service                            │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

---

## 4. Service Architecture

### 4.1 Avatar Service Architecture

#### 4.1.1 Component Structure
```
avatar-service/
├── controllers/         # HTTP endpoints
│   ├── avatar.controller.ts
│   └── photo.controller.ts
├── services/           # Business logic
│   ├── avatar.service.ts
│   ├── measurement.service.ts
│   ├── photo-processing.service.ts
│   └── model-generation.service.ts
├── repositories/       # Data access
│   ├── avatar.repository.ts
│   └── measurement.repository.ts
├── processors/         # Background jobs
│   ├── photo-processor.ts
│   ├── pose-detector.ts
│   └── model-generator.ts
├── entities/          # Domain models
│   ├── avatar.entity.ts
│   ├── measurement.entity.ts
│   └── photo.entity.ts
└── dto/               # Data transfer objects
    ├── create-avatar.dto.ts
    └── update-measurement.dto.ts
```

#### 4.1.2 Processing Pipeline
```
Photo Upload
    ↓
┌─────────────────────┐
│ Image Validation    │
│ - Format check      │
│ - Size validation   │
│ - EXIF extraction   │
└──────────┬──────────┘
           ↓
┌─────────────────────┐
│ Background Removal  │
│ - SAM Model         │
│ - Alpha masking     │
└──────────┬──────────┘
           ↓
┌─────────────────────┐
│ Pose Detection      │
│ - MediaPipe         │
│ - Landmark extract  │
└──────────┬──────────┘
           ↓
┌─────────────────────┐
│ Measurement Extract │
│ - Body analysis     │
│ - Dimension calc    │
└──────────┬──────────┘
           ↓
┌─────────────────────┐
│ 3D Model Generation │
│ - Parametric mesh   │
│ - Texture mapping   │
│ - LOD generation    │
└──────────┬──────────┘
           ↓
┌─────────────────────┐
│ Optimization        │
│ - Draco compression │
│ - GLTF export       │
└──────────┬──────────┘
           ↓
    Complete (WebSocket notify)
```

#### 4.1.3 Data Model
```typescript
Avatar {
  id: UUID
  userId: UUID
  name: string
  status: enum (processing, ready, error)
  measurements: Measurement
  modelUrl: string
  metadata: JSON
  createdAt: timestamp
  updatedAt: timestamp
}

Measurement {
  id: UUID
  avatarId: UUID
  height: decimal
  shoulderWidth: decimal
  chestCircumference: decimal
  waistCircumference: decimal
  hipCircumference: decimal
  inseamLength: decimal
  armLength: decimal
  neckCircumference: decimal
  unit: enum (metric, imperial)
  confidence: decimal
  isManual: boolean
}

Photo {
  id: UUID
  avatarId: UUID
  type: enum (front, side, back)
  originalUrl: string
  processedUrl: string
  metadata: JSON
  uploadedAt: timestamp
}
```

### 4.2 Catalog Service Architecture

#### 4.2.1 Component Structure
```
catalog-service/
├── controllers/
│   ├── silhouette.controller.ts
│   ├── fabric.controller.ts
│   ├── pattern.controller.ts
│   ├── element.controller.ts
│   └── search.controller.ts
├── services/
│   ├── catalog.service.ts
│   ├── search.service.ts
│   ├── recommendation.service.ts
│   └── import-export.service.ts
├── repositories/
│   ├── silhouette.repository.ts
│   ├── fabric.repository.ts
│   └── catalog-item.repository.ts
├── entities/
│   ├── silhouette.entity.ts
│   ├── fabric.entity.ts
│   ├── pattern.entity.ts
│   └── element.entity.ts
└── dto/
    ├── catalog-filter.dto.ts
    └── search-query.dto.ts
```

#### 4.2.2 Search Architecture
```
Search Request
    ↓
┌─────────────────────┐
│ Query Parser        │
│ - Tokenization      │
│ - Synonym expansion │
└──────────┬──────────┘
           ↓
┌─────────────────────┐
│ Multi-tier Search   │
│ ┌─────────────────┐ │
│ │ L1: Cache       │ │ → Redis (hot items)
│ └─────────────────┘ │
│ ┌─────────────────┐ │
│ │ L2: Elasticsearch│ │ → Full-text search
│ └─────────────────┘ │
│ ┌─────────────────┐ │
│ │ L3: Database    │ │ → PostgreSQL fallback
│ └─────────────────┘ │
└──────────┬──────────┘
           ↓
┌─────────────────────┐
│ Result Aggregation  │
│ - Ranking           │
│ - Deduplication     │
│ - Filtering         │
└──────────┬──────────┘
           ↓
┌─────────────────────┐
│ Response Enhancement│
│ - Thumbnail URLs    │
│ - Metadata enrich   │
│ - Personalization   │
└──────────┬──────────┘
           ↓
     Return Results
```

#### 4.2.3 Data Model
```typescript
Silhouette {
  id: UUID
  name: string
  category: enum (tops, bottoms, dresses, outerwear)
  subcategory: string
  modelUrl: string (GLTF)
  thumbnailUrl: string
  sizes: Size[]
  fitType: enum (slim, regular, loose, oversized)
  tags: string[]
  metadata: JSON
  isActive: boolean
}

Fabric {
  id: UUID
  name: string
  type: enum (solid, texture, technical)
  diffuseMap: string
  normalMap: string
  roughnessMap: string
  properties: JSON {
    shine: decimal
    stretch: decimal
    drape: enum
  }
  colors: Color[]
  tags: string[]
}

Pattern {
  id: UUID
  name: string
  type: enum (print, stripe, check, dot)
  textureUrl: string
  isTileable: boolean
  scaleRange: { min, max }
  colors: Color[]
  tags: string[]
}

Element {
  id: UUID
  name: string
  category: enum (trim, decorative)
  type: string (button, zipper, pocket, etc.)
  modelUrl: string
  variants: Variant[]
  placementRules: JSON
}
```

### 4.3 Design Service Architecture

#### 4.3.1 Component Structure
```
design-service/
├── controllers/
│   ├── design.controller.ts
│   ├── layer.controller.ts
│   ├── export.controller.ts
│   └── collaboration.controller.ts
├── services/
│   ├── design.service.ts
│   ├── layer.service.ts
│   ├── rendering.service.ts
│   ├── export.service.ts
│   └── version.service.ts
├── repositories/
│   ├── design.repository.ts
│   └── version.repository.ts
├── gateways/
│   ├── design.gateway.ts      # WebSocket
│   └── collaboration.gateway.ts
├── entities/
│   ├── design.entity.ts
│   ├── layer.entity.ts
│   └── version.entity.ts
└── processors/
    ├── render-processor.ts
    └── export-processor.ts
```

#### 4.3.2 Real-time Collaboration Architecture
```
┌─────────────────────────────────────────────────────────┐
│                   Client A & B                          │
│           (WebSocket connections)                       │
└──────────────────┬──────────────────────────────────────┘
                   ↓
┌──────────────────────────────────────────────────────────┐
│              Socket.io Server (Sticky sessions)          │
│  ┌────────────────────────────────────────────────────┐  │
│  │  Connection Manager                                │  │
│  │  - Session tracking                                │  │
│  │  - User presence                                   │  │
│  └────────────────────────────────────────────────────┘  │
│  ┌────────────────────────────────────────────────────┐  │
│  │  Event Router                                      │  │
│  │  - layer_added, layer_updated, cursor_moved        │  │
│  └────────────────────────────────────────────────────┘  │
└──────────────────┬───────────────────────────────────────┘
                   ↓
┌──────────────────────────────────────────────────────────┐
│               Redis Pub/Sub (Event Bus)                  │
│  - Multi-server synchronization                          │
│  - Event persistence (short-term)                        │
└──────────────────┬───────────────────────────────────────┘
                   ↓
┌──────────────────────────────────────────────────────────┐
│            Design State Manager                          │
│  ┌────────────────────────────────────────────────────┐  │
│  │  Operational Transform (OT) / CRDT                 │  │
│  │  - Conflict resolution                             │  │
│  │  - State reconciliation                            │  │
│  └────────────────────────────────────────────────────┘  │
└──────────────────┬───────────────────────────────────────┘
                   ↓
┌──────────────────────────────────────────────────────────┐
│                    MongoDB                               │
│                (Design documents)                        │
└──────────────────────────────────────────────────────────┘
```

#### 4.3.3 Export Pipeline Architecture
```
Export Request
    ↓
┌─────────────────────┐
│ Queue Job           │
│ - Bull Queue        │
│ - Priority handling │
└──────────┬──────────┘
           ↓
┌─────────────────────┐
│ Design Hydration    │
│ - Fetch design      │
│ - Load assets       │
│ - Resolve references│
└──────────┬──────────┘
           ↓
┌─────────────────────┐
│ Render Engine       │
│ - Three.js setup    │
│ - Scene build       │
│ - Lighting apply    │
└──────────┬──────────┘
           ↓
    ┌──────┴──────┐
    ↓             ↓
┌────────┐   ┌────────┐
│ Image  │   │ Video  │
│ Export │   │ Export │
└────┬───┘   └───┬────┘
     ↓           ↓
     │      ┌──────────┐
     │      │ FFmpeg   │
     │      │ 360° gen │
     │      └────┬─────┘
     ↓           ↓
┌─────────────────────┐
│ Post-processing     │
│ - Watermark         │
│ - Compression       │
│ - Format conversion │
└──────────┬──────────┘
           ↓
┌─────────────────────┐
│ Upload to S3        │
│ - Generate signed URL
│ - CDN invalidation  │
└──────────┬──────────┘
           ↓
┌─────────────────────┐
│ Notify User         │
│ - WebSocket         │
│ - Email (optional)  │
└─────────────────────┘
```

#### 4.3.4 Data Model
```typescript
Design {
  id: UUID
  userId: UUID
  name: string
  description: string
  avatarId: UUID
  layers: Layer[]
  metadata: JSON {
    created: timestamp
    modified: timestamp
    version: number
    tags: string[]
  }
  status: enum (draft, published, archived)
  visibility: enum (private, shared, public)
  forkFrom: UUID (nullable)
}

Layer {
  id: UUID
  designId: UUID
  type: enum (silhouette, fabric, pattern, element)
  order: number (z-index)
  data: JSON {
    itemId: UUID
    transform: { position, rotation, scale }
    properties: {}
  }
  isVisible: boolean
  isLocked: boolean
}

Version {
  id: UUID
  designId: UUID
  versionNumber: number
  snapshot: JSON (complete design state)
  changes: JSON (diff from previous)
  createdBy: UUID
  createdAt: timestamp
}

Export {
  id: UUID
  designId: UUID
  type: enum (image, video, model, pdf)
  format: string
  quality: enum (draft, standard, high, ultra)
  status: enum (queued, processing, complete, error)
  fileUrl: string
  fileSize: number
  createdAt: timestamp
}
```

---

## 5. Shared Infrastructure Architecture

### 5.1 Authentication & Authorization

#### 5.1.1 Auth Flow
```
┌─────────────┐
│   Client    │
└──────┬──────┘
       │ 1. Login (email/password or OAuth)
       ↓
┌─────────────────────┐
│  Auth Service       │
│  - Validate creds   │
│  - Generate tokens  │
└──────┬──────────────┘
       │ 2. Return JWT + Refresh Token
       ↓
┌─────────────┐
│   Client    │ → Stores tokens (httpOnly cookie + localStorage)
└──────┬──────┘
       │ 3. API Request (with JWT in Authorization header)
       ↓
┌─────────────────────┐
│  API Gateway        │
│  - Verify JWT       │
│  - Check permissions│
└──────┬──────────────┘
       │ 4. Forward request with user context
       ↓
┌─────────────────────┐
│  Service Endpoint   │
│  - Process request  │
└─────────────────────┘
```

#### 5.1.2 Token Structure
```typescript
AccessToken (JWT) {
  sub: UUID (userId)
  email: string
  roles: string[]
  permissions: string[]
  iat: number
  exp: number (15 minutes)
}

RefreshToken (JWT) {
  sub: UUID (userId)
  tokenId: UUID
  iat: number
  exp: number (7 days)
}
```

### 5.2 Caching Strategy

#### 5.2.1 Multi-tier Cache Architecture
```
Request
  ↓
┌─────────────────────┐
│ L1: Application     │ → node-cache (in-memory)
│     Memory Cache    │   TTL: 5 minutes
│ - Hot data          │   Size: 100MB per instance
│ - User sessions     │
└──────┬──────────────┘
       │ Cache miss
       ↓
┌─────────────────────┐
│ L2: Redis Cache     │ → Redis Cluster
│ - Distributed       │   TTL: 1 hour
│ - Shared state      │   Size: 10GB
│ - Design drafts     │
└──────┬──────────────┘
       │ Cache miss
       ↓
┌─────────────────────┐
│ L3: Database        │ → PostgreSQL / MongoDB
│ - Source of truth   │
└──────┬──────────────┘
       │ Cache warm-up
       ↓
    Update L2 & L1
```

#### 5.2.2 Cache Invalidation Strategy
```typescript
// Event-driven invalidation
CatalogUpdated → Invalidate catalog cache
DesignSaved → Invalidate design cache
AvatarProcessed → Invalidate avatar cache

// TTL-based invalidation
Hot catalog items: 1 hour
User sessions: 24 hours
Design drafts: 30 minutes
Search results: 15 minutes

// Manual invalidation
Admin actions → Immediate purge
Deployment → Flush all caches
```

### 5.3 File Storage Architecture

#### 5.3.1 S3 Bucket Structure
```
fashion-wallet-production/
├── avatars/
│   ├── photos/
│   │   ├── original/{userId}/{avatarId}/{photoId}.jpg
│   │   └── processed/{userId}/{avatarId}/{photoId}.png
│   └── models/
│       └── {userId}/{avatarId}/
│           ├── avatar.gltf
│           ├── avatar-lod1.gltf
│           └── avatar-lod2.gltf
├── catalog/
│   ├── silhouettes/
│   │   └── {category}/{silhouetteId}/
│   │       ├── model.gltf
│   │       └── thumbnail.jpg
│   ├── fabrics/
│   │   └── {fabricId}/
│   │       ├── diffuse.jpg
│   │       ├── normal.jpg
│   │       └── roughness.jpg
│   └── patterns/
│       └── {patternId}/texture.jpg
├── designs/
│   ├── renders/
│   │   └── {userId}/{designId}/
│   │       ├── front.png
│   │       ├── back.png
│   │       └── turntable.mp4
│   └── exports/
│       └── {userId}/{designId}/{exportId}.{ext}
└── temp/
    └── {processingId}/
```

#### 5.3.2 CDN Strategy
```
┌─────────────────────────────────────────────────────────┐
│                  Cloudflare CDN                         │
│  ┌────────────────────────────────────────────────────┐ │
│  │  Edge Locations (200+ worldwide)                   │ │
│  │  - Cache static assets                             │ │
│  │  - Serve 3D models                                 │ │
│  │  - Image optimization (auto WebP)                  │ │
│  └────────────────────────────────────────────────────┘ │
└──────────────────┬──────────────────────────────────────┘
                   │ Cache miss
                   ↓
┌─────────────────────────────────────────────────────────┐
│                  Origin (S3)                            │
│  - Multi-region replication                             │
│  - Signed URLs for private content                      │
│  - Lifecycle policies for temp files                    │
└─────────────────────────────────────────────────────────┘

Cache Rules:
- Static assets (JS, CSS): 1 year
- 3D models: 30 days
- Rendered images: 7 days
- Thumbnails: 30 days
- Temporary files: 1 hour
```

### 5.4 Message Queue Architecture

#### 5.4.1 Queue Structure
```
┌─────────────────────────────────────────────────────────┐
│               Bull Queue (Redis-based)                  │
│  ┌────────────────────────────────────────────────────┐ │
│  │  Avatar Processing Queue                           │ │
│  │  - Priority: High                                  │ │
│  │  - Concurrency: 5                                  │ │
│  │  - Retry: 3 attempts                               │ │
│  └────────────────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────────────────┐ │
│  │  Render Queue                                      │ │
│  │  - Priority: Medium                                │ │
│  │  - Concurrency: 10                                 │ │
│  │  - Retry: 2 attempts                               │ │
│  └────────────────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────────────────┐ │
│  │  Export Queue                                      │ │
│  │  - Priority: Low                                   │ │
│  │  - Concurrency: 3                                  │ │
│  │  - Retry: 3 attempts                               │ │
│  └────────────────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────────────────┐ │
│  │  Email Queue                                       │ │
│  │  - Priority: Low                                   │ │
│  │  - Concurrency: 20                                 │ │
│  │  - Retry: 5 attempts                               │ │
│  └────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

#### 5.4.2 Job Processing Pattern
```typescript
// Job creation
await avatarQueue.add('process-photo', {
  avatarId: 'uuid',
  photoUrl: 's3-url'
}, {
  priority: 1,
  attempts: 3,
  backoff: { type: 'exponential', delay: 2000 }
});

// Job processing
avatarQueue.process('process-photo', async (job) => {
  const { avatarId, photoUrl } = job.data;

  // Update progress
  await job.progress(10);

  // Process photo
  const result = await processPhoto(photoUrl);

  await job.progress(50);

  // Generate 3D model
  const model = await generateModel(result);

  await job.progress(90);

  // Save to database
  await saveAvatar(avatarId, model);

  return { success: true, modelUrl: model.url };
});

// Job completion handler
avatarQueue.on('completed', async (job, result) => {
  // Notify user via WebSocket
  io.to(job.data.userId).emit('avatar:processed', result);
});
```

### 5.5 Search Infrastructure

#### 5.5.1 Elasticsearch Architecture
```
┌─────────────────────────────────────────────────────────┐
│              Elasticsearch Cluster                      │
│  ┌────────────────────────────────────────────────────┐ │
│  │  catalog-items index                               │ │
│  │  - Silhouettes, Fabrics, Patterns, Elements        │ │
│  │  - Shards: 3, Replicas: 2                          │ │
│  └────────────────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────────────────┐ │
│  │  designs index                                     │ │
│  │  - User designs (public)                           │ │
│  │  - Shards: 2, Replicas: 1                          │ │
│  └────────────────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────────────────┐ │
│  │  users index                                       │ │
│  │  - User profiles                                   │ │
│  │  - Shards: 1, Replicas: 1                          │ │
│  └────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

#### 5.5.2 Search Indexing Strategy
```typescript
// Real-time indexing via database triggers
CatalogItem.afterCreate → Index to ES
CatalogItem.afterUpdate → Reindex in ES
CatalogItem.afterDelete → Remove from ES

// Bulk indexing for initial load
bulkIndex({
  index: 'catalog-items',
  body: items.flatMap(item => [
    { index: { _id: item.id } },
    {
      name: item.name,
      category: item.category,
      tags: item.tags,
      description: item.description,
      colors: item.colors,
      type: item.type
    }
  ])
});

// Search query with filters
{
  query: {
    bool: {
      must: [
        { match: { name: searchTerm } }
      ],
      filter: [
        { term: { category: 'tops' } },
        { terms: { colors: ['red', 'blue'] } }
      ]
    }
  },
  sort: [
    { _score: 'desc' },
    { popularity: 'desc' }
  ]
}
```

---

## 6. Data Architecture

### 6.1 Database Schema Design

#### 6.1.1 PostgreSQL Schema Organization
```sql
-- Schema structure
CREATE SCHEMA IF NOT EXISTS auth;
CREATE SCHEMA IF NOT EXISTS avatar;
CREATE SCHEMA IF NOT EXISTS catalog;
CREATE SCHEMA IF NOT EXISTS design;
CREATE SCHEMA IF NOT EXISTS analytics;

-- auth schema
CREATE TABLE auth.users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  roles VARCHAR[] DEFAULT ARRAY['user'],
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE auth.sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  refresh_token VARCHAR(500) NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- avatar schema
CREATE TABLE avatar.avatars (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  status VARCHAR(50) DEFAULT 'processing',
  model_url TEXT,
  thumbnail_url TEXT,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  INDEX idx_user_id (user_id),
  INDEX idx_status (status)
);

CREATE TABLE avatar.measurements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  avatar_id UUID REFERENCES avatar.avatars(id) ON DELETE CASCADE,
  height DECIMAL(10,2),
  shoulder_width DECIMAL(10,2),
  chest_circumference DECIMAL(10,2),
  waist_circumference DECIMAL(10,2),
  hip_circumference DECIMAL(10,2),
  inseam_length DECIMAL(10,2),
  arm_length DECIMAL(10,2),
  neck_circumference DECIMAL(10,2),
  unit VARCHAR(20) DEFAULT 'metric',
  confidence DECIMAL(3,2),
  is_manual BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(avatar_id)
);

-- catalog schema
CREATE TABLE catalog.silhouettes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  category VARCHAR(100) NOT NULL,
  subcategory VARCHAR(100),
  model_url TEXT NOT NULL,
  thumbnail_url TEXT,
  fit_type VARCHAR(50),
  tags VARCHAR[],
  metadata JSONB,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  INDEX idx_category (category),
  INDEX idx_tags USING GIN(tags)
);

CREATE TABLE catalog.fabrics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  type VARCHAR(100) NOT NULL,
  diffuse_map_url TEXT,
  normal_map_url TEXT,
  roughness_map_url TEXT,
  properties JSONB,
  tags VARCHAR[],
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  INDEX idx_type (type)
);

-- design schema
CREATE TABLE design.designs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  avatar_id UUID REFERENCES avatar.avatars(id) ON DELETE SET NULL,
  status VARCHAR(50) DEFAULT 'draft',
  visibility VARCHAR(50) DEFAULT 'private',
  fork_from UUID REFERENCES design.designs(id) ON DELETE SET NULL,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  INDEX idx_user_id (user_id),
  INDEX idx_status (status),
  INDEX idx_visibility (visibility)
);

-- Partitioning for large tables
CREATE TABLE analytics.events (
  id BIGSERIAL,
  user_id UUID,
  event_type VARCHAR(100),
  event_data JSONB,
  created_at TIMESTAMP DEFAULT NOW()
) PARTITION BY RANGE (created_at);

CREATE TABLE analytics.events_2025_11
  PARTITION OF analytics.events
  FOR VALUES FROM ('2025-11-01') TO ('2025-12-01');
```

#### 6.1.2 MongoDB Collections
```javascript
// designs collection (flexible document storage)
{
  _id: ObjectId,
  designId: UUID, // Reference to PostgreSQL
  layers: [
    {
      id: UUID,
      type: String,
      order: Number,
      data: {
        itemId: UUID,
        transform: {
          position: { x, y, z },
          rotation: { x, y, z },
          scale: { x, y, z }
        },
        properties: {}
      },
      isVisible: Boolean,
      isLocked: Boolean
    }
  ],
  history: [
    {
      action: String,
      timestamp: Date,
      data: {}
    }
  ],
  collaborators: [
    {
      userId: UUID,
      permissions: [String],
      lastActive: Date
    }
  ]
}

// avatars_3d collection (3D model data)
{
  _id: ObjectId,
  avatarId: UUID,
  mesh: {
    vertices: ArrayBuffer,
    faces: ArrayBuffer,
    uvs: ArrayBuffer
  },
  textures: [
    {
      type: String,
      url: String,
      data: Binary
    }
  ],
  bones: [],
  metadata: {}
}

// catalog_items collection
{
  _id: ObjectId,
  catalogId: UUID,
  type: String, // silhouette, fabric, pattern, element
  attributes: {}, // Flexible schema per type
  variants: [],
  media: [
    {
      type: String,
      url: String,
      thumbnail: String
    }
  ],
  searchTerms: [String], // Denormalized for search
  indexed_at: Date
}
```

### 6.2 Data Synchronization

#### 6.2.1 Polyglot Persistence Strategy
```
PostgreSQL (Source of Truth)
    ↓ (Change Data Capture)
┌─────────────────────┐
│ Debezium CDC        │
│ - Capture changes   │
│ - Stream to Kafka   │
└──────────┬──────────┘
           ↓
┌─────────────────────┐
│ Event Stream (Kafka)│
│ - Change events     │
└──────────┬──────────┘
           ↓
    ┌──────┴──────┐
    ↓             ↓
┌────────┐   ┌────────────┐
│MongoDB │   │Elasticsearch│
│Update  │   │Reindex     │
└────────┘   └────────────┘
```

#### 6.2.2 Data Consistency Patterns
```typescript
// Eventual consistency for reads
// Strong consistency for writes

// Pattern 1: Write to PostgreSQL, async sync to MongoDB
async createDesign(data) {
  // 1. Write to PostgreSQL (authoritative)
  const design = await db.designs.create(data);

  // 2. Queue sync job
  await syncQueue.add('sync-design', {
    designId: design.id,
    operation: 'create'
  });

  return design;
}

// Pattern 2: Read from cache/MongoDB, fallback to PostgreSQL
async getDesign(id) {
  // 1. Try cache
  let design = await cache.get(`design:${id}`);
  if (design) return design;

  // 2. Try MongoDB (fast, flexible queries)
  design = await mongo.designs.findOne({ designId: id });
  if (design) {
    await cache.set(`design:${id}`, design, 3600);
    return design;
  }

  // 3. Fallback to PostgreSQL
  design = await db.designs.findById(id);
  await cache.set(`design:${id}`, design, 3600);

  return design;
}
```

---

## 7. API Architecture

### 7.1 REST API Design

#### 7.1.1 API Versioning
```
/api/v1/...  (Current stable)
/api/v2/...  (Beta features)

Header-based versioning (alternative):
Accept: application/vnd.fashionwallet.v1+json
```

#### 7.1.2 API Gateway Configuration
```yaml
# Rate limiting
rate_limit:
  anonymous: 100 req/hour
  authenticated: 1000 req/hour
  premium: 5000 req/hour
  admin: unlimited

# Request transformation
headers:
  add:
    - X-Request-ID: ${UUID}
    - X-Response-Time: ${LATENCY_MS}
  remove:
    - X-Powered-By

# Circuit breaker
circuit_breaker:
  threshold: 50% error rate
  timeout: 30s
  recovery_time: 60s
```

### 7.2 GraphQL Architecture

#### 7.2.1 Schema Organization
```graphql
# schema.graphql
type Query {
  # Avatar queries
  avatar(id: ID!): Avatar
  avatars(userId: ID!): [Avatar!]!

  # Catalog queries
  catalog(
    filters: CatalogFilters
    pagination: Pagination
    sort: Sort
  ): CatalogConnection!

  # Design queries
  design(id: ID!): Design
  myDesigns(
    status: DesignStatus
    pagination: Pagination
  ): DesignConnection!
}

type Mutation {
  # Avatar mutations
  createAvatar(input: CreateAvatarInput!): AvatarPayload!
  updateMeasurements(
    avatarId: ID!
    measurements: MeasurementInput!
  ): AvatarPayload!

  # Design mutations
  createDesign(input: CreateDesignInput!): DesignPayload!
  updateLayer(
    designId: ID!
    layerId: ID!
    updates: LayerInput!
  ): DesignPayload!
}

type Subscription {
  # Real-time updates
  designUpdated(designId: ID!): Design!
  collaboratorCursor(designId: ID!): CursorPosition!
  avatarProcessing(avatarId: ID!): ProcessingStatus!
}
```

#### 7.2.2 DataLoader Pattern (N+1 Prevention)
```typescript
// Avatar loader
const avatarLoader = new DataLoader(async (avatarIds) => {
  const avatars = await db.avatars.findMany({
    where: { id: { in: avatarIds } }
  });
  return avatarIds.map(id =>
    avatars.find(a => a.id === id)
  );
});

// Resolver
{
  Design: {
    avatar: (design, args, { loaders }) => {
      return loaders.avatar.load(design.avatarId);
    }
  }
}
```

### 7.3 WebSocket Architecture

#### 7.3.1 Namespace Organization
```typescript
// Namespaces
io.of('/avatar').on('connection', (socket) => {
  // Avatar processing updates
});

io.of('/design').on('connection', (socket) => {
  // Design collaboration
});

io.of('/notifications').on('connection', (socket) => {
  // General notifications
});
```

#### 7.3.2 Event Schema
```typescript
// Client → Server
{
  'design:join': { designId: UUID },
  'design:update': { designId: UUID, changes: {} },
  'cursor:move': { designId: UUID, position: {} }
}

// Server → Client
{
  'design:updated': { designId: UUID, data: {} },
  'collaborator:joined': { userId: UUID, user: {} },
  'processing:progress': { avatarId: UUID, progress: number }
}
```

---

## 8. Security Architecture

### 8.1 Security Layers

```
┌─────────────────────────────────────────────────────────┐
│  Layer 1: Network Security                              │
│  - Cloudflare DDoS protection                           │
│  - WAF rules                                            │
│  - SSL/TLS termination                                  │
└──────────────────┬──────────────────────────────────────┘
                   ↓
┌─────────────────────────────────────────────────────────┐
│  Layer 2: API Gateway Security                          │
│  - Rate limiting                                        │
│  - Request validation                                   │
│  - IP whitelist/blacklist                               │
└──────────────────┬──────────────────────────────────────┘
                   ↓
┌─────────────────────────────────────────────────────────┐
│  Layer 3: Authentication                                │
│  - JWT validation                                       │
│  - Session management                                   │
│  - MFA enforcement                                      │
└──────────────────┬──────────────────────────────────────┘
                   ↓
┌─────────────────────────────────────────────────────────┐
│  Layer 4: Authorization                                 │
│  - RBAC                                                 │
│  - Resource ownership                                   │
│  - Permission checks                                    │
└──────────────────┬──────────────────────────────────────┘
                   ↓
┌─────────────────────────────────────────────────────────┐
│  Layer 5: Data Security                                 │
│  - Encryption at rest (AES-256)                         │
│  - Encryption in transit (TLS 1.3)                      │
│  - Field-level encryption (PII)                         │
└─────────────────────────────────────────────────────────┘
```

### 8.2 Data Encryption

#### 8.2.1 Encryption Strategy
```typescript
// Field-level encryption for sensitive data
class EncryptionService {
  async encryptField(data: string): Promise<string> {
    const key = await this.kms.getDataKey();
    const cipher = crypto.createCipher('aes-256-gcm', key);
    const encrypted = cipher.update(data, 'utf8', 'hex');
    return encrypted + cipher.final('hex');
  }

  async decryptField(encrypted: string): Promise<string> {
    const key = await this.kms.getDataKey();
    const decipher = crypto.createDecipher('aes-256-gcm', key);
    const decrypted = decipher.update(encrypted, 'hex', 'utf8');
    return decrypted + decipher.final('utf8');
  }
}

// Database encryption
// PostgreSQL: pgcrypto extension
CREATE EXTENSION IF NOT EXISTS pgcrypto;

INSERT INTO users (email, password_hash)
VALUES ('user@example.com', crypt('password', gen_salt('bf', 12)));

// S3 encryption
s3.putObject({
  Bucket: 'fashion-wallet',
  Key: 'avatar/photo.jpg',
  Body: buffer,
  ServerSideEncryption: 'AES256'
});
```

---

## 9. Monitoring & Observability

### 9.1 Observability Stack

```
┌─────────────────────────────────────────────────────────┐
│               Application Layer                         │
│  ┌────────────────────────────────────────────────────┐ │
│  │  OpenTelemetry SDK                                 │ │
│  │  - Tracing                                         │ │
│  │  - Metrics                                         │ │
│  │  - Logs                                            │ │
│  └────────────────┬───────────────────────────────────┘ │
└───────────────────┼─────────────────────────────────────┘
                    ↓
┌───────────────────────────────────────────────────────────┐
│              Collection Layer                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │
│  │  Jaeger      │  │  Prometheus  │  │  Loki        │    │
│  │  (Traces)    │  │  (Metrics)   │  │  (Logs)      │    │
│  └──────────────┘  └──────────────┘  └──────────────┘    │
└───────────────────────┬───────────────────────────────────┘
                        ↓
┌───────────────────────────────────────────────────────────┐
│            Visualization & Alerting                       │
│  ┌────────────────────────────────────────────────────┐   │
│  │  Grafana Dashboards                                │   │
│  │  - System metrics                                  │   │
│  │  - Business metrics                                │   │
│  │  - Trace visualization                             │   │
│  └────────────────────────────────────────────────────┘   │
│  ┌────────────────────────────────────────────────────┐   │
│  │  Alert Manager                                     │   │
│  │  - PagerDuty integration                           │   │
│  │  - Slack notifications                             │   │
│  └────────────────────────────────────────────────────┘   │
└───────────────────────────────────────────────────────────┘
```

### 9.2 Key Metrics

#### 9.2.1 Application Metrics
```yaml
# Request metrics
http_requests_total{method, path, status}
http_request_duration_seconds{method, path}

# Business metrics
avatars_created_total
designs_created_total
exports_generated_total
catalog_items_viewed_total

# Processing metrics
avatar_processing_duration_seconds
render_queue_size
export_queue_size
```

#### 9.2.2 Infrastructure Metrics
```yaml
# System metrics
node_cpu_usage_percent
node_memory_usage_bytes
node_disk_usage_percent

# Database metrics
postgres_connections_active
postgres_query_duration_seconds
mongodb_operations_total

# Cache metrics
redis_hits_total
redis_misses_total
redis_memory_usage_bytes
```

---

## 10. Disaster Recovery & Business Continuity

### 10.1 Backup Strategy

```
┌─────────────────────────────────────────────────────────┐
│              Database Backups                           │
│  ┌────────────────────────────────────────────────────┐ │
│  │  PostgreSQL                                        │ │
│  │  - Continuous WAL archiving                        │ │
│  │  - Daily full backups                              │ │
│  │  - Retention: 30 days                              │ │
│  │  - Point-in-time recovery capability               │ │
│  └────────────────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────────────────┐ │
│  │  MongoDB                                           │ │
│  │  - Hourly snapshots                                │ │
│  │  - Oplog for point-in-time recovery                │ │
│  │  - Retention: 7 days                               │ │
│  └────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│              File Storage Backups                       │
│  ┌────────────────────────────────────────────────────┐ │
│  │  S3 Cross-region Replication                       │ │
│  │  - Primary: us-east-1                              │ │
│  │  - Replica: eu-west-1                              │ │
│  │  - Versioning enabled                              │ │
│  └────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

### 10.2 Disaster Recovery Plan

```yaml
RTO (Recovery Time Objective): 4 hours
RPO (Recovery Point Objective): 1 hour

Disaster Scenarios:
  1. Database failure:
     - Promote read replica
     - Restore from backup if needed
     - RTO: 30 minutes

  2. Region outage:
     - Failover to secondary region
     - Update DNS
     - RTO: 2 hours

  3. Complete system failure:
     - Full infrastructure rebuild
     - Restore from backups
     - RTO: 4 hours
```

---

## 11. Scalability Strategy

### 11.1 Scaling Patterns

#### 11.1.1 Horizontal Scaling
```yaml
# Application servers
min_replicas: 2
max_replicas: 20
target_cpu_utilization: 70%
target_memory_utilization: 80%

# Worker processes
avatar_workers:
  min: 2
  max: 10
  scale_metric: queue_depth

render_workers:
  min: 3
  max: 15
  scale_metric: queue_depth
```

#### 11.1.2 Database Scaling
```
PostgreSQL:
  Primary (Write)
       ↓
  ┌────┴────┐
  ↓         ↓
Read      Read
Replica   Replica

Connection Pooling:
- PgBouncer
- Pool size: 20-100 per instance
- Transaction mode

MongoDB:
Sharded Cluster
- Shard key: userId
- 3 shards initially
- Horizontal scaling as needed
```

### 11.2 Performance Optimization

#### 11.2.1 Database Optimization
```sql
-- Indexing strategy
CREATE INDEX idx_designs_user_status
  ON designs(user_id, status)
  WHERE status != 'archived';

CREATE INDEX idx_catalog_search
  ON catalog_items
  USING GIN(to_tsvector('english', name || ' ' || description));

-- Materialized views for complex queries
CREATE MATERIALIZED VIEW design_stats AS
SELECT
  user_id,
  COUNT(*) as total_designs,
  COUNT(CASE WHEN status = 'published' THEN 1 END) as published,
  MAX(updated_at) as last_activity
FROM designs
GROUP BY user_id;

-- Refresh strategy
REFRESH MATERIALIZED VIEW CONCURRENTLY design_stats;
```

#### 11.2.2 Application Optimization
```typescript
// Lazy loading
const Design = {
  layers: (parent, args, { loaders }) => {
    // Only load layers when requested
    return loaders.layers.load(parent.id);
  }
};

// Pagination cursor-based
async getDesigns(userId: string, cursor: string, limit: number) {
  return db.designs.findMany({
    where: {
      userId,
      createdAt: { lt: cursor ? new Date(cursor) : new Date() }
    },
    orderBy: { createdAt: 'desc' },
    take: limit + 1
  });
}

// Response compression
app.use(compression({
  level: 6,
  threshold: 1024 // 1KB
}));
```

---

## 12. Development & Deployment

### 12.1 CI/CD Pipeline

```
┌─────────────────────────────────────────────────────────┐
│                Code Repository (GitHub)                 │
└──────────────────┬──────────────────────────────────────┘
                   ↓
┌──────────────────────────────────────────────────────────┐
│              GitHub Actions Workflow                     │
│  ┌────────────────────────────────────────────────────┐  │
│  │  1. Lint & Format Check                            │  │
│  │     - ESLint, Prettier                             │  │
│  └────────────────────────────────────────────────────┘  │
│  ┌────────────────────────────────────────────────────┐  │
│  │  2. Unit Tests                                     │  │
│  │     - Jest, Coverage report                        │  │
│  └────────────────────────────────────────────────────┘  │
│  ┌────────────────────────────────────────────────────┐  │
│  │  3. Integration Tests                              │  │
│  │     - Supertest, Database tests                    │  │
│  └────────────────────────────────────────────────────┘  │
│  ┌────────────────────────────────────────────────────┐  │
│  │  4. Build Docker Images                            │  │
│  │     - Multi-stage builds                           │  │
│  │     - Push to ECR                                  │  │
│  └────────────────────────────────────────────────────┘  │
│  ┌────────────────────────────────────────────────────┐  │
│  │  5. Security Scanning                              │  │
│  │     - Snyk, Trivy                                  │  │
│  └────────────────────────────────────────────────────┘  │
│  ┌────────────────────────────────────────────────────┐  │
│  │  6. Deploy to Staging                              │  │
│  │     - ArgoCD sync                                  │  │
│  │     - Run E2E tests                                │  │
│  └────────────────────────────────────────────────────┘  │
│  ┌────────────────────────────────────────────────────┐  │
│  │  7. Deploy to Production (manual approval)         │  │
│  │     - Blue/green deployment                        │  │
│  │     - Health checks                                │  │
│  │     - Rollback on failure                          │  │
│  └────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────┘
```

### 12.2 Environment Strategy

```yaml
Environments:
  development:
    - Local Docker Compose
    - Mocked external services
    - Hot reload enabled

  staging:
    - Kubernetes cluster (smaller nodes)
    - Production-like data (anonymized)
    - Feature flags enabled

  production:
    - Kubernetes cluster (EKS)
    - Multi-AZ deployment
    - Blue/green deployments
    - Canary releases for high-risk changes
```

---

## Document Metadata

**Version**: 1.0
**Author**: Fashion Wallet Team
**Status**: Draft
**Review Cycle**: Quarterly
**Next Review**: February 2026

---

**End of Technical Architecture Document**

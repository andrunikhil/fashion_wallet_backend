# Feature Specification: Design Service

## Document Overview

**Version**: 1.0
**Last Updated**: November 2025
**Document Type**: Feature Specification
**Status**: Draft
**Spec ID**: spec-feature-03

---

## 1. Executive Summary

The Design Service provides an interactive design workspace where users create, customize, and manage fashion designs by combining avatars with catalog items. This service is the core creative tool of the Fashion Wallet platform, enabling users to visualize complete outfit designs in 3D.

### 1.1 Goals

- Enable intuitive outfit design creation and customization
- Provide real-time 3D visualization on user avatars
- Support multi-layer design composition
- Enable design versioning and collaboration
- Deliver high-quality export and rendering capabilities
- Achieve 60 FPS rendering performance

### 1.2 Non-Goals (Out of Scope)

- Video animation of designs
- Physical garment manufacturing integration (initial phase)
- Real-time multi-user collaborative editing (Phase 2)
- AR/VR design interface (future phase)
- AI-powered automated design generation (future phase)

---

## 2. Feature Requirements

### 2.1 Design Creation and Management

#### 2.1.1 Design Structure

```typescript
interface Design {
  id: string;
  userId: string;
  name: string;
  description: string;

  // Avatar reference
  avatarId: string;

  // Design composition
  layers: DesignLayer[];

  // Canvas settings
  canvasSettings: CanvasSettings;

  // Metadata
  tags: string[];
  category: DesignCategory;
  occasion: OccasionType[];
  season: SeasonType[];

  // Status and visibility
  status: DesignStatus;
  visibility: DesignVisibility;

  // Version control
  version: number;
  forkFrom?: string;           // Parent design if forked

  // Collaboration
  collaborators: Collaborator[];
  permissions: DesignPermissions;

  // Analytics
  viewCount: number;
  likeCount: number;
  forkCount: number;

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
  publishedAt?: Date;
  lastEditedAt: Date;
  deletedAt?: Date;
}

enum DesignStatus {
  DRAFT = 'draft',
  PUBLISHED = 'published',
  ARCHIVED = 'archived'
}

enum DesignVisibility {
  PRIVATE = 'private',
  SHARED = 'shared',             // Shared with specific users
  PUBLIC = 'public'
}

enum DesignCategory {
  OUTFIT = 'outfit',
  TOP = 'top',
  BOTTOM = 'bottom',
  DRESS = 'dress',
  OUTERWEAR = 'outerwear',
  FULL_COLLECTION = 'full_collection'
}

interface Collaborator {
  userId: string;
  role: CollaboratorRole;
  addedAt: Date;
}

enum CollaboratorRole {
  VIEWER = 'viewer',
  COMMENTER = 'commenter',
  EDITOR = 'editor',
  OWNER = 'owner'
}
```

#### 2.1.2 Layer System

```typescript
interface DesignLayer {
  id: string;
  designId: string;
  type: LayerType;
  order: number;                 // Z-index for rendering

  // Catalog item reference
  catalogItemId: string;
  catalogItemType: CatalogItemType;

  // Transform
  transform: Transform3D;

  // Customization
  customization: LayerCustomization;

  // Visibility and locking
  isVisible: boolean;
  isLocked: boolean;

  // Blend mode
  blendMode: BlendMode;
  opacity: number;               // 0-100

  // Metadata
  name: string;
  notes: string;

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

enum LayerType {
  SILHOUETTE = 'silhouette',
  FABRIC = 'fabric',
  PATTERN = 'pattern',
  ELEMENT = 'element',
  ACCESSORY = 'accessory'
}

enum CatalogItemType {
  SILHOUETTE = 'silhouette',
  FABRIC = 'fabric',
  PATTERN = 'pattern',
  ELEMENT = 'element'
}

interface Transform3D {
  position: { x: number; y: number; z: number };
  rotation: { x: number; y: number; z: number };
  scale: { x: number; y: number; z: number };
}

interface LayerCustomization {
  // Color overrides
  colors?: {
    primary?: string;
    secondary?: string;
    accent?: string;
  };

  // Pattern customization
  patternScale?: number;
  patternRotation?: number;
  patternOffset?: { x: number; y: number };

  // Fabric properties
  fabricProperties?: {
    shine?: number;
    transparency?: number;
    roughness?: number;
  };

  // Element-specific
  elementPlacement?: {
    zone: string;
    count: number;
    spacing: number;
  };

  // Measurement adjustments
  measurements?: {
    length?: number;             // Percentage adjustment
    width?: number;
    fit?: number;
  };
}

enum BlendMode {
  NORMAL = 'normal',
  MULTIPLY = 'multiply',
  SCREEN = 'screen',
  OVERLAY = 'overlay',
  ADD = 'add'
}
```

#### 2.1.3 Canvas Settings

```typescript
interface CanvasSettings {
  // Viewport
  camera: {
    position: { x: number; y: number; z: number };
    target: { x: number; y: number; z: number };
    fov: number;
  };

  // Lighting
  lighting: LightingPreset | CustomLighting;

  // Background
  background: {
    type: 'color' | 'gradient' | 'image' | 'environment';
    value: string | GradientConfig | string;  // color/url
  };

  // Grid and guides
  showGrid: boolean;
  showGuides: boolean;
  snapToGrid: boolean;
  gridSize: number;

  // Rendering
  renderQuality: RenderQuality;
  antialiasing: boolean;
  shadows: boolean;
  ambientOcclusion: boolean;
}

enum LightingPreset {
  STUDIO = 'studio',
  OUTDOOR = 'outdoor',
  DRAMATIC = 'dramatic',
  SOFT = 'soft',
  NATURAL = 'natural'
}

interface CustomLighting {
  ambient: { color: string; intensity: number };
  directional: Array<{
    color: string;
    intensity: number;
    position: { x: number; y: number; z: number };
    castShadow: boolean;
  }>;
  spot: Array<{
    color: string;
    intensity: number;
    position: { x: number; y: number; z: number };
    target: { x: number; y: number; z: number };
    angle: number;
  }>;
}

enum RenderQuality {
  DRAFT = 'draft',               // Low quality, fast
  STANDARD = 'standard',         // Medium quality
  HIGH = 'high',                 // High quality
  ULTRA = 'ultra'                // Maximum quality
}
```

### 2.2 Design Operations

#### 2.2.1 Layer Operations

```typescript
interface LayerOperations {
  // CRUD
  addLayer(designId: string, layer: CreateLayerDTO): Promise<DesignLayer>;
  updateLayer(layerId: string, updates: UpdateLayerDTO): Promise<DesignLayer>;
  deleteLayer(layerId: string): Promise<void>;
  duplicateLayer(layerId: string): Promise<DesignLayer>;

  // Ordering
  reorderLayers(designId: string, newOrder: string[]): Promise<void>;
  moveLayerUp(layerId: string): Promise<void>;
  moveLayerDown(layerId: string): Promise<void>;
  bringToFront(layerId: string): Promise<void>;
  sendToBack(layerId: string): Promise<void>;

  // Grouping
  groupLayers(layerIds: string[], groupName: string): Promise<LayerGroup>;
  ungroupLayers(groupId: string): Promise<void>;

  // Visibility
  toggleVisibility(layerId: string): Promise<void>;
  toggleLock(layerId: string): Promise<void>;
  hideAllExcept(layerId: string): Promise<void>;
  showAll(designId: string): Promise<void>;

  // Bulk operations
  deleteMultipleLayers(layerIds: string[]): Promise<void>;
  duplicateMultipleLayers(layerIds: string[]): Promise<DesignLayer[]>;

  // Merge
  mergeLayers(layerIds: string[]): Promise<DesignLayer>;
}

interface LayerGroup {
  id: string;
  name: string;
  layers: DesignLayer[];
  isExpanded: boolean;
  isVisible: boolean;
  isLocked: boolean;
}
```

#### 2.2.2 Design Variations

```typescript
interface DesignVariations {
  // Create variation
  createVariation(designId: string, changes: VariationChanges): Promise<Design>;

  // Colorways
  createColorway(designId: string, colorScheme: ColorScheme): Promise<Design>;
  generateColorways(designId: string, count: number): Promise<Design[]>;

  // Size grading
  createSizeVariation(designId: string, size: SizeVariation): Promise<Design>;

  // Compare
  compareVariations(designIds: string[]): Promise<ComparisonResult>;
}

interface VariationChanges {
  name: string;
  layerChanges: Array<{
    layerId: string;
    customization: Partial<LayerCustomization>;
  }>;
}

interface ColorScheme {
  name: string;
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    neutral: string;
  };
}

interface SizeVariation {
  size: 'XS' | 'S' | 'M' | 'L' | 'XL' | 'XXL';
  adjustments: {
    length: number;              // Percentage
    width: number;
    fit: number;
  };
}
```

### 2.3 Version Control

#### 2.3.1 Auto-Save and Versioning

```typescript
interface VersionControl {
  // Auto-save
  autoSave(designId: string, state: DesignState): Promise<void>;
  getLatestDraft(designId: string): Promise<DesignState>;

  // Manual versions
  createCheckpoint(designId: string, message: string): Promise<Version>;
  listVersions(designId: string): Promise<Version[]>;
  getVersion(versionId: string): Promise<DesignState>;
  restoreVersion(versionId: string): Promise<Design>;

  // Compare versions
  compareVersions(versionId1: string, versionId2: string): Promise<VersionDiff>;

  // History
  getHistory(designId: string, limit?: number): Promise<HistoryEntry[]>;
  undo(designId: string): Promise<DesignState>;
  redo(designId: string): Promise<DesignState>;
}

interface Version {
  id: string;
  designId: string;
  versionNumber: number;
  message: string;
  snapshot: DesignState;
  diff: VersionDiff;
  createdBy: string;
  createdAt: Date;
}

interface DesignState {
  design: Design;
  layers: DesignLayer[];
  canvasSettings: CanvasSettings;
}

interface VersionDiff {
  added: DesignLayer[];
  modified: Array<{
    layerId: string;
    changes: Partial<DesignLayer>;
  }>;
  removed: string[];            // Layer IDs
}

interface HistoryEntry {
  id: string;
  action: HistoryAction;
  timestamp: Date;
  userId: string;
  data: any;
}

enum HistoryAction {
  LAYER_ADDED = 'layer_added',
  LAYER_UPDATED = 'layer_updated',
  LAYER_DELETED = 'layer_deleted',
  LAYER_REORDERED = 'layer_reordered',
  DESIGN_UPDATED = 'design_updated',
  CHECKPOINT_CREATED = 'checkpoint_created'
}
```

### 2.4 Rendering and Export

#### 2.4.1 Real-time Rendering

```typescript
interface RenderingService {
  // Scene setup
  initializeScene(design: Design): Promise<Scene3D>;
  updateScene(designId: string, changes: SceneChanges): Promise<void>;

  // Rendering
  render(designId: string, settings: RenderSettings): Promise<RenderResult>;
  renderPreview(designId: string): Promise<PreviewImage>;

  // Camera controls
  setCamera(designId: string, camera: CameraSettings): Promise<void>;
  resetCamera(designId: string): Promise<void>;

  // View modes
  setViewMode(designId: string, mode: ViewMode): Promise<void>;
}

interface Scene3D {
  id: string;
  avatar: AvatarMesh;
  layers: LayerMesh[];
  lighting: Lighting;
  background: Background;
  camera: Camera;
}

interface RenderSettings {
  quality: RenderQuality;
  resolution: { width: number; height: number };
  format: 'png' | 'jpeg' | 'webp';
  transparent: boolean;
  antialiasing: boolean;
  shadows: boolean;
  ambientOcclusion: boolean;
}

interface RenderResult {
  imageUrl: string;
  renderTime: number;
  fileSize: number;
}

enum ViewMode {
  FRONT = 'front',
  BACK = 'back',
  LEFT = 'left',
  RIGHT = 'right',
  THREE_QUARTER = 'three_quarter',
  CUSTOM = 'custom'
}
```

#### 2.4.2 Export Capabilities

```typescript
interface ExportService {
  // Image export
  exportImage(designId: string, options: ImageExportOptions): Promise<ExportResult>;

  // Video export
  exportTurntable(designId: string, options: VideoExportOptions): Promise<ExportResult>;

  // 3D model export
  export3DModel(designId: string, options: ModelExportOptions): Promise<ExportResult>;

  // Technical specs
  exportTechPack(designId: string): Promise<TechPackResult>;

  // Batch export
  batchExport(designIds: string[], options: BatchExportOptions): Promise<ExportResult[]>;
}

interface ImageExportOptions {
  views: ViewMode[];
  resolution: { width: number; height: number };
  quality: RenderQuality;
  format: 'png' | 'jpeg' | 'webp';
  transparent: boolean;
  watermark?: WatermarkOptions;
}

interface VideoExportOptions {
  duration: number;              // Seconds
  fps: number;                   // Frames per second
  resolution: { width: number; height: number };
  quality: RenderQuality;
  format: 'mp4' | 'webm';
  rotationDegrees: number;       // Total rotation (default 360)
}

interface ModelExportOptions {
  format: 'gltf' | 'fbx' | 'obj';
  includeLayers: string[];       // Layer IDs to include
  embedTextures: boolean;
  optimize: boolean;
}

interface TechPackResult {
  pdfUrl: string;
  data: {
    measurements: MeasurementChart;
    materials: MaterialList;
    construction: ConstructionNotes;
    bom: BillOfMaterials;
  };
}

interface WatermarkOptions {
  text: string;
  position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center';
  opacity: number;
  fontSize: number;
}

interface ExportResult {
  id: string;
  designId: string;
  type: string;
  fileUrl: string;
  fileName: string;
  fileSize: number;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  progress: number;
  createdAt: Date;
  completedAt?: Date;
  expiresAt: Date;               // Signed URL expiration
}
```

### 2.5 Design Validation

#### 2.5.1 Design Validation Rules

```typescript
interface DesignValidation {
  // Validate design
  validateDesign(design: Design): Promise<ValidationResult>;

  // Layer validation
  validateLayer(layer: DesignLayer): Promise<LayerValidationResult>;

  // Compatibility checks
  checkCompatibility(layers: DesignLayer[]): Promise<CompatibilityResult>;

  // Fit validation
  validateFit(designId: string): Promise<FitValidationResult>;
}

interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  suggestions: ValidationSuggestion[];
}

interface ValidationError {
  code: string;
  message: string;
  severity: 'error' | 'warning' | 'info';
  layerId?: string;
  field?: string;
}

interface CompatibilityResult {
  compatible: boolean;
  issues: Array<{
    layer1Id: string;
    layer2Id: string;
    issue: string;
    suggestion: string;
  }>;
}

interface FitValidationResult {
  fits: boolean;
  issues: Array<{
    layerId: string;
    zone: string;
    issue: 'too_tight' | 'too_loose' | 'proportion_mismatch';
    severity: 'high' | 'medium' | 'low';
  }>;
}
```

### 2.6 Collaboration (Async)

#### 2.6.1 Sharing and Permissions

```typescript
interface CollaborationService {
  // Sharing
  shareDesign(designId: string, shareOptions: ShareOptions): Promise<ShareResult>;
  getShareLink(designId: string): Promise<string>;
  revokeShare(shareId: string): Promise<void>;

  // Collaborators
  addCollaborator(designId: string, userId: string, role: CollaboratorRole): Promise<void>;
  updateCollaboratorRole(designId: string, userId: string, role: CollaboratorRole): Promise<void>;
  removeCollaborator(designId: string, userId: string): Promise<void>;
  listCollaborators(designId: string): Promise<Collaborator[]>;

  // Comments
  addComment(designId: string, comment: CreateCommentDTO): Promise<Comment>;
  replyToComment(commentId: string, reply: string): Promise<Comment>;
  deleteComment(commentId: string): Promise<void>;
  listComments(designId: string): Promise<Comment[]>;

  // Activity feed
  getActivityFeed(designId: string): Promise<Activity[]>;
}

interface ShareOptions {
  visibility: DesignVisibility;
  allowDownload: boolean;
  allowFork: boolean;
  allowComments: boolean;
  expiresAt?: Date;
  password?: string;
}

interface ShareResult {
  shareId: string;
  shareUrl: string;
  qrCodeUrl: string;
  expiresAt?: Date;
}

interface Comment {
  id: string;
  designId: string;
  userId: string;
  layerId?: string;             // Optional layer reference
  position?: { x: number; y: number };  // Canvas position
  text: string;
  replies: Comment[];
  createdAt: Date;
  updatedAt: Date;
}

interface Activity {
  id: string;
  designId: string;
  userId: string;
  action: ActivityAction;
  details: any;
  timestamp: Date;
}

enum ActivityAction {
  CREATED = 'created',
  UPDATED = 'updated',
  LAYER_ADDED = 'layer_added',
  LAYER_MODIFIED = 'layer_modified',
  LAYER_DELETED = 'layer_deleted',
  COMMENTED = 'commented',
  SHARED = 'shared',
  FORKED = 'forked',
  EXPORTED = 'exported'
}
```

---

## 3. API Specification

### 3.1 Design Endpoints

#### 3.1.1 Design CRUD

```typescript
// POST /api/v1/designs
interface CreateDesignRequest {
  name: string;
  description?: string;
  avatarId: string;
  category?: DesignCategory;
  tags?: string[];
  visibility?: DesignVisibility;
}

interface CreateDesignResponse {
  design: Design;
  layers: DesignLayer[];
}

// GET /api/v1/designs
interface ListDesignsQuery {
  status?: DesignStatus;
  visibility?: DesignVisibility;
  category?: DesignCategory;
  tags?: string[];
  search?: string;
  sortBy?: 'createdAt' | 'updatedAt' | 'name' | 'views' | 'likes';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

// GET /api/v1/designs/:id
interface GetDesignResponse {
  design: Design;
  layers: DesignLayer[];
  canvasSettings: CanvasSettings;
  versions: Version[];
  collaborators: Collaborator[];
}

// PATCH /api/v1/designs/:id
interface UpdateDesignRequest {
  name?: string;
  description?: string;
  tags?: string[];
  category?: DesignCategory;
  status?: DesignStatus;
  visibility?: DesignVisibility;
  canvasSettings?: Partial<CanvasSettings>;
}

// DELETE /api/v1/designs/:id
// Supports soft delete (default) or hard delete with ?hard=true
```

#### 3.1.2 Layer Endpoints

```typescript
// POST /api/v1/designs/:designId/layers
interface CreateLayerRequest {
  type: LayerType;
  catalogItemId: string;
  order?: number;
  customization?: LayerCustomization;
  transform?: Transform3D;
}

// PATCH /api/v1/designs/:designId/layers/:layerId
interface UpdateLayerRequest {
  customization?: Partial<LayerCustomization>;
  transform?: Partial<Transform3D>;
  isVisible?: boolean;
  isLocked?: boolean;
  blendMode?: BlendMode;
  opacity?: number;
}

// POST /api/v1/designs/:designId/layers/reorder
interface ReorderLayersRequest {
  layerIds: string[];            // New order
}

// DELETE /api/v1/designs/:designId/layers/:layerId

// POST /api/v1/designs/:designId/layers/:layerId/duplicate

// POST /api/v1/designs/:designId/layers/merge
interface MergeLayersRequest {
  layerIds: string[];
  name: string;
}
```

#### 3.1.3 Rendering and Export

```typescript
// POST /api/v1/designs/:id/render
interface RenderRequest {
  settings: RenderSettings;
  views?: ViewMode[];
}

interface RenderResponse {
  images: Array<{
    view: ViewMode;
    url: string;
  }>;
}

// POST /api/v1/designs/:id/export
interface ExportRequest {
  type: 'image' | 'video' | 'model' | 'techpack';
  options: ImageExportOptions | VideoExportOptions | ModelExportOptions;
}

interface ExportResponse {
  exportId: string;
  status: 'queued' | 'processing';
  estimatedTime: number;         // Seconds
}

// GET /api/v1/exports/:exportId
interface GetExportResponse {
  export: ExportResult;
}

// POST /api/v1/designs/:id/export/batch
interface BatchExportRequest {
  exports: Array<{
    type: string;
    options: any;
  }>;
}
```

#### 3.1.4 Versioning

```typescript
// POST /api/v1/designs/:id/checkpoint
interface CreateCheckpointRequest {
  message: string;
}

// GET /api/v1/designs/:id/versions
interface ListVersionsResponse {
  versions: Version[];
}

// POST /api/v1/designs/:id/restore/:versionId

// GET /api/v1/designs/:id/history
interface GetHistoryQuery {
  limit?: number;
  offset?: number;
}
```

#### 3.1.5 Collaboration

```typescript
// POST /api/v1/designs/:id/share
interface ShareDesignRequest {
  options: ShareOptions;
}

// POST /api/v1/designs/:id/collaborators
interface AddCollaboratorRequest {
  userId: string;
  role: CollaboratorRole;
}

// POST /api/v1/designs/:id/comments
interface CreateCommentRequest {
  text: string;
  layerId?: string;
  position?: { x: number; y: number };
}

// GET /api/v1/designs/:id/activity
interface GetActivityResponse {
  activities: Activity[];
}
```

### 3.2 WebSocket Events

```typescript
// Real-time design updates (for future collaborative editing)

// Client subscribes to design updates
socket.emit('design:subscribe', { designId });

// Server emits layer updates
socket.on('design:layer:added', (event: {
  designId: string;
  layer: DesignLayer;
  userId: string;
}) => {
  // Handle layer addition
});

socket.on('design:layer:updated', (event: {
  designId: string;
  layerId: string;
  updates: Partial<DesignLayer>;
  userId: string;
}) => {
  // Handle layer update
});

socket.on('design:layer:deleted', (event: {
  designId: string;
  layerId: string;
  userId: string;
}) => {
  // Handle layer deletion
});

// Cursor position (for collaborative editing)
socket.on('design:cursor:move', (event: {
  designId: string;
  userId: string;
  position: { x: number; y: number };
}) => {
  // Show collaborator cursor
});

// Export progress
socket.on('export:progress', (event: {
  exportId: string;
  progress: number;
  stage: string;
}) => {
  // Update progress bar
});

socket.on('export:complete', (event: {
  exportId: string;
  fileUrl: string;
}) => {
  // Show download link
});
```

---

## 4. Data Models

### 4.1 PostgreSQL Schema

```sql
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

  -- Constraints
  CONSTRAINT chk_status CHECK (status IN ('draft', 'published', 'archived')),
  CONSTRAINT chk_visibility CHECK (visibility IN ('private', 'shared', 'public')),
  CONSTRAINT chk_category CHECK (category IN ('outfit', 'top', 'bottom', 'dress', 'outerwear', 'full_collection'))
);

-- Indexes
CREATE INDEX idx_designs_user_id ON design.designs(user_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_designs_status ON design.designs(status) WHERE deleted_at IS NULL;
CREATE INDEX idx_designs_visibility ON design.designs(visibility) WHERE deleted_at IS NULL;
CREATE INDEX idx_designs_tags ON design.designs USING GIN(tags);
CREATE INDEX idx_designs_created_at ON design.designs(created_at DESC);

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
  transform JSONB DEFAULT '{}'::jsonb,

  -- Customization (stored as JSONB)
  customization JSONB DEFAULT '{}'::jsonb,

  -- Visibility and locking
  is_visible BOOLEAN DEFAULT true,
  is_locked BOOLEAN DEFAULT false,

  -- Blend mode
  blend_mode VARCHAR(20) DEFAULT 'normal',
  opacity INTEGER DEFAULT 100,

  -- Notes
  notes TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  CONSTRAINT chk_layer_type CHECK (type IN ('silhouette', 'fabric', 'pattern', 'element', 'accessory')),
  CONSTRAINT chk_blend_mode CHECK (blend_mode IN ('normal', 'multiply', 'screen', 'overlay', 'add')),
  CONSTRAINT chk_opacity CHECK (opacity >= 0 AND opacity <= 100)
);

-- Indexes
CREATE INDEX idx_layers_design_id ON design.layers(design_id, order_index);
CREATE INDEX idx_layers_catalog_item ON design.layers(catalog_item_id);

-- Layer groups
CREATE TABLE design.layer_groups (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  design_id UUID NOT NULL REFERENCES design.designs(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  is_expanded BOOLEAN DEFAULT true,
  is_visible BOOLEAN DEFAULT true,
  is_locked BOOLEAN DEFAULT false,
  order_index INTEGER NOT NULL,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE design.layer_group_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  group_id UUID NOT NULL REFERENCES design.layer_groups(id) ON DELETE CASCADE,
  layer_id UUID NOT NULL REFERENCES design.layers(id) ON DELETE CASCADE,

  UNIQUE(layer_id)               -- A layer can only be in one group
);

-- Canvas settings
CREATE TABLE design.canvas_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  design_id UUID NOT NULL REFERENCES design.designs(id) ON DELETE CASCADE,

  -- Camera
  camera JSONB DEFAULT '{}'::jsonb,

  -- Lighting
  lighting JSONB DEFAULT '{}'::jsonb,

  -- Background
  background JSONB DEFAULT '{}'::jsonb,

  -- Grid and guides
  show_grid BOOLEAN DEFAULT false,
  show_guides BOOLEAN DEFAULT false,
  snap_to_grid BOOLEAN DEFAULT false,
  grid_size DECIMAL(10,2) DEFAULT 10,

  -- Rendering
  render_quality VARCHAR(20) DEFAULT 'standard',
  antialiasing BOOLEAN DEFAULT true,
  shadows BOOLEAN DEFAULT true,
  ambient_occlusion BOOLEAN DEFAULT false,

  -- Timestamps
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(design_id)
);

-- Versions/Checkpoints
CREATE TABLE design.versions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  design_id UUID NOT NULL REFERENCES design.designs(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  message TEXT,

  -- Snapshot (stored in MongoDB)
  snapshot_ref VARCHAR(255),     -- Reference to MongoDB document

  -- Diff data
  diff JSONB,

  -- Created by
  created_by UUID REFERENCES shared.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(design_id, version_number)
);

CREATE INDEX idx_versions_design_id ON design.versions(design_id, version_number DESC);

-- History/Activity log
CREATE TABLE design.history (
  id BIGSERIAL PRIMARY KEY,
  design_id UUID NOT NULL REFERENCES design.designs(id) ON DELETE CASCADE,
  user_id UUID REFERENCES shared.users(id),
  action VARCHAR(50) NOT NULL,
  data JSONB,

  created_at TIMESTAMPTZ DEFAULT NOW()
) PARTITION BY RANGE (created_at);

-- Create partitions
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

CREATE INDEX idx_collaborators_design ON design.collaborators(design_id);
CREATE INDEX idx_collaborators_user ON design.collaborators(user_id);

-- Comments
CREATE TABLE design.comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  design_id UUID NOT NULL REFERENCES design.designs(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES shared.users(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES design.comments(id) ON DELETE CASCADE,  -- For replies
  layer_id UUID REFERENCES design.layers(id) ON DELETE SET NULL,

  text TEXT NOT NULL,
  position JSONB,                -- Canvas position { x, y }

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_comments_design ON design.comments(design_id, created_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX idx_comments_parent ON design.comments(parent_id) WHERE deleted_at IS NULL;

-- Exports
CREATE TABLE design.exports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  design_id UUID NOT NULL REFERENCES design.designs(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES shared.users(id),

  -- Export details
  type VARCHAR(50) NOT NULL,
  format VARCHAR(20),
  options JSONB,

  -- Status
  status VARCHAR(20) DEFAULT 'queued',
  progress INTEGER DEFAULT 0,

  -- Results
  file_url TEXT,
  file_name VARCHAR(255),
  file_size BIGINT,

  -- Error handling
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,

  -- Constraints
  CONSTRAINT chk_export_status CHECK (status IN ('queued', 'processing', 'completed', 'failed')),
  CONSTRAINT chk_export_type CHECK (type IN ('image', 'video', 'model', 'techpack')),
  CONSTRAINT chk_progress CHECK (progress >= 0 AND progress <= 100)
);

CREATE INDEX idx_exports_design ON design.exports(design_id, created_at DESC);
CREATE INDEX idx_exports_user ON design.exports(user_id, created_at DESC);
CREATE INDEX idx_exports_status ON design.exports(status) WHERE status IN ('queued', 'processing');

-- Sharing
CREATE TABLE design.shares (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  design_id UUID NOT NULL REFERENCES design.designs(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES shared.users(id),

  -- Share token for private sharing
  share_token VARCHAR(255) UNIQUE,

  -- Permissions
  allow_download BOOLEAN DEFAULT false,
  allow_fork BOOLEAN DEFAULT false,
  allow_comments BOOLEAN DEFAULT true,

  -- Security
  password_hash VARCHAR(255),
  expires_at TIMESTAMPTZ,

  -- Analytics
  view_count INTEGER DEFAULT 0,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_accessed_at TIMESTAMPTZ
);

CREATE INDEX idx_shares_design ON design.shares(design_id);
CREATE INDEX idx_shares_token ON design.shares(share_token);

-- User likes/favorites
CREATE TABLE design.user_likes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES shared.users(id) ON DELETE CASCADE,
  design_id UUID NOT NULL REFERENCES design.designs(id) ON DELETE CASCADE,

  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(user_id, design_id)
);

CREATE INDEX idx_user_likes_user ON design.user_likes(user_id);
CREATE INDEX idx_user_likes_design ON design.user_likes(design_id);
```

### 4.2 MongoDB Collections

```javascript
// design_snapshots collection (full design state snapshots)
{
  _id: ObjectId,
  designId: UUID,
  versionId: UUID,               // Reference to PostgreSQL version

  // Complete design state
  snapshot: {
    design: Object,              // Design metadata
    layers: Array,               // All layers with full data
    canvasSettings: Object,      // Canvas configuration
    renderState: Object          // 3D scene state
  },

  // Timestamps
  createdAt: Date
}

// Create indexes
db.design_snapshots.createIndex({ designId: 1, versionId: 1 }, { unique: true });
db.design_snapshots.createIndex({ createdAt: -1 });

// design_autosaves collection (frequent auto-saves)
{
  _id: ObjectId,
  designId: UUID,
  userId: UUID,

  // Design state
  state: {
    design: Object,
    layers: Array,
    canvasSettings: Object
  },

  // Auto-save metadata
  autosaveNumber: Number,

  // Timestamps
  createdAt: Date
}

// Create TTL index (keep auto-saves for 7 days)
db.design_autosaves.createIndex({ createdAt: 1 }, { expireAfterSeconds: 604800 });
db.design_autosaves.createIndex({ designId: 1, createdAt: -1 });

// render_cache collection (cached renders)
{
  _id: ObjectId,
  designId: UUID,
  renderHash: String,            // Hash of render settings + design state

  // Render result
  imageUrl: String,
  renderSettings: Object,

  // Cache metadata
  hitCount: Number,
  lastAccessed: Date,

  // Timestamps
  createdAt: Date
}

// Create TTL index (keep cached renders for 30 days)
db.render_cache.createIndex({ createdAt: 1 }, { expireAfterSeconds: 2592000 });
db.render_cache.createIndex({ renderHash: 1 }, { unique: true });
db.render_cache.createIndex({ designId: 1 });
```

---

## 5. Business Logic

### 5.1 Design Creation Flow

```typescript
class DesignService {
  async createDesign(
    userId: string,
    request: CreateDesignRequest
  ): Promise<Design> {

    // 1. Validate avatar exists and belongs to user
    const avatar = await this.avatarService.getAvatar(request.avatarId);
    if (avatar.userId !== userId) {
      throw new UnauthorizedError('Avatar does not belong to user');
    }

    // 2. Create design record
    const design = await this.designRepository.create({
      userId,
      name: request.name,
      description: request.description,
      avatarId: request.avatarId,
      category: request.category || DesignCategory.OUTFIT,
      tags: request.tags || [],
      visibility: request.visibility || DesignVisibility.PRIVATE,
      status: DesignStatus.DRAFT
    });

    // 3. Initialize canvas settings with defaults
    await this.canvasSettingsRepository.create({
      designId: design.id,
      camera: this.getDefaultCamera(),
      lighting: this.getDefaultLighting(),
      background: this.getDefaultBackground(),
      renderQuality: RenderQuality.STANDARD
    });

    // 4. Create initial version
    await this.versionService.createInitialVersion(design.id);

    // 5. Initialize 3D scene
    await this.renderingService.initializeScene(design);

    return design;
  }
}
```

### 5.2 Layer Management

```typescript
class LayerService {
  async addLayer(
    designId: string,
    userId: string,
    request: CreateLayerRequest
  ): Promise<DesignLayer> {

    // 1. Verify user has edit access
    await this.authorizationService.requireEditAccess(designId, userId);

    // 2. Validate catalog item exists
    const catalogItem = await this.catalogService.getItem(request.catalogItemId);

    // 3. Determine layer order
    const order = request.order ?? await this.getNextLayerOrder(designId);

    // 4. Create layer
    const layer = await this.layerRepository.create({
      designId,
      type: request.type,
      catalogItemId: request.catalogItemId,
      catalogItemType: catalogItem.type,
      order,
      customization: request.customization || {},
      transform: request.transform || this.getDefaultTransform(),
      isVisible: true,
      isLocked: false,
      blendMode: BlendMode.NORMAL,
      opacity: 100
    });

    // 5. Update 3D scene
    await this.renderingService.addLayerToScene(designId, layer);

    // 6. Record in history
    await this.historyService.recordAction(designId, userId, {
      action: HistoryAction.LAYER_ADDED,
      data: { layerId: layer.id, catalogItemId: request.catalogItemId }
    });

    // 7. Auto-save
    await this.autoSaveService.save(designId);

    // 8. Broadcast to collaborators (WebSocket)
    this.notificationService.broadcastLayerAdded(designId, layer, userId);

    return layer;
  }

  async updateLayer(
    layerId: string,
    userId: string,
    updates: UpdateLayerRequest
  ): Promise<DesignLayer> {

    // 1. Get layer and verify access
    const layer = await this.layerRepository.findById(layerId);
    await this.authorizationService.requireEditAccess(layer.designId, userId);

    // 2. Apply updates
    const updated = await this.layerRepository.update(layerId, updates);

    // 3. Update 3D scene
    await this.renderingService.updateLayerInScene(layer.designId, updated);

    // 4. Record in history
    await this.historyService.recordAction(layer.designId, userId, {
      action: HistoryAction.LAYER_UPDATED,
      data: { layerId, updates }
    });

    // 5. Auto-save
    await this.autoSaveService.save(layer.designId);

    // 6. Broadcast update
    this.notificationService.broadcastLayerUpdated(layer.designId, updated, userId);

    return updated;
  }
}
```

### 5.3 Auto-Save System

```typescript
class AutoSaveService {
  private saveTimers: Map<string, NodeJS.Timeout> = new Map();
  private readonly SAVE_DELAY_MS = 30000;  // 30 seconds

  async scheduleSave(designId: string): Promise<void> {
    // Clear existing timer
    const existingTimer = this.saveTimers.get(designId);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    // Schedule new save
    const timer = setTimeout(async () => {
      await this.save(designId);
      this.saveTimers.delete(designId);
    }, this.SAVE_DELAY_MS);

    this.saveTimers.set(designId, timer);
  }

  async save(designId: string): Promise<void> {
    try {
      // 1. Get current design state
      const state = await this.getDesignState(designId);

      // 2. Save to MongoDB
      await this.mongoService.collection('design_autosaves').insertOne({
        designId,
        userId: state.design.userId,
        state,
        autosaveNumber: await this.getNextAutosaveNumber(designId),
        createdAt: new Date()
      });

      // 3. Update last_edited_at timestamp
      await this.designRepository.touch(designId);

    } catch (error) {
      logger.error('Auto-save failed', { designId, error });
      // Don't throw - auto-save failures should not interrupt user
    }
  }

  async restoreLatest(designId: string): Promise<DesignState | null> {
    const latest = await this.mongoService
      .collection('design_autosaves')
      .findOne(
        { designId },
        { sort: { createdAt: -1 } }
      );

    return latest?.state || null;
  }
}
```

### 5.4 Rendering Pipeline

```typescript
class RenderingService {
  async render(
    designId: string,
    settings: RenderSettings
  ): Promise<RenderResult> {

    // 1. Check cache
    const cacheKey = this.generateCacheKey(designId, settings);
    const cached = await this.getCachedRender(cacheKey);
    if (cached) {
      return cached;
    }

    // 2. Get design state
    const state = await this.getDesignState(designId);

    // 3. Queue render job
    const job = await this.renderQueue.add('render-design', {
      designId,
      state,
      settings
    }, {
      priority: this.getPriority(settings.quality),
      timeout: this.getTimeout(settings.quality)
    });

    // 4. Wait for completion (or return job ID for async)
    const result = await job.finished();

    // 5. Cache result
    await this.cacheRender(cacheKey, result);

    return result;
  }

  async renderFrame(
    state: DesignState,
    settings: RenderSettings
  ): Promise<Buffer> {
    // This runs in worker process

    // 1. Initialize Three.js renderer
    const renderer = this.initializeRenderer(settings);

    // 2. Build scene
    const scene = await this.buildScene(state);

    // 3. Setup camera
    const camera = this.setupCamera(state.canvasSettings.camera);

    // 4. Setup lighting
    this.setupLighting(scene, state.canvasSettings.lighting);

    // 5. Render
    renderer.render(scene, camera);

    // 6. Get image buffer
    const buffer = renderer.domElement.toBuffer('image/png');

    // 7. Cleanup
    renderer.dispose();
    scene.dispose();

    return buffer;
  }
}
```

### 5.5 Export Pipeline

```typescript
class ExportService {
  async exportTurntable(
    designId: string,
    options: VideoExportOptions
  ): Promise<ExportResult> {

    // 1. Create export record
    const exportRecord = await this.exportRepository.create({
      designId,
      type: 'video',
      format: options.format,
      options,
      status: 'queued',
      userId: this.currentUserId
    });

    // 2. Queue export job
    await this.exportQueue.add('export-turntable', {
      exportId: exportRecord.id,
      designId,
      options
    }, {
      priority: 3,
      timeout: 600000  // 10 minutes
    });

    return exportRecord;
  }

  async processTurntableExport(
    exportId: string,
    designId: string,
    options: VideoExportOptions
  ): Promise<void> {
    // This runs in worker process

    try {
      // 1. Update status
      await this.updateExportStatus(exportId, 'processing', 0);

      // 2. Get design state
      const state = await this.getDesignState(designId);

      // 3. Calculate frames
      const frameCount = options.duration * options.fps;
      const degreesPerFrame = options.rotationDegrees / frameCount;

      // 4. Render frames
      const frames: Buffer[] = [];
      for (let i = 0; i < frameCount; i++) {
        // Rotate camera
        const angle = i * degreesPerFrame;
        const rotatedState = this.rotateCamera(state, angle);

        // Render frame
        const frame = await this.renderingService.renderFrame(
          rotatedState,
          {
            ...options,
            resolution: options.resolution,
            quality: options.quality
          }
        );

        frames.push(frame);

        // Update progress
        const progress = Math.round((i / frameCount) * 90);  // Reserve 10% for encoding
        await this.updateExportStatus(exportId, 'processing', progress);
      }

      // 5. Encode video using FFmpeg
      await this.updateExportStatus(exportId, 'processing', 90);
      const videoBuffer = await this.encodeVideo(frames, options);

      // 6. Upload to S3
      await this.updateExportStatus(exportId, 'processing', 95);
      const fileUrl = await this.uploadExport(exportId, videoBuffer, options.format);

      // 7. Update export record
      await this.exportRepository.update(exportId, {
        status: 'completed',
        progress: 100,
        fileUrl,
        fileName: `design-${designId}-turntable.${options.format}`,
        fileSize: videoBuffer.length,
        completedAt: new Date(),
        expiresAt: this.getExpirationDate()
      });

      // 8. Notify user
      this.notificationService.notifyExportComplete(exportId, fileUrl);

    } catch (error) {
      await this.handleExportError(exportId, error);
    }
  }

  private async encodeVideo(
    frames: Buffer[],
    options: VideoExportOptions
  ): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const ffmpeg = spawn('ffmpeg', [
        '-f', 'image2pipe',
        '-framerate', options.fps.toString(),
        '-i', '-',
        '-c:v', 'libx264',
        '-pix_fmt', 'yuv420p',
        '-preset', 'medium',
        '-crf', '23',
        '-f', options.format,
        'pipe:1'
      ]);

      const chunks: Buffer[] = [];

      ffmpeg.stdout.on('data', (chunk) => chunks.push(chunk));
      ffmpeg.stderr.on('data', (data) => logger.debug('FFmpeg:', data.toString()));

      ffmpeg.on('close', (code) => {
        if (code === 0) {
          resolve(Buffer.concat(chunks));
        } else {
          reject(new Error(`FFmpeg exited with code ${code}`));
        }
      });

      // Write frames to FFmpeg stdin
      for (const frame of frames) {
        ffmpeg.stdin.write(frame);
      }
      ffmpeg.stdin.end();
    });
  }
}
```

---

## 6. Testing Requirements

### 6.1 Unit Tests

```typescript
describe('DesignService', () => {
  it('should create design with avatar', async () => {
    // Test design creation
  });

  it('should validate user owns avatar', async () => {
    // Test authorization
  });
});

describe('LayerService', () => {
  it('should add layer to design', async () => {
    // Test layer addition
  });

  it('should maintain layer order', async () => {
    // Test ordering
  });

  it('should validate layer compatibility', async () => {
    // Test compatibility
  });
});

describe('AutoSaveService', () => {
  it('should schedule auto-save after delay', async () => {
    // Test scheduling
  });

  it('should restore latest auto-save', async () => {
    // Test restoration
  });
});

describe('ExportService', () => {
  it('should generate turntable video', async () => {
    // Test video export
  });

  it('should handle export failures gracefully', async () => {
    // Test error handling
  });
});
```

### 6.2 Integration Tests

```typescript
describe('Design Workflow (Integration)', () => {
  it('should create design and add layers', async () => {
    // End-to-end design creation
  });

  it('should export design as images', async () => {
    // Test export workflow
  });

  it('should handle version control', async () => {
    // Test versioning
  });
});
```

### 6.3 Performance Tests

```yaml
Performance Benchmarks:
  3D Rendering:
    - Real-time preview: 60 FPS
    - High-quality render: < 5 seconds
    - Turntable video (10s): < 60 seconds

  API Response Times:
    - Create design: < 500ms
    - Add layer: < 200ms
    - Update layer: < 200ms
    - Get design: < 100ms

  Auto-save:
    - Save operation: < 1 second
    - Does not block user actions
```

---

## 7. Success Criteria

```yaml
Feature Completion:
  ✓ Design creation and management
  ✓ Layer system with full customization
  ✓ Real-time 3D rendering
  ✓ Version control and history
  ✓ Export capabilities (image, video, model, tech pack)
  ✓ Auto-save functionality
  ✓ Collaboration features

Performance:
  ✓ 60 FPS rendering in real-time preview
  ✓ Layer updates reflect immediately
  ✓ Export completion < 60 seconds
  ✓ Auto-save < 1 second

Quality:
  ✓ Design render quality meets standards
  ✓ No data loss with auto-save
  ✓ Version control works reliably
  ✓ Test coverage > 80%

User Experience:
  ✓ Intuitive layer management
  ✓ Responsive canvas controls
  ✓ Clear export options
  ✓ Helpful validation messages
```

---

## Document Metadata

**Version**: 1.0
**Author**: Fashion Wallet Feature Team
**Status**: Draft
**Dependencies**:
  - spec-feature-01 (Avatar Service)
  - spec-feature-02 (Catalog Service)
  - spec-infra-00 (Database)
  - spec-infra-01 (Storage)
  - spec-infra-03 (Queue)

---

**End of Design Service Feature Specification**

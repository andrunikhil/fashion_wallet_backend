# Feature Specification: Catalog Service

## Document Overview

**Version**: 1.0
**Last Updated**: November 2025
**Document Type**: Feature Specification
**Status**: Draft
**Spec ID**: spec-feature-02

---

## 1. Executive Summary

The Catalog Service provides a comprehensive, searchable repository of fashion items and design elements including silhouettes, fabrics, patterns, and decorative elements. This service enables users to browse, search, and select items for their outfit designs.

### 1.1 Goals

- Provide searchable catalog of 10,000+ fashion items
- Enable fast search and filtering (< 200ms response time)
- Support multiple catalog item types with flexible schemas
- Enable admin catalog management and bulk operations
- Support brand partnerships and exclusive collections

### 1.2 Non-Goals (Out of Scope)

- E-commerce transactions (future phase)
- Real-time collaborative catalog editing
- User-generated catalog items (initial phase)
- Physical inventory management
- Pricing and payment integration

---

## 2. Feature Requirements

### 2.1 Catalog Item Types

#### 2.1.1 Silhouettes

```typescript
interface Silhouette {
  id: string;
  name: string;
  description: string;

  // Categorization
  category: SilhouetteCategory;
  subcategory: string;
  occasion: OccasionType[];
  season: SeasonType[];

  // 3D Model
  modelUrl: string;              // GLTF format
  thumbnailUrl: string;
  previewImages: PreviewImage[];

  // Sizes and fit
  sizes: SizeVariant[];
  fitType: FitType;
  sizeChart: SizeChartReference;

  // Technical specs
  uvMapping: UVMappingInfo;
  polyCount: number;
  lodLevels: LODInfo[];

  // Compatibility
  compatibleWith: string[];      // Compatible garment IDs
  incompatibleWith: string[];
  layerPosition: number;         // For layering logic

  // Metadata
  tags: string[];
  designerName?: string;
  brandPartner?: string;
  isExclusive: boolean;
  releaseDate: Date;

  // Availability
  isActive: boolean;
  isFeatured: boolean;
  popularityScore: number;

  // Analytics
  viewCount: number;
  useCount: number;
  favoriteCount: number;
}

enum SilhouetteCategory {
  TOPS = 'tops',
  BOTTOMS = 'bottoms',
  DRESSES = 'dresses',
  OUTERWEAR = 'outerwear',
  ACTIVEWEAR = 'activewear',
  TRADITIONAL = 'traditional',
  ACCESSORIES = 'accessories'
}

enum FitType {
  SLIM = 'slim',
  REGULAR = 'regular',
  LOOSE = 'loose',
  OVERSIZED = 'oversized',
  TAILORED = 'tailored'
}

enum OccasionType {
  CASUAL = 'casual',
  FORMAL = 'formal',
  BUSINESS = 'business',
  PARTY = 'party',
  SPORTS = 'sports',
  WEDDING = 'wedding',
  FESTIVE = 'festive'
}

enum SeasonType {
  SPRING = 'spring',
  SUMMER = 'summer',
  FALL = 'fall',
  WINTER = 'winter',
  ALL_SEASON = 'all_season'
}
```

#### 2.1.2 Fabrics

```typescript
interface Fabric {
  id: string;
  name: string;
  description: string;

  // Categorization
  type: FabricType;
  category: FabricCategory;

  // Textures (PBR materials)
  diffuseMapUrl: string;         // Base color
  normalMapUrl?: string;         // Surface detail
  roughnessMapUrl?: string;      // Roughness
  metallicMapUrl?: string;       // Metallic
  aoMapUrl?: string;             // Ambient occlusion

  // Material properties
  properties: {
    shine: number;               // 0-100
    stretch: number;             // 0-100
    drape: DrapeType;
    transparency: number;        // 0-100
    reflectivity: number;        // 0-100
  };

  // Physical properties
  physicalProperties: {
    gsm?: number;                // Weight
    breathability: number;       // 0-100
    durability: number;          // 0-100
    wrinkleResistance: number;   // 0-100
  };

  // Color variants
  colors: ColorVariant[];
  isColorCustomizable: boolean;

  // Metadata
  tags: string[];
  season: SeasonType[];
  occasion: OccasionType[];

  // Sustainability
  sustainabilityCertifications: string[];
  ecoScore?: number;

  // Availability
  isActive: boolean;
  isFeatured: boolean;
  popularityScore: number;
}

enum FabricType {
  SOLID = 'solid',
  TEXTURE = 'texture',
  KNIT = 'knit',
  TECHNICAL = 'technical',
  SPECIALTY = 'specialty'
}

enum FabricCategory {
  NATURAL = 'natural',           // Cotton, silk, wool, linen
  SYNTHETIC = 'synthetic',       // Polyester, nylon, rayon
  BLEND = 'blend',              // Mixed materials
  TECHNICAL = 'technical'        // Performance fabrics
}

enum DrapeType {
  STIFF = 'stiff',
  MEDIUM = 'medium',
  FLUID = 'fluid',
  STRUCTURED = 'structured'
}

interface ColorVariant {
  id: string;
  name: string;
  hexCode: string;
  pantoneCode?: string;
  thumbnailUrl: string;
  isDefault: boolean;
}
```

#### 2.1.3 Patterns

```typescript
interface Pattern {
  id: string;
  name: string;
  description: string;

  // Categorization
  type: PatternType;
  category: string;

  // Texture file
  textureUrl: string;
  thumbnailUrl: string;

  // Pattern properties
  properties: {
    isTileable: boolean;
    repeatWidth: number;         // Pattern repeat width
    repeatHeight: number;        // Pattern repeat height
    scaleRange: {
      min: number;
      max: number;
      default: number;
    };
  };

  // Color customization
  colors: PatternColor[];
  isColorCustomizable: boolean;
  colorChannels: number;         // Number of customizable colors

  // Application
  applicableToCategories: SilhouetteCategory[];
  bestSuitedFor: string[];

  // Metadata
  tags: string[];
  season: SeasonType[];
  occasion: OccasionType[];
  style: StyleType[];

  // Availability
  isActive: boolean;
  isFeatured: boolean;
  popularityScore: number;
}

enum PatternType {
  PRINT = 'print',               // Floral, geometric, etc.
  STRIPE = 'stripe',             // Various stripe patterns
  CHECK = 'check',               // Plaids, gingham, etc.
  DOT = 'dot',                   // Polka dots, etc.
  ABSTRACT = 'abstract',         // Abstract patterns
  TRADITIONAL = 'traditional',   // Cultural patterns
  ANIMAL = 'animal',             // Animal prints
  CUSTOM = 'custom'              // User uploaded
}

interface PatternColor {
  channel: number;               // 1, 2, 3...
  name: string;
  defaultHex: string;
  role: 'primary' | 'secondary' | 'accent';
}
```

#### 2.1.4 Design Elements

```typescript
interface DesignElement {
  id: string;
  name: string;
  description: string;

  // Categorization
  category: ElementCategory;
  type: string;                  // Specific type within category

  // 3D Model
  modelUrl: string;              // GLTF format
  thumbnailUrl: string;
  previewImages: PreviewImage[];

  // Variants
  variants: ElementVariant[];

  // Placement
  placementRules: {
    applicableTo: SilhouetteCategory[];
    defaultPosition: PlacementPosition;
    allowedPositions: PlacementPosition[];
    maxCount: number;            // Max instances per garment
    snapToPoints: string[];      // Predefined snap points
  };

  // Material/Color
  materials: string[];           // Available materials
  isColorCustomizable: boolean;
  defaultColor: string;

  // Size
  sizeRange: {
    min: number;
    max: number;
    default: number;
  };

  // Metadata
  tags: string[];
  style: StyleType[];

  // Availability
  isActive: boolean;
  isFeatured: boolean;
  popularityScore: number;
}

enum ElementCategory {
  TRIM = 'trim',                 // Buttons, zippers, etc.
  DECORATIVE = 'decorative',     // Embroidery, patches, etc.
  STRUCTURAL = 'structural',     // Pockets, collars, etc.
  HARDWARE = 'hardware'          // Buckles, grommets, etc.
}

interface ElementVariant {
  id: string;
  name: string;
  modelUrl: string;
  thumbnailUrl: string;
  properties: Record<string, any>;
}

interface PlacementPosition {
  zone: string;                  // 'chest', 'sleeve', 'hem', etc.
  coordinates?: { x: number; y: number; z: number };
  rotation?: { x: number; y: number; z: number };
}
```

### 2.2 Search and Discovery

#### 2.2.1 Search Functionality

```typescript
interface SearchRequest {
  // Text search
  query?: string;
  searchFields?: string[];       // Fields to search

  // Filters
  filters: {
    category?: string[];
    type?: string[];
    tags?: string[];
    occasion?: OccasionType[];
    season?: SeasonType[];
    style?: StyleType[];
    colors?: string[];           // Hex codes or color names
    fitType?: FitType[];
    brand?: string[];
    priceRange?: { min: number; max: number };
  };

  // Sorting
  sortBy?: SortField;
  sortOrder?: 'asc' | 'desc';

  // Pagination
  page?: number;
  limit?: number;

  // Advanced
  includeInactive?: boolean;
  onlyFeatured?: boolean;
  onlyExclusive?: boolean;
}

enum SortField {
  RELEVANCE = 'relevance',
  POPULARITY = 'popularity',
  NEWEST = 'newest',
  NAME = 'name',
  VIEWS = 'views',
  USES = 'uses',
  FAVORITES = 'favorites'
}

interface SearchResponse {
  items: CatalogItem[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
  facets: SearchFacets;
  suggestions: string[];
}

interface SearchFacets {
  categories: FacetCount[];
  colors: FacetCount[];
  occasions: FacetCount[];
  seasons: FacetCount[];
  styles: FacetCount[];
  brands: FacetCount[];
}

interface FacetCount {
  value: string;
  count: number;
}
```

#### 2.2.2 Visual Search

```typescript
interface VisualSearchRequest {
  imageUrl?: string;
  imageData?: Buffer;
  searchType: 'similar' | 'color' | 'pattern';
  filters?: Partial<SearchRequest['filters']>;
  limit?: number;
}

interface VisualSearchResponse {
  items: Array<{
    item: CatalogItem;
    similarity: number;          // 0-100
    matchReason: string;
  }>;
}
```

#### 2.2.3 Recommendations

```typescript
interface RecommendationRequest {
  userId: string;
  context?: {
    currentDesignId?: string;
    selectedItems?: string[];
    preferences?: UserPreferences;
  };
  type: RecommendationType;
  limit?: number;
}

enum RecommendationType {
  TRENDING = 'trending',
  PERSONALIZED = 'personalized',
  SIMILAR = 'similar',
  COMPLEMENTARY = 'complementary',
  NEW_ARRIVALS = 'new_arrivals',
  POPULAR = 'popular'
}

interface RecommendationResponse {
  items: Array<{
    item: CatalogItem;
    score: number;
    reason: string;
  }>;
}
```

### 2.3 Collections and Curation

#### 2.3.1 Curated Collections

```typescript
interface CuratedCollection {
  id: string;
  name: string;
  description: string;
  coverImageUrl: string;

  // Curation
  curatedBy: string;             // Curator name/ID
  curationType: CurationType;

  // Items
  items: CollectionItem[];
  itemCount: number;

  // Categorization
  tags: string[];
  season?: SeasonType;
  occasion?: OccasionType;
  style?: StyleType;

  // Visibility
  isPublic: boolean;
  isFeatured: boolean;

  // Dates
  startDate?: Date;
  endDate?: Date;
  createdAt: Date;
  updatedAt: Date;
}

enum CurationType {
  EDITORIAL = 'editorial',
  SEASONAL = 'seasonal',
  BRAND = 'brand',
  DESIGNER = 'designer',
  TRENDING = 'trending',
  OCCASION = 'occasion',
  STYLE = 'style'
}

interface CollectionItem {
  catalogItemId: string;
  order: number;
  isFeatured: boolean;
  note?: string;
}
```

### 2.4 Brand Partnerships

#### 2.4.1 Brand Catalog Items

```typescript
interface BrandPartnership {
  id: string;
  brandName: string;
  logoUrl: string;
  description: string;

  // Partnership details
  partnershipType: PartnershipType;
  startDate: Date;
  endDate?: Date;

  // Access control
  isExclusive: boolean;
  requiredTier?: SubscriptionTier;

  // Branding
  brandColors: string[];
  brandAssets: BrandAsset[];

  // Catalog
  catalogItems: string[];        // Catalog item IDs
  collections: string[];         // Collection IDs

  // Status
  isActive: boolean;
}

enum PartnershipType {
  OFFICIAL = 'official',
  COLLABORATION = 'collaboration',
  LICENSED = 'licensed',
  SPONSORED = 'sponsored'
}

interface BrandAsset {
  type: 'logo' | 'pattern' | 'element';
  url: string;
  name: string;
}
```

### 2.5 Catalog Management

#### 2.5.1 Admin Operations

```typescript
interface CatalogManagementAPI {
  // Bulk operations
  bulkCreate(items: CatalogItem[]): Promise<BulkOperationResult>;
  bulkUpdate(updates: BulkUpdate[]): Promise<BulkOperationResult>;
  bulkDelete(itemIds: string[]): Promise<BulkOperationResult>;
  bulkActivate(itemIds: string[]): Promise<BulkOperationResult>;
  bulkDeactivate(itemIds: string[]): Promise<BulkOperationResult>;

  // Import/Export
  importCatalog(file: File, format: ImportFormat): Promise<ImportResult>;
  exportCatalog(filters: SearchRequest, format: ExportFormat): Promise<ExportResult>;

  // Quality assurance
  validateItem(item: CatalogItem): Promise<ValidationResult>;
  reviewPendingItems(): Promise<PendingItem[]>;
  approveItem(itemId: string): Promise<void>;
  rejectItem(itemId: string, reason: string): Promise<void>;

  // Analytics
  getItemAnalytics(itemId: string, period: TimePeriod): Promise<ItemAnalytics>;
  getCatalogAnalytics(filters: SearchRequest, period: TimePeriod): Promise<CatalogAnalytics>;
}

enum ImportFormat {
  JSON = 'json',
  CSV = 'csv',
  EXCEL = 'excel'
}

enum ExportFormat {
  JSON = 'json',
  CSV = 'csv',
  EXCEL = 'excel',
  PDF = 'pdf'
}

interface BulkOperationResult {
  successful: number;
  failed: number;
  errors: Array<{
    itemId: string;
    error: string;
  }>;
}
```

---

## 3. API Specification

### 3.1 Catalog Item Endpoints

#### 3.1.1 Browse and Search

```typescript
// GET /api/v1/catalog/search
interface CatalogSearchQuery {
  q?: string;                    // Search query
  category?: string[];
  type?: string[];
  tags?: string[];
  occasion?: string[];
  season?: string[];
  style?: string[];
  colors?: string[];
  fitType?: string[];
  brand?: string[];
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
  featured?: boolean;
}

// GET /api/v1/catalog/silhouettes
// GET /api/v1/catalog/fabrics
// GET /api/v1/catalog/patterns
// GET /api/v1/catalog/elements
// Similar query parameters as search

// GET /api/v1/catalog/items/:id
interface GetCatalogItemResponse {
  item: CatalogItem;
  related: CatalogItem[];        // Related/similar items
  compatible: CatalogItem[];     // Compatible items
  downloadUrls: {
    model?: string;
    textures?: Record<string, string>;
  };
}
```

#### 3.1.2 Recommendations

```typescript
// GET /api/v1/catalog/recommendations
interface RecommendationsQuery {
  type: RecommendationType;
  context?: string;              // JSON stringified context
  limit?: number;
}

// GET /api/v1/catalog/trending
interface TrendingQuery {
  category?: string;
  period?: 'day' | 'week' | 'month';
  limit?: number;
}

// GET /api/v1/catalog/new-arrivals
interface NewArrivalsQuery {
  category?: string;
  days?: number;                 // Last N days
  limit?: number;
}
```

#### 3.1.3 Collections

```typescript
// GET /api/v1/catalog/collections
interface ListCollectionsQuery {
  type?: CurationType;
  featured?: boolean;
  active?: boolean;
  page?: number;
  limit?: number;
}

// GET /api/v1/catalog/collections/:id
interface GetCollectionResponse {
  collection: CuratedCollection;
  items: CatalogItem[];
}
```

#### 3.1.4 Visual Search

```typescript
// POST /api/v1/catalog/visual-search
interface VisualSearchBody {
  imageUrl?: string;
  imageData?: string;            // Base64 encoded
  searchType: 'similar' | 'color' | 'pattern';
  filters?: Partial<SearchRequest['filters']>;
  limit?: number;
}
```

### 3.2 Admin Endpoints

```typescript
// POST /api/v1/admin/catalog/items
interface CreateCatalogItemRequest {
  type: 'silhouette' | 'fabric' | 'pattern' | 'element';
  data: Partial<CatalogItem>;
  files?: {
    model?: File;
    textures?: File[];
    thumbnail?: File;
    previews?: File[];
  };
}

// PUT /api/v1/admin/catalog/items/:id
interface UpdateCatalogItemRequest {
  data: Partial<CatalogItem>;
  files?: {
    model?: File;
    textures?: File[];
    thumbnail?: File;
  };
}

// DELETE /api/v1/admin/catalog/items/:id
// Soft delete by default, ?hard=true for permanent deletion

// POST /api/v1/admin/catalog/bulk-import
interface BulkImportRequest {
  file: File;
  format: ImportFormat;
  options: {
    skipValidation?: boolean;
    updateExisting?: boolean;
  };
}

// GET /api/v1/admin/catalog/analytics
interface CatalogAnalyticsQuery {
  startDate: string;
  endDate: string;
  groupBy?: 'category' | 'type' | 'brand' | 'day' | 'week';
}
```

---

## 4. Data Models

### 4.1 PostgreSQL Schema

```sql
-- Catalog items table (metadata)
CREATE TABLE catalog.items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type VARCHAR(50) NOT NULL,     -- silhouette, fabric, pattern, element
  name VARCHAR(255) NOT NULL,
  description TEXT,

  -- Categorization
  category VARCHAR(100),
  subcategory VARCHAR(100),
  tags TEXT[],

  -- Files
  model_url TEXT,
  thumbnail_url TEXT,
  preview_images JSONB,

  -- Properties (flexible JSONB for type-specific data)
  properties JSONB DEFAULT '{}'::jsonb,

  -- Metadata
  designer_name VARCHAR(255),
  brand_partner_id UUID REFERENCES catalog.brand_partners(id),
  is_exclusive BOOLEAN DEFAULT false,
  release_date DATE,

  -- Availability
  is_active BOOLEAN DEFAULT true,
  is_featured BOOLEAN DEFAULT false,
  required_tier VARCHAR(50),

  -- Analytics
  popularity_score DECIMAL(10,2) DEFAULT 0,
  view_count INTEGER DEFAULT 0,
  use_count INTEGER DEFAULT 0,
  favorite_count INTEGER DEFAULT 0,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,

  -- Constraints
  CONSTRAINT chk_type CHECK (type IN ('silhouette', 'fabric', 'pattern', 'element'))
);

-- Indexes
CREATE INDEX idx_catalog_items_type ON catalog.items(type) WHERE deleted_at IS NULL;
CREATE INDEX idx_catalog_items_category ON catalog.items(category) WHERE deleted_at IS NULL;
CREATE INDEX idx_catalog_items_tags ON catalog.items USING GIN(tags);
CREATE INDEX idx_catalog_items_active ON catalog.items(is_active, is_featured) WHERE deleted_at IS NULL;
CREATE INDEX idx_catalog_items_popularity ON catalog.items(popularity_score DESC);
CREATE INDEX idx_catalog_items_brand ON catalog.items(brand_partner_id) WHERE deleted_at IS NULL;

-- Full-text search index
CREATE INDEX idx_catalog_items_search ON catalog.items
  USING GIN(to_tsvector('english', name || ' ' || COALESCE(description, '')));

-- Silhouette-specific table
CREATE TABLE catalog.silhouettes (
  id UUID PRIMARY KEY REFERENCES catalog.items(id) ON DELETE CASCADE,

  -- Size information
  available_sizes TEXT[],
  fit_type VARCHAR(50),
  size_chart_id UUID REFERENCES catalog.size_charts(id),

  -- Technical specs
  poly_count INTEGER,
  uv_mapping_info JSONB,
  lod_levels JSONB,

  -- Compatibility
  compatible_with UUID[],
  incompatible_with UUID[],
  layer_position INTEGER,

  -- Occasions and seasons
  occasions TEXT[],
  seasons TEXT[],

  -- Constraints
  CONSTRAINT chk_fit_type CHECK (fit_type IN ('slim', 'regular', 'loose', 'oversized', 'tailored'))
);

-- Fabric-specific table
CREATE TABLE catalog.fabrics (
  id UUID PRIMARY KEY REFERENCES catalog.items(id) ON DELETE CASCADE,

  -- Fabric type
  fabric_type VARCHAR(50),
  fabric_category VARCHAR(50),

  -- Texture maps
  diffuse_map_url TEXT,
  normal_map_url TEXT,
  roughness_map_url TEXT,
  metallic_map_url TEXT,
  ao_map_url TEXT,

  -- Material properties
  shine INTEGER CHECK (shine >= 0 AND shine <= 100),
  stretch INTEGER CHECK (stretch >= 0 AND stretch <= 100),
  drape VARCHAR(50),
  transparency INTEGER CHECK (transparency >= 0 AND transparency <= 100),

  -- Physical properties
  gsm INTEGER,
  breathability INTEGER,
  durability INTEGER,
  wrinkle_resistance INTEGER,

  -- Sustainability
  sustainability_certifications TEXT[],
  eco_score INTEGER,

  -- Color options
  color_variants JSONB,
  is_color_customizable BOOLEAN DEFAULT false,

  -- Constraints
  CONSTRAINT chk_fabric_type CHECK (fabric_type IN ('solid', 'texture', 'knit', 'technical', 'specialty')),
  CONSTRAINT chk_drape CHECK (drape IN ('stiff', 'medium', 'fluid', 'structured'))
);

-- Pattern-specific table
CREATE TABLE catalog.patterns (
  id UUID PRIMARY KEY REFERENCES catalog.items(id) ON DELETE CASCADE,

  -- Pattern type
  pattern_type VARCHAR(50),

  -- Texture
  texture_url TEXT NOT NULL,

  -- Pattern properties
  is_tileable BOOLEAN DEFAULT true,
  repeat_width DECIMAL(10,2),
  repeat_height DECIMAL(10,2),
  scale_min DECIMAL(10,2),
  scale_max DECIMAL(10,2),
  scale_default DECIMAL(10,2),

  -- Color customization
  color_channels INTEGER,
  is_color_customizable BOOLEAN DEFAULT false,
  pattern_colors JSONB,

  -- Application
  applicable_to_categories TEXT[],

  -- Style
  occasions TEXT[],
  seasons TEXT[],
  styles TEXT[],

  -- Constraints
  CONSTRAINT chk_pattern_type CHECK (pattern_type IN ('print', 'stripe', 'check', 'dot', 'abstract', 'traditional', 'animal', 'custom'))
);

-- Design element-specific table
CREATE TABLE catalog.elements (
  id UUID PRIMARY KEY REFERENCES catalog.items(id) ON DELETE CASCADE,

  -- Element category
  element_category VARCHAR(50),
  element_type VARCHAR(100),

  -- Variants
  variants JSONB,

  -- Placement rules
  placement_rules JSONB,
  applicable_to TEXT[],

  -- Material/Color
  available_materials TEXT[],
  is_color_customizable BOOLEAN DEFAULT false,
  default_color VARCHAR(7),

  -- Size
  size_min DECIMAL(10,2),
  size_max DECIMAL(10,2),
  size_default DECIMAL(10,2),

  -- Constraints
  CONSTRAINT chk_element_category CHECK (element_category IN ('trim', 'decorative', 'structural', 'hardware'))
);

-- Collections table
CREATE TABLE catalog.collections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  cover_image_url TEXT,

  -- Curation
  curated_by VARCHAR(255),
  curation_type VARCHAR(50),

  -- Categorization
  tags TEXT[],
  season VARCHAR(50),
  occasion VARCHAR(50),
  style VARCHAR(50),

  -- Visibility
  is_public BOOLEAN DEFAULT true,
  is_featured BOOLEAN DEFAULT false,

  -- Dates
  start_date DATE,
  end_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  CONSTRAINT chk_curation_type CHECK (curation_type IN ('editorial', 'seasonal', 'brand', 'designer', 'trending', 'occasion', 'style'))
);

-- Collection items (many-to-many)
CREATE TABLE catalog.collection_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  collection_id UUID NOT NULL REFERENCES catalog.collections(id) ON DELETE CASCADE,
  catalog_item_id UUID NOT NULL REFERENCES catalog.items(id) ON DELETE CASCADE,
  order_index INTEGER NOT NULL,
  is_featured BOOLEAN DEFAULT false,
  note TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(collection_id, catalog_item_id)
);

CREATE INDEX idx_collection_items_collection ON catalog.collection_items(collection_id, order_index);

-- Brand partnerships table
CREATE TABLE catalog.brand_partners (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  brand_name VARCHAR(255) NOT NULL,
  logo_url TEXT,
  description TEXT,

  -- Partnership details
  partnership_type VARCHAR(50),
  start_date DATE NOT NULL,
  end_date DATE,

  -- Access control
  is_exclusive BOOLEAN DEFAULT false,
  required_tier VARCHAR(50),

  -- Branding
  brand_colors TEXT[],
  brand_assets JSONB,

  -- Status
  is_active BOOLEAN DEFAULT true,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  CONSTRAINT chk_partnership_type CHECK (partnership_type IN ('official', 'collaboration', 'licensed', 'sponsored'))
);

-- User favorites
CREATE TABLE catalog.user_favorites (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES shared.users(id) ON DELETE CASCADE,
  catalog_item_id UUID NOT NULL REFERENCES catalog.items(id) ON DELETE CASCADE,

  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(user_id, catalog_item_id)
);

CREATE INDEX idx_user_favorites_user ON catalog.user_favorites(user_id);
CREATE INDEX idx_user_favorites_item ON catalog.user_favorites(catalog_item_id);

-- Item analytics (time-series data)
CREATE TABLE catalog.item_analytics (
  id BIGSERIAL PRIMARY KEY,
  catalog_item_id UUID NOT NULL REFERENCES catalog.items(id) ON DELETE CASCADE,

  -- Metrics
  event_type VARCHAR(50) NOT NULL,
  event_data JSONB,

  -- Context
  user_id UUID REFERENCES shared.users(id),
  session_id UUID,

  -- Timestamp
  created_at TIMESTAMPTZ DEFAULT NOW()
) PARTITION BY RANGE (created_at);

-- Create partitions (example for one month)
CREATE TABLE catalog.item_analytics_2025_11
  PARTITION OF catalog.item_analytics
  FOR VALUES FROM ('2025-11-01') TO ('2025-12-01');

CREATE INDEX idx_item_analytics_item ON catalog.item_analytics(catalog_item_id, created_at);
CREATE INDEX idx_item_analytics_event ON catalog.item_analytics(event_type, created_at);
```

### 4.2 MongoDB Collections

```javascript
// catalog_items_flexible collection (for complex nested data)
{
  _id: ObjectId,
  catalogId: UUID,               // Reference to PostgreSQL
  type: String,                  // silhouette, fabric, pattern, element

  // Type-specific data (flexible schema)
  data: {
    // For silhouettes
    meshData: BinData,
    lodModels: Array,

    // For fabrics
    textureData: Object,
    materialProperties: Object,

    // For patterns
    patternDefinition: Object,

    // For elements
    variantModels: Array,
    placementData: Object
  },

  // Search optimization
  searchTerms: [String],         // Denormalized for faster search
  colorTags: [String],           // Color names for search

  // Analytics cache
  analytics: {
    views: Number,
    uses: Number,
    favorites: Number,
    rating: Number,
    lastUpdated: Date
  },

  // Timestamps
  createdAt: Date,
  updatedAt: Date
}

// Create indexes
db.catalog_items_flexible.createIndex({ catalogId: 1 }, { unique: true });
db.catalog_items_flexible.createIndex({ type: 1, "analytics.popularity": -1 });
db.catalog_items_flexible.createIndex({ searchTerms: "text" });
db.catalog_items_flexible.createIndex({ colorTags: 1 });
```

---

## 5. Business Logic

### 5.1 Search Implementation

```typescript
class CatalogSearchService {
  async search(request: SearchRequest): Promise<SearchResponse> {
    // 1. Build Elasticsearch query
    const esQuery = this.buildElasticsearchQuery(request);

    // 2. Execute search with Elasticsearch
    const esResults = await this.elasticsearch.search({
      index: 'catalog-items',
      body: esQuery
    });

    // 3. Extract item IDs
    const itemIds = esResults.hits.hits.map(hit => hit._id);

    // 4. Fetch full items from database/cache
    const items = await this.getCatalogItems(itemIds);

    // 5. Build facets
    const facets = this.buildFacets(esResults.aggregations);

    // 6. Get search suggestions
    const suggestions = await this.getSuggestions(request.query);

    return {
      items,
      pagination: {
        total: esResults.hits.total.value,
        page: request.page || 1,
        limit: request.limit || 24,
        totalPages: Math.ceil(esResults.hits.total.value / (request.limit || 24))
      },
      facets,
      suggestions
    };
  }

  private buildElasticsearchQuery(request: SearchRequest): any {
    const must: any[] = [];
    const filter: any[] = [];

    // Text search
    if (request.query) {
      must.push({
        multi_match: {
          query: request.query,
          fields: ['name^3', 'description^2', 'tags'],
          fuzziness: 'AUTO'
        }
      });
    }

    // Category filter
    if (request.filters.category?.length) {
      filter.push({
        terms: { category: request.filters.category }
      });
    }

    // Tags filter
    if (request.filters.tags?.length) {
      filter.push({
        terms: { tags: request.filters.tags }
      });
    }

    // Color filter (hex codes)
    if (request.filters.colors?.length) {
      filter.push({
        terms: { 'properties.colors.hexCode': request.filters.colors }
      });
    }

    // Build query
    return {
      query: {
        bool: {
          must: must.length > 0 ? must : [{ match_all: {} }],
          filter: [
            ...filter,
            { term: { isActive: true } },
            { bool: { must_not: { exists: { field: 'deletedAt' } } } }
          ]
        }
      },
      sort: this.buildSort(request.sortBy, request.sortOrder),
      from: ((request.page || 1) - 1) * (request.limit || 24),
      size: request.limit || 24,
      aggs: this.buildAggregations()
    };
  }
}
```

### 5.2 Recommendation Engine

```typescript
class RecommendationService {
  async getRecommendations(
    request: RecommendationRequest
  ): Promise<RecommendationResponse> {

    switch (request.type) {
      case RecommendationType.TRENDING:
        return this.getTrending(request);

      case RecommendationType.PERSONALIZED:
        return this.getPersonalized(request);

      case RecommendationType.SIMILAR:
        return this.getSimilar(request);

      case RecommendationType.COMPLEMENTARY:
        return this.getComplementary(request);

      default:
        return this.getPopular(request);
    }
  }

  private async getPersonalized(
    request: RecommendationRequest
  ): Promise<RecommendationResponse> {
    // 1. Get user history
    const userHistory = await this.getUserHistory(request.userId);

    // 2. Extract preferences
    const preferences = this.extractPreferences(userHistory);

    // 3. Build recommendation query
    const query = this.buildPersonalizationQuery(preferences, request.context);

    // 4. Execute query
    const items = await this.catalogRepository.search(query);

    // 5. Score and rank
    const ranked = this.scoreItems(items, preferences, userHistory);

    // 6. Diversify results
    const diversified = this.diversifyResults(ranked);

    return {
      items: diversified.slice(0, request.limit || 12).map(item => ({
        item: item.catalogItem,
        score: item.score,
        reason: item.reason
      }))
    };
  }

  private extractPreferences(history: UserHistory): UserPreferences {
    // Analyze user history to extract preferences
    const categoryPreferences = this.analyzeCategoryFrequency(history);
    const colorPreferences = this.analyzeColorFrequency(history);
    const stylePreferences = this.analyzeStyleFrequency(history);

    return {
      categories: categoryPreferences,
      colors: colorPreferences,
      styles: stylePreferences,
      occasions: this.analyzeOccasionFrequency(history),
      fitTypes: this.analyzeFitTypeFrequency(history)
    };
  }
}
```

### 5.3 Popularity Scoring

```typescript
class PopularityScoreService {
  async updatePopularityScores(): Promise<void> {
    // Run as scheduled job (e.g., daily)

    // 1. Get all catalog items
    const items = await this.catalogRepository.findAll();

    for (const item of items) {
      // 2. Calculate weighted score
      const score = this.calculateScore(item);

      // 3. Update in database
      await this.catalogRepository.updatePopularityScore(item.id, score);
    }
  }

  private calculateScore(item: CatalogItem): number {
    const weights = {
      views: 0.2,
      uses: 0.4,
      favorites: 0.3,
      recency: 0.1
    };

    // Normalize metrics
    const normalizedViews = Math.log(item.viewCount + 1);
    const normalizedUses = Math.log(item.useCount + 1) * 2; // Uses weighted more
    const normalizedFavorites = Math.log(item.favoriteCount + 1) * 1.5;

    // Recency score (newer items get boost)
    const daysSinceRelease = this.getDaysSince(item.releaseDate);
    const recencyScore = Math.max(0, 100 - daysSinceRelease);

    // Calculate weighted score
    const score =
      normalizedViews * weights.views +
      normalizedUses * weights.uses +
      normalizedFavorites * weights.favorites +
      recencyScore * weights.recency;

    return Math.round(score * 100) / 100;
  }
}
```

---

## 6. Testing Requirements

### 6.1 Unit Tests

```typescript
describe('CatalogSearchService', () => {
  it('should build correct Elasticsearch query', () => {
    // Test query building
  });

  it('should handle empty search results', () => {
    // Test edge case
  });

  it('should apply filters correctly', () => {
    // Test filtering
  });
});

describe('RecommendationService', () => {
  it('should return personalized recommendations', () => {
    // Test personalization
  });

  it('should diversify results', () => {
    // Test diversity
  });
});

describe('PopularityScoreService', () => {
  it('should calculate popularity score correctly', () => {
    // Test score calculation
  });
});
```

### 6.2 Integration Tests

```typescript
describe('Catalog API (Integration)', () => {
  it('should search catalog items', async () => {
    const response = await request(app)
      .get('/api/v1/catalog/search')
      .query({ q: 't-shirt', category: 'tops' });

    expect(response.status).toBe(200);
    expect(response.body.items).toBeInstanceOf(Array);
    expect(response.body.pagination).toBeDefined();
  });

  it('should get item details', async () => {
    const response = await request(app)
      .get('/api/v1/catalog/items/123');

    expect(response.status).toBe(200);
    expect(response.body.item).toBeDefined();
  });
});
```

### 6.3 Performance Tests

```yaml
Performance Benchmarks:
  Search Response Time:
    - Simple search: < 100ms
    - Filtered search: < 200ms
    - Complex search with facets: < 300ms

  Concurrent Searches:
    - 100 concurrent: < 500ms average
    - 500 concurrent: < 1s average

  Recommendations:
    - Personalized: < 500ms
    - Similar items: < 200ms

  Data Loading:
    - Item details: < 50ms
    - Item with assets: < 100ms
```

---

## 7. Success Criteria

```yaml
Feature Completion:
  ✓ Search functionality with filters
  ✓ Visual search implementation
  ✓ Recommendation engine
  ✓ Collections and curation
  ✓ Admin catalog management
  ✓ Brand partnership support

Performance:
  ✓ Search response < 200ms (95th percentile)
  ✓ Support 10,000+ catalog items
  ✓ Handle 1000+ concurrent searches

Quality:
  ✓ Search relevance > 85%
  ✓ Recommendation accuracy > 75%
  ✓ Test coverage > 80%

Documentation:
  ✓ API documentation complete
  ✓ Admin guide available
  ✓ Content guidelines published
```

---

## Document Metadata

**Version**: 1.0
**Author**: Fashion Wallet Feature Team
**Status**: Draft
**Dependencies**:
  - spec-infra-00 (Database)
  - spec-infra-01 (Storage)
  - spec-infra-03 (Cache, Search)

---

**End of Catalog Service Feature Specification**

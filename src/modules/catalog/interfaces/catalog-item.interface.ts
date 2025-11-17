import { CatalogItemType } from '../dto/catalog-filter.dto';

export interface ICatalogItem {
  id: string;
  type: CatalogItemType;
  name: string;
  description?: string;
  category?: string;
  subcategory?: string;
  tags: string[];
  modelUrl?: string;
  thumbnailUrl?: string;
  previewImages?: Record<string, string>;
  properties: Record<string, any>;
  designerName?: string;
  brandPartnerId?: string;
  isExclusive: boolean;
  releaseDate?: Date;
  isActive: boolean;
  isFeatured: boolean;
  requiredTier?: string;
  popularityScore: number;
  viewCount: number;
  useCount: number;
  favoriteCount: number;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}

export interface ICatalogItemWithRelations extends ICatalogItem {
  brandPartner?: {
    id: string;
    name: string;
    logoUrl?: string;
  };
}

export interface ICatalogFlexibleData {
  catalogId: string;
  type: CatalogItemType;
  data: {
    meshData?: Buffer;
    lodModels?: Array<{
      level: number;
      vertices: Buffer;
      faces: Buffer;
    }>;
    textureData?: {
      diffuse?: { url: string; data?: Buffer };
      normal?: { url: string; data?: Buffer };
      roughness?: { url: string; data?: Buffer };
      metalness?: { url: string; data?: Buffer };
      ao?: { url: string; data?: Buffer };
    };
    patternDefinition?: {
      tileData: Buffer;
      colorMask: Buffer;
    };
  };
  searchTerms: string[];
  colorTags: string[];
  analytics: {
    views: number;
    uses: number;
    favorites: number;
    rating: number;
    lastUpdated: Date;
  };
  createdAt: Date;
  updatedAt: Date;
}

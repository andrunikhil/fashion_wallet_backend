import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type CatalogFlexibleDocument = CatalogFlexible & Document;

@Schema({ collection: 'catalog_items_flexible', timestamps: true })
export class CatalogFlexible {
  @Prop({ required: true, type: String, unique: true })
  catalogId: string;

  @Prop({ required: true, enum: ['silhouette', 'fabric', 'pattern', 'element'] })
  type: string;

  @Prop({ type: Object })
  data: {
    // 3D mesh data for silhouettes
    meshData?: Buffer;
    lodModels?: Array<{
      level: number;
      vertices: Buffer;
      faces: Buffer;
    }>;

    // Texture data for fabrics
    textureData?: {
      diffuse?: { url: string; data?: Buffer };
      normal?: { url: string; data?: Buffer };
      roughness?: { url: string; data?: Buffer };
      metallic?: { url: string; data?: Buffer };
      ao?: { url: string; data?: Buffer };
    };

    // Pattern definition data
    patternDefinition?: {
      tileData: Buffer;
      colorMask: Buffer;
      repeatData?: any;
    };

    // Element data
    elementData?: {
      svgData?: string;
      vectorData?: any;
      metadata?: any;
    };

    // Additional flexible data
    [key: string]: any;
  };

  @Prop({ type: [String], default: [] })
  searchTerms: string[];

  @Prop({ type: [String], default: [] })
  colorTags: string[];

  @Prop({ type: Object })
  analytics: {
    views: number;
    uses: number;
    favorites: number;
    rating: number;
    lastUpdated: Date;
  };

  @Prop({ type: Date })
  createdAt?: Date;

  @Prop({ type: Date })
  updatedAt?: Date;
}

export const CatalogFlexibleSchema = SchemaFactory.createForClass(CatalogFlexible);

// Create indexes
CatalogFlexibleSchema.index({ catalogId: 1 }, { unique: true });
CatalogFlexibleSchema.index({ type: 1, 'analytics.rating': -1 });
CatalogFlexibleSchema.index({ searchTerms: 'text' });
CatalogFlexibleSchema.index({ colorTags: 1 });
CatalogFlexibleSchema.index({ 'analytics.views': -1 });
CatalogFlexibleSchema.index({ 'analytics.uses': -1 });

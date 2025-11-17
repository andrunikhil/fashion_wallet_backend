import { Schema, Prop, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type RenderCacheDocument = RenderCache & Document;

/**
 * Render cache stored in MongoDB
 * TTL: 30 days (automatically deleted by MongoDB)
 * Stores rendered images to avoid re-rendering unchanged designs
 */
@Schema({ timestamps: true, collection: 'render_cache' })
export class RenderCache {
  @Prop({ required: true, index: true, type: String })
  designId: string;

  @Prop({ required: true, unique: true, index: true, type: String })
  renderHash: string; // Hash of design state + render settings

  @Prop({ required: true, type: String })
  imageUrl: string;

  @Prop({
    required: true,
    type: Object,
  })
  renderSettings: {
    width: number;
    height: number;
    quality: string;
    format: string;
    camera?: Record<string, any>;
    lighting?: Record<string, any>;
    background?: Record<string, any>;
  };

  @Prop({ default: 0 })
  hitCount: number;

  @Prop({ type: Date, default: Date.now })
  lastAccessed: Date;

  // Timestamps are automatically added by Mongoose
  createdAt?: Date;
  updatedAt?: Date;
}

export const RenderCacheSchema = SchemaFactory.createForClass(RenderCache);

// Indexes
// TTL index: automatically delete documents after 30 days (2592000 seconds)
RenderCacheSchema.index({ createdAt: 1 }, { expireAfterSeconds: 2592000 });
RenderCacheSchema.index({ renderHash: 1 }, { unique: true });
RenderCacheSchema.index({ designId: 1, lastAccessed: -1 });
RenderCacheSchema.index({ lastAccessed: -1 }); // For cleanup of least recently used

import { Schema, Prop, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type DesignDocument = Design & Document;

@Schema({ timestamps: true, collection: 'designs' })
export class Design {
  @Prop({ required: true, index: true, type: String })
  userId: string;

  @Prop({ required: true, minlength: 1, maxlength: 255 })
  name: string;

  @Prop({
    required: true,
    enum: ['draft', 'published', 'archived'],
    default: 'draft',
    index: true,
  })
  status: string;

  @Prop({ type: [Object], default: [] })
  layers: Array<{
    id: string;
    type: string;
    itemId?: string;
    position: { x: number; y: number; z: number };
    rotation?: number;
    scale?: { x: number; y: number };
    color?: string;
    visible: boolean;
  }>;

  @Prop({
    type: Object,
    default: {},
  })
  metadata: {
    tags?: string[];
    description?: string;
    thumbnailUrl?: string;
    canvasSize?: { width: number; height: number };
  };

  @Prop({ type: String })
  avatarId?: string;

  @Prop({ type: [String], default: [] })
  catalogItemIds: string[];

  @Prop({ default: 1 })
  version: number;

  @Prop({ type: Date })
  deletedAt?: Date;

  // Timestamps are automatically added by Mongoose
  createdAt?: Date;
  updatedAt?: Date;
}

export const DesignSchema = SchemaFactory.createForClass(Design);

// Indexes
DesignSchema.index({ userId: 1, status: 1, createdAt: -1 });
DesignSchema.index({ 'metadata.tags': 1 });
DesignSchema.index({ deletedAt: 1 }, { sparse: true });
DesignSchema.index({ name: 'text', 'metadata.description': 'text' });

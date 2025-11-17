import { Schema, Prop, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type DesignAutosaveDocument = DesignAutosave & Document;

/**
 * Auto-save snapshots stored in MongoDB
 * TTL: 7 days (automatically deleted by MongoDB)
 * Used for recovery in case of browser crash or accidental closure
 */
@Schema({ timestamps: true, collection: 'design_autosaves' })
export class DesignAutosave {
  @Prop({ required: true, index: true, type: String })
  designId: string;

  @Prop({ required: true, index: true, type: String })
  userId: string;

  @Prop({
    required: true,
    type: Object,
  })
  state: {
    design: {
      id: string;
      name: string;
      description?: string;
      avatar_id?: string;
      category?: string;
      tags?: string[];
      status: string;
      visibility: string;
    };
    layers: Array<{
      id: string;
      type: string;
      order_index: number;
      name?: string;
      catalog_item_id: string;
      catalog_item_type: string;
      transform: Record<string, any>;
      customization: Record<string, any>;
      is_visible: boolean;
      is_locked: boolean;
      blend_mode: string;
      opacity: number;
    }>;
    canvasSettings: Record<string, any>;
  };

  @Prop({ required: true, default: 1 })
  autosaveNumber: number;

  // Timestamps are automatically added by Mongoose
  createdAt?: Date;
  updatedAt?: Date;
}

export const DesignAutosaveSchema = SchemaFactory.createForClass(DesignAutosave);

// Indexes
// TTL index: automatically delete documents after 7 days (604800 seconds)
DesignAutosaveSchema.index({ createdAt: 1 }, { expireAfterSeconds: 604800 });
DesignAutosaveSchema.index({ designId: 1, createdAt: -1 });
DesignAutosaveSchema.index({ userId: 1, createdAt: -1 });

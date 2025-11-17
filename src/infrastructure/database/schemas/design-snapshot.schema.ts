import { Schema, Prop, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type DesignSnapshotDocument = DesignSnapshot & Document;

/**
 * Design snapshots stored in MongoDB for version control
 * Used for checkpoint creation and version restoration
 */
@Schema({ timestamps: true, collection: 'design_snapshots' })
export class DesignSnapshot {
  @Prop({ required: true, index: true, type: String })
  designId: string;

  @Prop({ required: true, index: true, type: String })
  versionId: string;

  @Prop({
    required: true,
    type: Object,
  })
  snapshot: {
    design: {
      id: string;
      name: string;
      description?: string;
      avatar_id?: string;
      category?: string;
      tags?: string[];
      occasion?: string[];
      season?: string[];
      status: string;
      visibility: string;
      version: number;
    };
    layers: Array<{
      id: string;
      type: string;
      order_index: number;
      name?: string;
      catalog_item_id: string;
      catalog_item_type: string;
      transform: {
        position: { x: number; y: number; z: number };
        rotation: { x: number; y: number; z: number };
        scale: { x: number; y: number; z: number };
      };
      customization: Record<string, any>;
      is_visible: boolean;
      is_locked: boolean;
      blend_mode: string;
      opacity: number;
    }>;
    canvasSettings: {
      camera: {
        position: { x: number; y: number; z: number };
        target: { x: number; y: number; z: number };
        fov: number;
      };
      lighting: {
        preset: string;
      };
      background: {
        type: string;
        value: string;
      };
      show_grid: boolean;
      show_guides: boolean;
      snap_to_grid: boolean;
      grid_size: number;
      render_quality: string;
      antialiasing: boolean;
      shadows: boolean;
      ambient_occlusion: boolean;
    };
    renderState?: {
      cameraPosition: { x: number; y: number; z: number };
      lighting: Record<string, any>;
      background: Record<string, any>;
    };
  };

  // Timestamps are automatically added by Mongoose
  createdAt?: Date;
  updatedAt?: Date;
}

export const DesignSnapshotSchema = SchemaFactory.createForClass(DesignSnapshot);

// Indexes
DesignSnapshotSchema.index({ designId: 1, versionId: 1 }, { unique: true });
DesignSnapshotSchema.index({ createdAt: -1 });
DesignSnapshotSchema.index({ designId: 1, createdAt: -1 });

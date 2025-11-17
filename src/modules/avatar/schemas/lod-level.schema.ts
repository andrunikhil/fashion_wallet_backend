import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

/**
 * Level of Detail (LOD) for 3D models
 * Allows for efficient rendering at different quality levels
 */
@Schema({ _id: false })
export class LODLevel {
  @Prop({ required: true })
  level: number; // 0 = highest quality, higher numbers = lower quality

  @Prop({ required: true })
  distance: number; // Distance from camera at which this LOD should be used (in meters)

  @Prop({ required: true })
  faceCount: number; // Number of triangular faces in this LOD

  @Prop({ required: true })
  vertexCount: number; // Number of vertices in this LOD

  @Prop({ type: Buffer, required: true })
  vertices: Buffer; // Packed vertex data (Float32Array serialized)

  @Prop({ type: Buffer, required: true })
  faces: Buffer; // Packed face/index data (Uint32Array serialized)

  @Prop({ type: Buffer })
  normals?: Buffer; // Packed normal data (Float32Array serialized)

  @Prop({ type: Buffer })
  uvs?: Buffer; // Packed UV coordinate data (Float32Array serialized)

  @Prop()
  fileSizeBytes?: number; // Size of this LOD in bytes

  @Prop({ type: Object })
  metadata?: {
    decimationRatio?: number; // How much the mesh was reduced (0-1)
    optimizationMethod?: string; // Algorithm used for optimization
    targetTriangleCount?: number;
    [key: string]: any;
  };
}

export const LODLevelSchema = SchemaFactory.createForClass(LODLevel);

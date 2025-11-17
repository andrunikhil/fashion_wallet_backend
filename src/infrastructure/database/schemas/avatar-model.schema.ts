import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type AvatarModelDocument = AvatarModel & Document;

// LOD (Level of Detail) level definition
class LODLevel {
  @Prop({ required: true })
  level: number;

  @Prop({ type: Buffer, required: true })
  vertices: Buffer;

  @Prop({ type: Buffer, required: true })
  faces: Buffer;

  @Prop({ type: Buffer })
  normals: Buffer;

  @Prop({ type: Buffer })
  uvs: Buffer;

  @Prop({ required: true })
  vertexCount: number;

  @Prop({ required: true })
  faceCount: number;

  @Prop()
  fileSizeBytes: number;
}

// Mesh data structure
class MeshData {
  @Prop({ type: Buffer, required: true })
  vertices: Buffer;

  @Prop({ type: Buffer, required: true })
  faces: Buffer;

  @Prop({ type: Buffer })
  normals: Buffer;

  @Prop({ type: Buffer })
  uvs: Buffer;

  @Prop({ required: true })
  vertexCount: number;

  @Prop({ required: true })
  faceCount: number;

  @Prop()
  boundingBox: {
    min: { x: number; y: number; z: number };
    max: { x: number; y: number; z: number };
  };
}

// Skeleton/Rigging data
class SkeletonData {
  @Prop({ type: [Object] })
  bones: Array<{
    name: string;
    position: { x: number; y: number; z: number };
    rotation: { x: number; y: number; z: number; w: number };
    scale: { x: number; y: number; z: number };
    parent: string | null;
  }>;

  @Prop({ type: Object })
  skinning: {
    boneIndices: Buffer;
    boneWeights: Buffer;
  };
}

// Texture data
class TextureData {
  @Prop()
  baseColorUrl: string;

  @Prop()
  baseColorS3Key: string;

  @Prop()
  normalMapUrl: string;

  @Prop()
  normalMapS3Key: string;

  @Prop()
  roughnessMapUrl: string;

  @Prop()
  roughnessMapS3Key: string;

  @Prop()
  metallicMapUrl: string;

  @Prop()
  metallicMapS3Key: string;

  @Prop()
  aoMapUrl: string; // Ambient Occlusion

  @Prop()
  aoMapS3Key: string;

  @Prop({ type: Object })
  textureResolutions: {
    baseColor: { width: number; height: number };
    normalMap: { width: number; height: number };
    roughness: { width: number; height: number };
    metallic: { width: number; height: number };
  };
}

// Material properties
class MaterialData {
  @Prop({ default: 'standard' })
  type: string;

  @Prop({ type: Object })
  properties: {
    baseColor?: { r: number; g: number; b: number };
    roughness?: number;
    metallic?: number;
    emissive?: { r: number; g: number; b: number };
    opacity?: number;
    [key: string]: any;
  };
}

// Generation metadata
class GenerationMetadata {
  @Prop()
  bodyType: string;

  @Prop({ type: Object })
  measurements: any;

  @Prop({ type: Object })
  landmarks: any;

  @Prop()
  mlModelVersion: string;

  @Prop()
  generationDuration: number; // milliseconds

  @Prop()
  optimizationLevel: string;

  @Prop({ type: [String] })
  appliedModifiers: string[];

  @Prop({ type: Object })
  customization: any;
}

@Schema({ collection: 'avatar_models', timestamps: true })
export class AvatarModel {
  @Prop({ required: true, unique: true, index: true })
  avatarId: string;

  @Prop({ type: MeshData, required: true })
  mesh: MeshData;

  @Prop({ type: [LODLevel], default: [] })
  lod: LODLevel[];

  @Prop({ type: TextureData })
  textures: TextureData;

  @Prop({ type: MaterialData })
  material: MaterialData;

  @Prop({ type: SkeletonData })
  skeleton: SkeletonData;

  @Prop({ type: GenerationMetadata })
  generationMetadata: GenerationMetadata;

  // Export formats stored in S3
  @Prop({ type: Object })
  exportFormats: {
    glb?: {
      url: string;
      s3Key: string;
      sizeBytes: number;
    };
    gltf?: {
      url: string;
      s3Key: string;
      sizeBytes: number;
    };
    obj?: {
      url: string;
      s3Key: string;
      sizeBytes: number;
    };
    fbx?: {
      url: string;
      s3Key: string;
      sizeBytes: number;
    };
  };

  // Model optimization info
  @Prop({ type: Object })
  optimization: {
    originalFaceCount: number;
    optimizedFaceCount: number;
    compressionRatio: number;
    dracoCompressed: boolean;
    meshoptCompressed: boolean;
  };

  // Model quality metrics
  @Prop({ type: Object })
  quality: {
    geometryScore: number; // 0-1
    topologyScore: number; // 0-1
    uvMappingScore: number; // 0-1
    overallScore: number; // 0-1
  };

  // Version tracking
  @Prop({ default: 1 })
  version: number;

  @Prop()
  previousVersionId: string;

  // Cache and performance
  @Prop()
  totalSizeBytes: number;

  @Prop()
  lastAccessedAt: Date;

  @Prop({ default: 0 })
  accessCount: number;

  // Additional metadata
  @Prop({ type: Object })
  metadata: {
    format: string;
    coordinateSystem: string;
    units: string;
    [key: string]: any;
  };

  // Timestamps (handled by Mongoose)
  createdAt: Date;
  updatedAt: Date;
}

export const AvatarModelSchema = SchemaFactory.createForClass(AvatarModel);

// Create indexes
AvatarModelSchema.index({ avatarId: 1 }, { unique: true });
AvatarModelSchema.index({ createdAt: -1 });
AvatarModelSchema.index({ lastAccessedAt: -1 });
AvatarModelSchema.index({ 'generationMetadata.bodyType': 1 });

// Add pre-save hook to update totalSizeBytes
AvatarModelSchema.pre('save', function (next) {
  const doc = this as AvatarModelDocument;

  // Calculate total size
  let totalSize = 0;
  if (doc.mesh?.vertices) totalSize += doc.mesh.vertices.length;
  if (doc.mesh?.faces) totalSize += doc.mesh.faces.length;
  if (doc.mesh?.normals) totalSize += doc.mesh.normals.length;
  if (doc.mesh?.uvs) totalSize += doc.mesh.uvs.length;

  if (doc.lod && doc.lod.length > 0) {
    doc.lod.forEach(level => {
      if (level.vertices) totalSize += level.vertices.length;
      if (level.faces) totalSize += level.faces.length;
    });
  }

  doc.totalSizeBytes = totalSize;
  next();
});

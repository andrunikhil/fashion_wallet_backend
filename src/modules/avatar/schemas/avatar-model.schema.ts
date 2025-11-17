import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { LODLevel, LODLevelSchema } from './lod-level.schema';

export type AvatarModelDocument = AvatarModel & Document;

/**
 * MongoDB schema for storing 3D avatar models
 * Stores binary mesh data, textures, skeleton, and LOD levels
 */
@Schema({ collection: 'avatar_models', timestamps: true })
export class AvatarModel {
  @Prop({ type: String, required: true, unique: true, index: true })
  avatarId: string; // References Avatar.id from PostgreSQL

  // Main mesh data (highest quality)
  @Prop({ type: Object, required: true })
  mesh: {
    vertices: Buffer; // Float32Array of vertex positions [x,y,z, x,y,z, ...]
    faces: Buffer; // Uint32Array of triangle indices [i1,i2,i3, i1,i2,i3, ...]
    normals: Buffer; // Float32Array of vertex normals [nx,ny,nz, nx,ny,nz, ...]
    uvs: Buffer; // Float32Array of UV coordinates [u,v, u,v, ...]
    vertexCount: number;
    faceCount: number;
  };

  // Level of Detail variations
  @Prop({ type: [LODLevelSchema], default: [] })
  lod: LODLevel[];

  // Texture data
  @Prop({ type: Object })
  textures?: {
    // URLs or S3 keys for texture files
    diffuse?: string; // Base color texture
    normal?: string; // Normal map for surface details
    roughness?: string; // Roughness/smoothness map
    metalness?: string; // Metallic map
    ao?: string; // Ambient occlusion map
    // Texture metadata
    resolution?: number; // Texture resolution (e.g., 1024, 2048)
    format?: string; // Texture format (e.g., 'jpg', 'png', 'webp')
    compression?: string; // Compression method if any
    totalSizeBytes?: number; // Total size of all textures
  };

  // Skeletal data for rigging and animation
  @Prop({ type: Object })
  skeleton?: {
    bones: Array<{
      name: string;
      parentIndex: number; // -1 for root bone
      position: [number, number, number]; // [x, y, z]
      rotation: [number, number, number, number]; // Quaternion [x, y, z, w]
      scale: [number, number, number]; // [x, y, z]
    }>;
    skinWeights?: Buffer; // Bone weights for each vertex
    skinIndices?: Buffer; // Bone indices for each vertex
    bindPose?: Buffer; // Bind pose matrices
  };

  // Morph targets / blend shapes for facial expressions, body customization
  @Prop({ type: Object })
  morphTargets?: {
    targets: Array<{
      name: string; // e.g., 'smile', 'frown', 'blink'
      positions: Buffer; // Delta positions for this morph
      influence?: number; // Default influence (0-1)
    }>;
  };

  // Material properties
  @Prop({ type: Object })
  material?: {
    type: string; // e.g., 'standard', 'pbr', 'toon'
    color?: string; // Hex color
    shininess?: number;
    opacity?: number;
    doubleSided?: boolean;
    properties?: {
      [key: string]: any;
    };
  };

  // Metadata about the generation process
  @Prop({ type: Object })
  generationMetadata?: {
    version: string; // Model format version
    generatedAt: Date;
    mlModelVersion?: string; // Version of ML model used
    processingDuration?: number; // Time to generate (ms)
    sourcePhotos?: number; // Number of photos used
    measurements?: {
      [key: string]: number; // Key measurements used
    };
    bodyType?: string;
    confidence?: number; // Overall confidence score (0-1)
    landmarks?: any[]; // Facial/body landmarks used
    options?: {
      quality?: 'low' | 'medium' | 'high' | 'ultra';
      optimizeForWeb?: boolean;
      generateLODs?: boolean;
      targetPolyCount?: number;
    };
  };

  // Bounding box for culling and optimization
  @Prop({ type: Object })
  boundingBox?: {
    min: [number, number, number]; // [x, y, z]
    max: [number, number, number]; // [x, y, z]
    center: [number, number, number];
    radius: number; // Bounding sphere radius
  };

  // File format information
  @Prop({ type: String, default: 'custom' })
  format: string; // 'custom', 'gltf', 'glb', 'fbx', etc.

  @Prop({ type: Number })
  totalSizeBytes?: number; // Total size including all LODs and textures

  @Prop({ type: Object })
  exportedFormats?: {
    [format: string]: {
      url: string; // S3 URL
      sizeBytes: number;
      generatedAt: Date;
    };
  }; // Cached exported formats (GLTF, GLB, etc.)

  // Validation and quality metrics
  @Prop({ type: Object })
  quality?: {
    isValid: boolean; // Whether the mesh is valid (no holes, manifold)
    hasNormals: boolean;
    hasUVs: boolean;
    hasTextures: boolean;
    hasSkeleton: boolean;
    warnings?: string[]; // Non-critical issues
    errors?: string[]; // Critical issues
  };

  // Tags for categorization and search
  @Prop({ type: [String], default: [] })
  tags?: string[]; // e.g., ['realistic', 'male', 'casual']

  // Timestamps (handled by mongoose timestamps option)
  createdAt?: Date;
  updatedAt?: Date;
}

export const AvatarModelSchema = SchemaFactory.createForClass(AvatarModel);

// Add indexes
AvatarModelSchema.index({ avatarId: 1 }, { unique: true });
AvatarModelSchema.index({ 'generationMetadata.generatedAt': -1 });
AvatarModelSchema.index({ tags: 1 });
AvatarModelSchema.index({ format: 1 });

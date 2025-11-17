/**
 * Media & File Processing Types
 * Shared types and interfaces for media processing utilities
 */

import { Sharp } from 'sharp';

// ============================================================================
// Image Types
// ============================================================================

export enum ImageFormat {
  JPEG = 'jpeg',
  PNG = 'png',
  WEBP = 'webp',
  AVIF = 'avif',
  TIFF = 'tiff',
  GIF = 'gif',
}

export enum FlipDirection {
  HORIZONTAL = 'horizontal',
  VERTICAL = 'vertical',
  BOTH = 'both',
}

export interface ResizeOptions {
  width?: number;
  height?: number;
  fit?: 'cover' | 'contain' | 'fill' | 'inside' | 'outside';
  position?: string | number;
  background?: string;
  withoutEnlargement?: boolean;
}

export interface CropOptions {
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface ImageMetadata {
  format?: string;
  width?: number;
  height?: number;
  space?: string;
  channels?: number;
  depth?: string;
  density?: number;
  hasAlpha?: boolean;
  orientation?: number;
  size?: number;
  exif?: any;
  icc?: any;
}

export interface ValidationOptions {
  maxWidth?: number;
  maxHeight?: number;
  maxSize?: number; // in bytes
  allowedFormats?: ImageFormat[];
  minWidth?: number;
  minHeight?: number;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  metadata?: ImageMetadata;
}

export interface ConversionOptions {
  format: ImageFormat;
  quality?: number;
  progressive?: boolean;
  effort?: number; // For WebP/AVIF (0-9)
  lossless?: boolean;
  compressionLevel?: number; // For PNG (0-9)
}

export interface OptimizationOptions {
  quality?: number;
  progressive?: boolean;
  stripMetadata?: boolean;
  targetSizeKB?: number;
  maxWidth?: number;
  maxHeight?: number;
}

export interface ThumbnailOptions {
  width: number;
  height: number;
  fit?: 'cover' | 'contain' | 'fill' | 'inside' | 'outside';
  position?: string;
  format?: ImageFormat;
  quality?: number;
}

export interface SpriteSheetOptions {
  images: Buffer[];
  columns: number;
  spacing?: number;
  background?: string;
}

export interface ColorInfo {
  dominant: string; // Hex color
  palette: string[]; // Array of hex colors
  vibrant?: string;
  darkVibrant?: string;
  lightVibrant?: string;
}

export interface PerceptualHash {
  hash: string;
  algorithm: 'dhash' | 'phash' | 'ahash';
}

export interface SimilarityResult {
  similarity: number; // 0-1
  distance: number;
}

// ============================================================================
// Video Types
// ============================================================================

export interface VideoMetadata {
  format?: string;
  duration?: number;
  width?: number;
  height?: number;
  fps?: number;
  bitrate?: number;
  codec?: string;
  size?: number;
}

export interface VideoConversionOptions {
  format: 'mp4' | 'webm' | 'mov';
  codec?: string;
  bitrate?: string;
  fps?: number;
  width?: number;
  height?: number;
  quality?: number;
}

export interface FrameExtractionOptions {
  timestamp?: number; // in seconds
  count?: number; // number of frames to extract
  interval?: number; // interval between frames in seconds
  width?: number;
  height?: number;
  format?: ImageFormat;
}

export interface VideoThumbnailOptions {
  timestamp?: number; // in seconds
  width?: number;
  height?: number;
  format?: ImageFormat;
  quality?: number;
}

// ============================================================================
// 3D Model Types
// ============================================================================

export interface Model3DMetadata {
  format: 'gltf' | 'glb';
  vertexCount?: number;
  faceCount?: number;
  meshCount?: number;
  materialCount?: number;
  textureCount?: number;
  size?: number;
  boundingBox?: BoundingBox;
  animations?: number;
}

export interface BoundingBox {
  min: { x: number; y: number; z: number };
  max: { x: number; y: number; z: number };
  center: { x: number; y: number; z: number };
  size: { x: number; y: number; z: number };
}

export interface DracoCompressionOptions {
  quantizePosition?: number;
  quantizeNormal?: number;
  quantizeTexcoord?: number;
  quantizeColor?: number;
  quantizeGeneric?: number;
  compressionLevel?: number;
}

export interface LODGenerationOptions {
  levels: number;
  ratio?: number; // Reduction ratio per level (e.g., 0.5 = 50% reduction)
}

// ============================================================================
// File Types
// ============================================================================

export interface FileValidationOptions {
  allowedMimeTypes?: string[];
  maxSize?: number; // in bytes
  minSize?: number;
}

export interface FileValidationResult {
  valid: boolean;
  errors: string[];
  mimeType?: string;
  size?: number;
}

export interface HashOptions {
  algorithm?: 'md5' | 'sha1' | 'sha256' | 'sha512';
}

// ============================================================================
// Storage Types
// ============================================================================

export interface S3UploadOptions {
  bucket: string;
  key: string;
  contentType?: string;
  metadata?: Record<string, string>;
  acl?: 'private' | 'public-read' | 'public-read-write' | 'authenticated-read';
  cacheControl?: string;
}

export interface S3DownloadOptions {
  bucket: string;
  key: string;
}

export interface S3SignedUrlOptions {
  bucket: string;
  key: string;
  expiresIn?: number; // in seconds, default 3600 (1 hour)
  operation?: 'getObject' | 'putObject';
}

export interface S3DeleteOptions {
  bucket: string;
  key: string;
}

export interface S3CopyOptions {
  sourceBucket: string;
  sourceKey: string;
  destinationBucket: string;
  destinationKey: string;
}

export interface S3BatchUploadOptions {
  bucket: string;
  files: Array<{
    key: string;
    data: Buffer;
    contentType?: string;
    metadata?: Record<string, string>;
  }>;
}

export interface S3UploadResult {
  bucket: string;
  key: string;
  url: string;
  etag?: string;
  versionId?: string;
}

// ============================================================================
// Common Types
// ============================================================================

export interface ProcessingResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  processingTime?: number; // in ms
}

export type MediaBuffer = Buffer;
export type MediaStream = NodeJS.ReadableStream;

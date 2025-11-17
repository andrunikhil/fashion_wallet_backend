import { fileTypeFromBuffer, FileTypeResult } from 'file-type';
import * as path from 'path';

/**
 * MIME detection result
 */
export interface MimeDetectionResult {
  mimeType: string;
  extension: string;
  confidence: 'high' | 'medium' | 'low';
  method: 'magic-number' | 'extension' | 'content-sniffing' | 'custom-registry';
}

/**
 * Custom MIME type registry entry
 */
interface CustomMimeEntry {
  mimeType: string;
  extensions: string[];
  magicNumbers?: Buffer[];
}

/**
 * MIME Detector Utility
 * Detects MIME types using magic numbers, extensions, and custom registry
 */
export class MimeDetector {
  private static customRegistry: Map<string, CustomMimeEntry> = new Map([
    // 3D Model formats
    ['gltf', {
      mimeType: 'model/gltf+json',
      extensions: ['gltf'],
      magicNumbers: [Buffer.from('{"asset"')],
    }],
    ['glb', {
      mimeType: 'model/gltf-binary',
      extensions: ['glb'],
      magicNumbers: [Buffer.from('glTF')],
    }],
    ['obj', {
      mimeType: 'model/obj',
      extensions: ['obj'],
    }],
    ['fbx', {
      mimeType: 'model/fbx',
      extensions: ['fbx'],
      magicNumbers: [Buffer.from('Kaydara FBX Binary')],
    }],
    // Additional texture formats
    ['dds', {
      mimeType: 'image/vnd-ms.dds',
      extensions: ['dds'],
      magicNumbers: [Buffer.from('DDS ')],
    }],
  ]);

  /**
   * Detect MIME type from buffer
   * @param buffer - File buffer
   * @param filename - Optional filename for fallback detection
   * @returns MIME detection result
   */
  static async detect(
    buffer: Buffer,
    filename?: string,
  ): Promise<MimeDetectionResult> {
    // Try magic number detection first (most reliable)
    const fileType = await this.detectByMagicNumber(buffer);
    if (fileType) {
      return {
        mimeType: fileType.mime,
        extension: fileType.ext,
        confidence: 'high',
        method: 'magic-number',
      };
    }

    // Try custom registry detection
    const customResult = this.detectByCustomRegistry(buffer, filename);
    if (customResult) {
      return customResult;
    }

    // Try extension-based detection
    if (filename) {
      const extensionResult = this.detectByExtension(filename);
      if (extensionResult) {
        return extensionResult;
      }
    }

    // Try content sniffing as last resort
    const sniffedResult = this.detectByContentSniffing(buffer);
    if (sniffedResult) {
      return sniffedResult;
    }

    // Default fallback
    return {
      mimeType: 'application/octet-stream',
      extension: '',
      confidence: 'low',
      method: 'extension',
    };
  }

  /**
   * Detect MIME type by magic number
   * @param buffer - File buffer
   * @returns File type result or null
   */
  private static async detectByMagicNumber(
    buffer: Buffer,
  ): Promise<FileTypeResult | undefined> {
    try {
      return await fileTypeFromBuffer(buffer);
    } catch (error) {
      return undefined;
    }
  }

  /**
   * Detect MIME type by file extension
   * @param filename - File name
   * @returns MIME detection result or null
   */
  private static detectByExtension(filename: string): MimeDetectionResult | null {
    const ext = path.extname(filename).toLowerCase().slice(1);

    // Check custom registry first
    const customEntry = this.customRegistry.get(ext);
    if (customEntry) {
      return {
        mimeType: customEntry.mimeType,
        extension: ext,
        confidence: 'medium',
        method: 'extension',
      };
    }

    // Common extension mappings
    const extensionMap: Record<string, string> = {
      // Images
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      png: 'image/png',
      gif: 'image/gif',
      webp: 'image/webp',
      avif: 'image/avif',
      svg: 'image/svg+xml',
      bmp: 'image/bmp',
      tiff: 'image/tiff',
      ico: 'image/x-icon',

      // Videos
      mp4: 'video/mp4',
      webm: 'video/webm',
      mov: 'video/quicktime',
      avi: 'video/x-msvideo',

      // 3D Models
      gltf: 'model/gltf+json',
      glb: 'model/gltf-binary',
      obj: 'model/obj',
      fbx: 'model/fbx',

      // Documents
      pdf: 'application/pdf',
      json: 'application/json',
      xml: 'application/xml',
      zip: 'application/zip',
    };

    const mimeType = extensionMap[ext];
    if (mimeType) {
      return {
        mimeType,
        extension: ext,
        confidence: 'medium',
        method: 'extension',
      };
    }

    return null;
  }

  /**
   * Detect MIME type using custom registry
   * @param buffer - File buffer
   * @param filename - Optional filename
   * @returns MIME detection result or null
   */
  private static detectByCustomRegistry(
    buffer: Buffer,
    filename?: string,
  ): MimeDetectionResult | null {
    // Check magic numbers in custom registry
    for (const [ext, entry] of this.customRegistry.entries()) {
      if (entry.magicNumbers) {
        for (const magicNumber of entry.magicNumbers) {
          if (buffer.slice(0, magicNumber.length).equals(magicNumber)) {
            return {
              mimeType: entry.mimeType,
              extension: ext,
              confidence: 'high',
              method: 'custom-registry',
            };
          }
        }
      }
    }

    // Check filename extension
    if (filename) {
      const ext = path.extname(filename).toLowerCase().slice(1);
      const entry = this.customRegistry.get(ext);
      if (entry) {
        return {
          mimeType: entry.mimeType,
          extension: ext,
          confidence: 'medium',
          method: 'custom-registry',
        };
      }
    }

    return null;
  }

  /**
   * Detect MIME type by content sniffing
   * @param buffer - File buffer
   * @returns MIME detection result or null
   */
  private static detectByContentSniffing(buffer: Buffer): MimeDetectionResult | null {
    const content = buffer.toString('utf-8', 0, Math.min(buffer.length, 512));

    // Check for JSON
    if (content.trim().startsWith('{') || content.trim().startsWith('[')) {
      try {
        JSON.parse(content);
        return {
          mimeType: 'application/json',
          extension: 'json',
          confidence: 'medium',
          method: 'content-sniffing',
        };
      } catch {
        // Not valid JSON
      }
    }

    // Check for XML
    if (content.trim().startsWith('<?xml') || content.trim().startsWith('<')) {
      return {
        mimeType: 'application/xml',
        extension: 'xml',
        confidence: 'low',
        method: 'content-sniffing',
      };
    }

    // Check for GLTF JSON
    if (content.includes('"asset"') && content.includes('"version"')) {
      return {
        mimeType: 'model/gltf+json',
        extension: 'gltf',
        confidence: 'medium',
        method: 'content-sniffing',
      };
    }

    return null;
  }

  /**
   * Register a custom MIME type
   * @param extension - File extension
   * @param entry - MIME entry details
   */
  static registerCustomMimeType(extension: string, entry: CustomMimeEntry): void {
    this.customRegistry.set(extension.toLowerCase(), entry);
  }

  /**
   * Get MIME type by extension only
   * @param filename - File name or extension
   * @returns MIME type or null
   */
  static getMimeTypeByExtension(filename: string): string | null {
    const result = this.detectByExtension(filename);
    return result?.mimeType || null;
  }

  /**
   * Get extension by MIME type
   * @param mimeType - MIME type
   * @returns Extension or null
   */
  static getExtensionByMimeType(mimeType: string): string | null {
    // Check custom registry
    for (const [ext, entry] of this.customRegistry.entries()) {
      if (entry.mimeType === mimeType) {
        return ext;
      }
    }

    // Common MIME to extension mappings
    const mimeMap: Record<string, string> = {
      'image/jpeg': 'jpg',
      'image/png': 'png',
      'image/webp': 'webp',
      'image/gif': 'gif',
      'image/avif': 'avif',
      'video/mp4': 'mp4',
      'video/webm': 'webm',
      'model/gltf-binary': 'glb',
      'model/gltf+json': 'gltf',
    };

    return mimeMap[mimeType] || null;
  }

  /**
   * Check if MIME type is image
   * @param mimeType - MIME type
   * @returns True if image
   */
  static isImage(mimeType: string): boolean {
    return mimeType.startsWith('image/');
  }

  /**
   * Check if MIME type is video
   * @param mimeType - MIME type
   * @returns True if video
   */
  static isVideo(mimeType: string): boolean {
    return mimeType.startsWith('video/');
  }

  /**
   * Check if MIME type is 3D model
   * @param mimeType - MIME type
   * @returns True if 3D model
   */
  static is3DModel(mimeType: string): boolean {
    return mimeType.startsWith('model/');
  }
}

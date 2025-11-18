import { BadRequestException } from '@nestjs/common';
import { extname } from 'path';

export interface FileValidationOptions {
  maxSize?: number; // in bytes
  allowedMimeTypes?: string[];
  allowedExtensions?: string[];
  minWidth?: number;
  minHeight?: number;
  maxWidth?: number;
  maxHeight?: number;
}

export class FileUploadValidator {
  /**
   * Validate file size
   */
  static validateFileSize(file: Express.Multer.File, maxSize: number): void {
    if (file.size > maxSize) {
      const maxSizeMB = (maxSize / (1024 * 1024)).toFixed(2);
      const fileSizeMB = (file.size / (1024 * 1024)).toFixed(2);
      throw new BadRequestException(
        `File size ${fileSizeMB}MB exceeds maximum allowed size of ${maxSizeMB}MB`,
      );
    }
  }

  /**
   * Validate MIME type
   */
  static validateMimeType(
    file: Express.Multer.File,
    allowedMimeTypes: string[],
  ): void {
    if (!allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException(
        `Invalid file type. Allowed types: ${allowedMimeTypes.join(', ')}`,
      );
    }
  }

  /**
   * Validate file extension
   */
  static validateExtension(
    file: Express.Multer.File,
    allowedExtensions: string[],
  ): void {
    const ext = extname(file.originalname).toLowerCase();
    if (!allowedExtensions.includes(ext)) {
      throw new BadRequestException(
        `Invalid file extension. Allowed extensions: ${allowedExtensions.join(', ')}`,
      );
    }
  }

  /**
   * Validate filename (prevent path traversal)
   */
  static validateFilename(file: Express.Multer.File): void {
    const filename = file.originalname;

    // Check for path traversal attempts
    if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      throw new BadRequestException('Invalid filename: path traversal detected');
    }

    // Check for suspicious characters
    const suspiciousPattern = /[<>:"|?*\x00-\x1f]/;
    if (suspiciousPattern.test(filename)) {
      throw new BadRequestException('Invalid filename: contains suspicious characters');
    }

    // Check filename length
    if (filename.length > 255) {
      throw new BadRequestException('Filename too long (max 255 characters)');
    }
  }

  /**
   * Check for potential malicious content (basic checks)
   */
  static async validateFileContent(file: Express.Multer.File): Promise<void> {
    const buffer = file.buffer;

    // Check for executable headers
    const executableSignatures = [
      Buffer.from([0x4d, 0x5a]), // MZ (Windows executable)
      Buffer.from([0x7f, 0x45, 0x4c, 0x46]), // ELF (Linux executable)
      Buffer.from([0xca, 0xfe, 0xba, 0xbe]), // Mach-O (macOS executable)
    ];

    for (const signature of executableSignatures) {
      if (buffer.subarray(0, signature.length).equals(signature)) {
        throw new BadRequestException('Executable files are not allowed');
      }
    }

    // Check for script content in file headers
    const headerStr = buffer.subarray(0, 100).toString('utf-8', 0, 100);
    const scriptPatterns = [
      /<script/i,
      /javascript:/i,
      /on\w+\s*=/i, // Event handlers like onclick=
      /<iframe/i,
      /eval\(/i,
    ];

    for (const pattern of scriptPatterns) {
      if (pattern.test(headerStr)) {
        throw new BadRequestException('File contains potentially malicious content');
      }
    }
  }

  /**
   * Comprehensive file validation
   */
  static async validateFile(
    file: Express.Multer.File,
    options: FileValidationOptions,
  ): Promise<void> {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    // Validate filename
    this.validateFilename(file);

    // Validate file size
    if (options.maxSize) {
      this.validateFileSize(file, options.maxSize);
    }

    // Validate MIME type
    if (options.allowedMimeTypes && options.allowedMimeTypes.length > 0) {
      this.validateMimeType(file, options.allowedMimeTypes);
    }

    // Validate extension
    if (options.allowedExtensions && options.allowedExtensions.length > 0) {
      this.validateExtension(file, options.allowedExtensions);
    }

    // Validate content
    await this.validateFileContent(file);
  }
}

/**
 * Predefined validation configurations
 */
export const FileValidationPresets = {
  // Images (thumbnails, previews)
  IMAGE: {
    maxSize: 5 * 1024 * 1024, // 5MB
    allowedMimeTypes: [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/webp',
      'image/gif',
    ],
    allowedExtensions: ['.jpg', '.jpeg', '.png', '.webp', '.gif'],
  },

  // 3D Models
  MODEL_3D: {
    maxSize: 50 * 1024 * 1024, // 50MB
    allowedMimeTypes: [
      'model/gltf-binary',
      'model/gltf+json',
      'application/octet-stream', // .glb files
      'application/json', // .gltf files
    ],
    allowedExtensions: ['.glb', '.gltf'],
  },

  // Textures (PBR maps)
  TEXTURE: {
    maxSize: 10 * 1024 * 1024, // 10MB
    allowedMimeTypes: [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/webp',
    ],
    allowedExtensions: ['.jpg', '.jpeg', '.png', '.webp'],
  },

  // Pattern files
  PATTERN: {
    maxSize: 5 * 1024 * 1024, // 5MB
    allowedMimeTypes: [
      'image/png',
      'image/jpeg',
      'image/svg+xml',
    ],
    allowedExtensions: ['.png', '.jpg', '.jpeg', '.svg'],
  },
};

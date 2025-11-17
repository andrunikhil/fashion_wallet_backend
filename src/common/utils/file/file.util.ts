import * as path from 'path';

/**
 * MIME type categories
 */
export const MIME_TYPES = {
  IMAGE: {
    JPEG: 'image/jpeg',
    PNG: 'image/png',
    GIF: 'image/gif',
    WEBP: 'image/webp',
    SVG: 'image/svg+xml',
  },
  VIDEO: {
    MP4: 'video/mp4',
    WEBM: 'video/webm',
    OGG: 'video/ogg',
  },
  DOCUMENT: {
    PDF: 'application/pdf',
    DOC: 'application/msword',
    DOCX: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    XLS: 'application/vnd.ms-excel',
    XLSX: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  },
  ARCHIVE: {
    ZIP: 'application/zip',
    RAR: 'application/x-rar-compressed',
    TAR: 'application/x-tar',
    GZIP: 'application/gzip',
  },
  TEXT: {
    PLAIN: 'text/plain',
    HTML: 'text/html',
    CSS: 'text/css',
    JAVASCRIPT: 'text/javascript',
    JSON: 'application/json',
  },
};

/**
 * File utility class for file operations
 * Provides MIME type detection, validation, and path operations
 */
export class FileUtil {
  /**
   * Extension to MIME type mapping
   */
  private static readonly EXT_TO_MIME: Record<string, string> = {
    // Images
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    gif: 'image/gif',
    webp: 'image/webp',
    svg: 'image/svg+xml',
    bmp: 'image/bmp',
    ico: 'image/x-icon',

    // Videos
    mp4: 'video/mp4',
    webm: 'video/webm',
    ogg: 'video/ogg',
    avi: 'video/x-msvideo',
    mov: 'video/quicktime',

    // Documents
    pdf: 'application/pdf',
    doc: 'application/msword',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    xls: 'application/vnd.ms-excel',
    xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ppt: 'application/vnd.ms-powerpoint',
    pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',

    // Archives
    zip: 'application/zip',
    rar: 'application/x-rar-compressed',
    tar: 'application/x-tar',
    gz: 'application/gzip',
    '7z': 'application/x-7z-compressed',

    // Text
    txt: 'text/plain',
    html: 'text/html',
    htm: 'text/html',
    css: 'text/css',
    js: 'text/javascript',
    json: 'application/json',
    xml: 'application/xml',
    csv: 'text/csv',
    md: 'text/markdown',

    // Audio
    mp3: 'audio/mpeg',
    wav: 'audio/wav',
    ogg: 'audio/ogg',
    m4a: 'audio/mp4',
  };

  /**
   * Gets MIME type from file extension
   * @param filename File name or path
   * @returns MIME type or null
   */
  static getMimeType(filename: string): string | null {
    const ext = this.getExtension(filename).toLowerCase();
    return this.EXT_TO_MIME[ext] || null;
  }

  /**
   * Gets file extension
   * @param filename File name or path
   * @returns Extension without dot
   */
  static getExtension(filename: string): string {
    const ext = path.extname(filename);
    return ext.startsWith('.') ? ext.substring(1) : ext;
  }

  /**
   * Gets file name without extension
   * @param filename File name or path
   * @returns File name without extension
   */
  static getBaseName(filename: string): string {
    return path.basename(filename, path.extname(filename));
  }

  /**
   * Validates file extension against allowed list
   * @param filename File name
   * @param allowedExtensions Array of allowed extensions (without dots)
   * @returns true if valid
   */
  static isValidExtension(filename: string, allowedExtensions: string[]): boolean {
    const ext = this.getExtension(filename).toLowerCase();
    return allowedExtensions.map((e) => e.toLowerCase()).includes(ext);
  }

  /**
   * Validates file size
   * @param fileSize File size in bytes
   * @param maxSize Maximum size in bytes
   * @returns true if valid
   */
  static isValidSize(fileSize: number, maxSize: number): boolean {
    return fileSize <= maxSize;
  }

  /**
   * Formats file size to human-readable format
   * @param bytes File size in bytes
   * @param decimals Number of decimals (default: 2)
   * @returns Formatted size
   */
  static formatSize(bytes: number, decimals: number = 2): string {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(decimals)) + ' ' + sizes[i];
  }

  /**
   * Parses file size string to bytes
   * @param sizeStr Size string (e.g., '10MB', '1.5GB')
   * @returns Size in bytes
   */
  static parseSize(sizeStr: string): number {
    const match = sizeStr.match(/^(\d+(?:\.\d+)?)\s*([A-Z]+)$/i);
    if (!match) return 0;

    const value = parseFloat(match[1]);
    const unit = match[2].toUpperCase();

    const multipliers: Record<string, number> = {
      B: 1,
      KB: 1024,
      MB: 1024 * 1024,
      GB: 1024 * 1024 * 1024,
      TB: 1024 * 1024 * 1024 * 1024,
    };

    return value * (multipliers[unit] || 0);
  }

  /**
   * Checks if file is an image
   * @param filename File name
   * @returns true if image
   */
  static isImage(filename: string): boolean {
    const mimeType = this.getMimeType(filename);
    return mimeType ? mimeType.startsWith('image/') : false;
  }

  /**
   * Checks if file is a video
   * @param filename File name
   * @returns true if video
   */
  static isVideo(filename: string): boolean {
    const mimeType = this.getMimeType(filename);
    return mimeType ? mimeType.startsWith('video/') : false;
  }

  /**
   * Checks if file is a document
   * @param filename File name
   * @returns true if document
   */
  static isDocument(filename: string): boolean {
    const documentExtensions = ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx'];
    return this.isValidExtension(filename, documentExtensions);
  }

  /**
   * Checks if file is an archive
   * @param filename File name
   * @returns true if archive
   */
  static isArchive(filename: string): boolean {
    const archiveExtensions = ['zip', 'rar', 'tar', 'gz', '7z'];
    return this.isValidExtension(filename, archiveExtensions);
  }

  /**
   * Checks if file is text
   * @param filename File name
   * @returns true if text
   */
  static isText(filename: string): boolean {
    const mimeType = this.getMimeType(filename);
    return mimeType ? mimeType.startsWith('text/') : false;
  }

  /**
   * Checks if file is audio
   * @param filename File name
   * @returns true if audio
   */
  static isAudio(filename: string): boolean {
    const mimeType = this.getMimeType(filename);
    return mimeType ? mimeType.startsWith('audio/') : false;
  }

  /**
   * Sanitizes file name for safe storage
   * @param filename Original file name
   * @param preserveExtension Whether to preserve extension (default: true)
   * @returns Sanitized file name
   */
  static sanitizeFilename(filename: string, preserveExtension: boolean = true): string {
    const ext = preserveExtension ? this.getExtension(filename) : '';
    const base = preserveExtension ? this.getBaseName(filename) : filename;

    // Remove unsafe characters
    const sanitized = base
      .replace(/[^a-zA-Z0-9._-]/g, '_')
      .replace(/\.{2,}/g, '_')
      .replace(/^\.+/, '');

    return ext ? `${sanitized}.${ext}` : sanitized;
  }

  /**
   * Generates a unique filename
   * @param originalFilename Original file name
   * @param prefix Optional prefix
   * @returns Unique file name
   */
  static generateUniqueFilename(originalFilename: string, prefix: string = ''): string {
    const ext = this.getExtension(originalFilename);
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 15);
    const baseName = prefix || this.getBaseName(originalFilename);

    return `${baseName}-${timestamp}-${random}.${ext}`;
  }

  /**
   * Validates file path (prevents path traversal)
   * @param filePath File path to validate
   * @param baseDir Base directory
   * @returns true if valid
   */
  static isValidPath(filePath: string, baseDir: string): boolean {
    const resolved = path.resolve(baseDir, filePath);
    const base = path.resolve(baseDir);

    return resolved.startsWith(base);
  }

  /**
   * Joins path segments safely
   * @param segments Path segments
   * @returns Joined path
   */
  static joinPath(...segments: string[]): string {
    return path.join(...segments);
  }

  /**
   * Normalizes a file path
   * @param filePath File path to normalize
   * @returns Normalized path
   */
  static normalizePath(filePath: string): string {
    return path.normalize(filePath);
  }

  /**
   * Gets directory name from path
   * @param filePath File path
   * @returns Directory name
   */
  static getDirName(filePath: string): string {
    return path.dirname(filePath);
  }

  /**
   * Checks if path is absolute
   * @param filePath File path
   * @returns true if absolute
   */
  static isAbsolutePath(filePath: string): boolean {
    return path.isAbsolute(filePath);
  }

  /**
   * Converts relative path to absolute
   * @param relativePath Relative path
   * @param basePath Base path (default: cwd)
   * @returns Absolute path
   */
  static toAbsolutePath(relativePath: string, basePath: string = process.cwd()): string {
    return path.resolve(basePath, relativePath);
  }

  /**
   * Gets relative path between two paths
   * @param from From path
   * @param to To path
   * @returns Relative path
   */
  static getRelativePath(from: string, to: string): string {
    return path.relative(from, to);
  }

  /**
   * Validates upload file metadata
   * @param metadata File metadata
   * @returns Validation result
   */
  static validateUpload(metadata: {
    filename: string;
    size: number;
    mimeType?: string;
    maxSize: number;
    allowedExtensions?: string[];
    allowedMimeTypes?: string[];
  }): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Validate size
    if (!this.isValidSize(metadata.size, metadata.maxSize)) {
      errors.push(
        `File size ${this.formatSize(metadata.size)} exceeds maximum allowed size of ${this.formatSize(metadata.maxSize)}`,
      );
    }

    // Validate extension
    if (metadata.allowedExtensions) {
      if (!this.isValidExtension(metadata.filename, metadata.allowedExtensions)) {
        errors.push(
          `File extension not allowed. Allowed: ${metadata.allowedExtensions.join(', ')}`,
        );
      }
    }

    // Validate MIME type
    if (metadata.allowedMimeTypes && metadata.mimeType) {
      if (!metadata.allowedMimeTypes.includes(metadata.mimeType)) {
        errors.push(
          `File type not allowed. Allowed: ${metadata.allowedMimeTypes.join(', ')}`,
        );
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Gets content type header from file extension
   * @param filename File name
   * @returns Content-Type header value
   */
  static getContentType(filename: string): string {
    return this.getMimeType(filename) || 'application/octet-stream';
  }

  /**
   * Checks if filename has an extension
   * @param filename File name
   * @returns true if has extension
   */
  static hasExtension(filename: string): boolean {
    return path.extname(filename).length > 0;
  }

  /**
   * Changes file extension
   * @param filename Original filename
   * @param newExtension New extension (with or without dot)
   * @returns Filename with new extension
   */
  static changeExtension(filename: string, newExtension: string): string {
    const base = this.getBaseName(filename);
    const ext = newExtension.startsWith('.') ? newExtension : `.${newExtension}`;
    return base + ext;
  }
}

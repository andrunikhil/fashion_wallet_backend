import { CorsOptions } from '@nestjs/common/interfaces/external/cors-options.interface';

/**
 * CORS Configuration
 * Restrict which origins can access the API
 */
export const corsConfig: CorsOptions = {
  // In production, replace with actual frontend URLs
  origin: process.env.CORS_ORIGINS
    ? process.env.CORS_ORIGINS.split(',')
    : [
        'http://localhost:3000',
        'http://localhost:3001',
        'http://localhost:4200',
      ],
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'Accept',
    'Origin',
  ],
  exposedHeaders: ['X-Total-Count', 'X-Page', 'X-Per-Page'],
  credentials: true,
  maxAge: 3600, // Cache preflight requests for 1 hour
};

/**
 * Helmet Configuration
 * Security headers configuration
 */
export const helmetConfig = {
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false, // Disable if using CDN
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  hsts: {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true,
  },
};

/**
 * Rate Limiting Configuration
 */
export const rateLimitConfig = {
  // Global rate limit
  global: {
    ttl: 60000, // 60 seconds
    limit: 100, // 100 requests per minute
  },
  // Stricter limits for auth endpoints
  auth: {
    ttl: 60000, // 60 seconds
    limit: 10, // 10 requests per minute
  },
  // Stricter limits for file uploads
  upload: {
    ttl: 60000, // 60 seconds
    limit: 20, // 20 uploads per minute
  },
};

/**
 * File Upload Configuration
 */
export const uploadConfig = {
  // Maximum file sizes
  maxFileSize: {
    image: 5 * 1024 * 1024, // 5MB
    model3d: 50 * 1024 * 1024, // 50MB
    texture: 10 * 1024 * 1024, // 10MB
    pattern: 5 * 1024 * 1024, // 5MB
  },
  // Allowed MIME types
  allowedMimeTypes: {
    image: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
    model3d: [
      'model/gltf-binary',
      'model/gltf+json',
      'application/octet-stream',
      'application/json',
    ],
    texture: ['image/jpeg', 'image/png', 'image/webp'],
    pattern: ['image/png', 'image/jpeg', 'image/svg+xml'],
  },
};

/**
 * Input Sanitization Configuration
 */
export const sanitizationConfig = {
  // Strip HTML tags from string inputs
  stripTags: true,
  // Allowed HTML tags (if stripTags is false)
  allowedTags: [],
  // Trim whitespace
  trim: true,
  // Maximum string lengths
  maxLengths: {
    name: 255,
    description: 5000,
    tag: 50,
    url: 2048,
  },
};

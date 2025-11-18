# Security Guide

This document outlines the security features implemented in the Fashion Wallet backend and best practices for maintaining security.

## Table of Contents

1. [Authentication & Authorization](#authentication--authorization)
2. [Rate Limiting](#rate-limiting)
3. [Input Validation & Sanitization](#input-validation--sanitization)
4. [File Upload Security](#file-upload-security)
5. [CORS Configuration](#cors-configuration)
6. [Security Headers](#security-headers)
7. [Environment Variables](#environment-variables)
8. [Best Practices](#best-practices)
9. [Security Checklist](#security-checklist)

---

## Authentication & Authorization

### JWT-Based Authentication

The application uses JWT (JSON Web Tokens) for stateless authentication.

**Location**: `src/modules/auth/`

**Components**:
- `JwtStrategy`: Validates JWT tokens and extracts user information
- `JwtAuthGuard`: Protects routes requiring authentication
- `RolesGuard`: Enforces role-based access control (RBAC)

**Usage Example**:
```typescript
@Post('items')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin', 'catalog_manager')
async createCatalogItem(@Body() dto: CreateCatalogItemDto) {
  // Only authenticated users with 'admin' or 'catalog_manager' roles can access
}
```

**Protected Endpoints**:
- `POST /catalog/items` - Requires: `admin` or `catalog_manager`
- `PUT /catalog/items/:id` - Requires: `admin` or `catalog_manager`
- `DELETE /catalog/items/:id` - Requires: `admin` only
- All Brand Partner endpoints - Requires: `admin` or `catalog_manager`
- All Collection management - Requires: `admin` or `catalog_manager`

**Environment Variables**:
```env
JWT_SECRET=your-super-secret-key-min-32-chars
JWT_EXPIRATION=1d
```

**Security Considerations**:
- Use a strong, random JWT_SECRET (minimum 32 characters)
- Rotate JWT_SECRET regularly in production
- Use short expiration times (1d recommended)
- Implement refresh token mechanism for better UX
- Never commit JWT_SECRET to version control

---

## Rate Limiting

### Global Rate Limiting

**Location**: `src/app.module.ts`

**Configuration**:
- **Default**: 100 requests per 60 seconds per IP
- Applied globally to all endpoints via `ThrottlerGuard`

**Customization**:
```typescript
ThrottlerModule.forRoot([{
  ttl: 60000, // Time window in milliseconds
  limit: 100, // Maximum requests in time window
}])
```

**Per-Endpoint Rate Limiting**:
```typescript
@Throttle(10, 60) // 10 requests per 60 seconds
@Post('login')
async login() { }
```

**Configuration File**: `src/config/security.config.ts`
- `rateLimitConfig.global` - Global limits
- `rateLimitConfig.auth` - Auth endpoint limits (stricter)
- `rateLimitConfig.upload` - File upload limits (stricter)

---

## Input Validation & Sanitization

### Class Validator

All DTOs use `class-validator` decorators for input validation.

**Global Validation Pipe** (`src/main.ts`):
```typescript
new ValidationPipe({
  whitelist: true, // Strip undeclared properties
  forbidNonWhitelisted: true, // Throw error on extra properties
  transform: true, // Auto-transform to DTO instances
  disableErrorMessages: process.env.NODE_ENV === 'production',
})
```

### Sanitization Decorators

**Location**: `src/common/decorators/sanitize.decorator.ts`

Available decorators:
- `@Sanitize()` - Strips all HTML tags (XSS prevention)
- `@SanitizeHtml(allowedTags)` - Allows specific HTML tags
- `@Trim()` - Removes leading/trailing whitespace
- `@ToLowerCase()` - Converts to lowercase
- `@EscapeSql()` - Escapes SQL characters (defense in depth)
- `@SanitizePath()` - Removes path traversal attempts
- `@SanitizeUrl()` - Validates and sanitizes URLs

**Usage Example**:
```typescript
export class CreateItemDto {
  @IsString()
  @MaxLength(255)
  @Sanitize()
  name: string;

  @IsString()
  @MaxLength(5000)
  @SanitizeHtml(['b', 'i', 'p', 'br'])
  description: string;

  @IsUrl()
  @SanitizeUrl()
  websiteUrl: string;
}
```

---

## File Upload Security

### File Validation

**Location**: `src/common/validators/file-upload.validator.ts`

**Validation Checks**:
1. **File Size**: Enforces maximum file sizes
2. **MIME Type**: Validates file type headers
3. **File Extension**: Whitelists allowed extensions
4. **Filename**: Prevents path traversal attacks
5. **Content**: Scans for executable headers and scripts

**Presets** (`FileValidationPresets`):
- `IMAGE` - 5MB max, jpg/png/webp/gif
- `MODEL_3D` - 50MB max, glb/gltf
- `TEXTURE` - 10MB max, jpg/png/webp
- `PATTERN` - 5MB max, png/jpg/svg

**Usage Example**:
```typescript
@Post('upload')
@UseInterceptors(FileInterceptor('file'))
async uploadFile(
  @UploadedFile(new FileValidationPipe(FileValidationPresets.IMAGE))
  file: Express.Multer.File,
) {
  // File is validated before reaching this point
}
```

**Validation Pipe**: `src/common/pipes/file-validation.pipe.ts`

---

## CORS Configuration

**Location**: `src/config/security.config.ts`

**Default Configuration**:
```typescript
{
  origin: ['http://localhost:3000', 'http://localhost:3001'],
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  credentials: true,
  maxAge: 3600,
}
```

**Production Configuration**:
Set `CORS_ORIGINS` environment variable:
```env
CORS_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
```

**Security Considerations**:
- Never use `*` (wildcard) in production
- Specify exact origins
- Enable credentials only if needed
- Review allowed methods

---

## Security Headers

### Helmet Integration

**Location**: `src/main.ts` and `src/config/security.config.ts`

**Headers Applied**:
- `Content-Security-Policy` - Prevents XSS attacks
- `X-Content-Type-Options: nosniff` - Prevents MIME sniffing
- `X-Frame-Options: DENY` - Prevents clickjacking
- `Strict-Transport-Security` - Forces HTTPS (1 year)
- `X-XSS-Protection` - Browser XSS filter

**Configuration**:
```typescript
helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      // ... additional directives
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
})
```

---

## Environment Variables

### Security-Related Variables

**Required**:
```env
# JWT Configuration
JWT_SECRET=your-super-secret-key-change-in-production-min-32-chars
JWT_EXPIRATION=1d

# CORS Configuration
CORS_ORIGINS=http://localhost:3000,http://localhost:3001

# Node Environment
NODE_ENV=production
```

**Optional**:
```env
# Rate Limiting
THROTTLE_TTL=60000
THROTTLE_LIMIT=100

# File Upload
MAX_FILE_SIZE_IMAGE=5242880
MAX_FILE_SIZE_MODEL=52428800
```

**Best Practices**:
- Use a secrets manager in production (AWS Secrets Manager, Azure Key Vault)
- Never commit `.env` files to version control
- Rotate secrets regularly
- Use different secrets for each environment
- Use strong, random values (minimum 32 characters)

---

## Best Practices

### 1. Database Security

**✅ DO**:
- Use parameterized queries (TypeORM does this automatically)
- Enable SSL for database connections in production
- Use database user with minimal required permissions
- Regularly backup database
- Monitor for suspicious query patterns

**❌ DON'T**:
- Build queries with string concatenation
- Use root/admin database credentials
- Expose database errors to clients
- Store passwords in plaintext

### 2. Password Security

**✅ DO**:
- Use bcrypt/argon2 for password hashing
- Enforce strong password requirements
- Implement account lockout after failed attempts
- Use secure password reset mechanisms

**❌ DON'T**:
- Store passwords in plaintext
- Use weak hashing algorithms (MD5, SHA1)
- Email passwords to users
- Allow common/weak passwords

### 3. API Security

**✅ DO**:
- Use HTTPS in production
- Implement rate limiting
- Validate all inputs
- Sanitize all outputs
- Log security events
- Implement request signing for sensitive operations

**❌ DON'T**:
- Expose sensitive data in URLs
- Return detailed error messages in production
- Trust client-side validation
- Expose internal implementation details

### 4. File Upload Security

**✅ DO**:
- Validate file types and sizes
- Scan for malware
- Use CDN for serving files
- Generate random filenames
- Store files outside webroot
- Set proper file permissions

**❌ DON'T**:
- Trust file extensions
- Allow executable uploads
- Serve files directly from uploads folder
- Use user-provided filenames

---

## Security Checklist

### Pre-Production

- [ ] Change all default credentials
- [ ] Set strong JWT_SECRET (minimum 32 characters)
- [ ] Configure CORS with specific origins
- [ ] Enable HTTPS/TLS
- [ ] Set NODE_ENV=production
- [ ] Disable error stack traces
- [ ] Configure rate limiting
- [ ] Enable database SSL
- [ ] Review and harden CSP headers
- [ ] Implement logging and monitoring
- [ ] Set up WAF (Web Application Firewall)
- [ ] Configure backup strategy

### Runtime

- [ ] Monitor authentication failures
- [ ] Track rate limit violations
- [ ] Monitor file upload patterns
- [ ] Review access logs regularly
- [ ] Monitor for SQL injection attempts
- [ ] Track unusual traffic patterns
- [ ] Monitor resource usage

### Regular Maintenance

- [ ] Update dependencies monthly
- [ ] Rotate secrets quarterly
- [ ] Review user permissions
- [ ] Audit access logs
- [ ] Test backup restoration
- [ ] Review security configurations
- [ ] Conduct security audits
- [ ] Penetration testing (annually)

---

## Reporting Security Issues

If you discover a security vulnerability, please email:
**security@yourdomain.com**

**DO NOT** create public GitHub issues for security vulnerabilities.

Include:
- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if available)

We aim to respond within 48 hours and provide a fix within 7 days for critical issues.

---

## Additional Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [NestJS Security Best Practices](https://docs.nestjs.com/security/helmet)
- [Node.js Security Checklist](https://nodejs.org/en/docs/guides/security/)
- [TypeORM Security](https://typeorm.io/security)

---

**Last Updated**: 2025-11-18
**Version**: 1.0.0

# Infrastructure Specification: Authentication & Authorization

## Document Overview

**Version**: 1.0
**Last Updated**: November 2025
**Document Type**: Infrastructure Specification
**Status**: Draft
**Spec ID**: spec-infra-02

---

## 1. Executive Summary

This specification defines the authentication and authorization infrastructure for the Fashion Wallet backend. It covers user authentication mechanisms, role-based access control (RBAC), session management, API security, and third-party integrations. The system must be secure, scalable, and provide seamless user experience across all services.

---

## 2. Authentication Architecture Overview

### 2.1 Authentication Strategies

```yaml
Primary Authentication:
  - Email/Password (JWT-based)
  - Multi-Factor Authentication (MFA)
  - OAuth2 Social Login
  - API Keys (for integrations)
  - Service-to-Service Authentication

Secondary Authentication:
  - Password Recovery
  - Email Verification
  - Phone Verification (future)
  - Biometric (mobile apps, future)

Session Management:
  - Stateless JWT tokens
  - Refresh token rotation
  - Redis-based session store
  - Device tracking
```

---

## 3. User Authentication

### 3.1 Registration

#### 3.1.1 Registration Flow

```typescript
interface RegistrationRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  acceptedTerms: boolean;
  acceptedPrivacy: boolean;
  marketingConsent?: boolean;
}

interface RegistrationResponse {
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    status: 'pending_verification' | 'active';
  };
  verification: {
    required: boolean;
    method: 'email' | 'sms';
    expiresIn: number;            // Seconds
  };
}

// Registration validation rules
const validationRules = {
  email: {
    pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    maxLength: 255,
    unique: true,
    caseSensitive: false          // Store lowercase
  },

  password: {
    minLength: 8,
    maxLength: 128,
    requireUppercase: true,
    requireLowercase: true,
    requireNumber: true,
    requireSpecialChar: true,
    preventCommon: true,          // Check against common passwords
    preventUserInfo: true         // No email, name in password
  },

  name: {
    minLength: 1,
    maxLength: 100,
    pattern: /^[a-zA-Z\s\-']+$/   // Letters, spaces, hyphens, apostrophes
  }
};
```

#### 3.1.2 Email Verification

```typescript
interface EmailVerification {
  /**
   * Send verification email
   */
  sendVerificationEmail(params: {
    userId: string;
    email: string;
  }): Promise<{
    sent: boolean;
    expiresAt: Date;
    resendAvailableAt: Date;      // Rate limiting
  }>;

  /**
   * Verify email token
   */
  verifyEmail(params: {
    token: string;
  }): Promise<{
    verified: boolean;
    userId: string;
    error?: string;
  }>;

  /**
   * Resend verification email
   */
  resendVerification(params: {
    email: string;
  }): Promise<{
    sent: boolean;
    retryAfter?: number;          // Seconds to wait
  }>;
}

// Verification token structure
interface VerificationToken {
  type: 'email_verification';
  userId: string;
  email: string;
  token: string;                  // Secure random token (32 bytes)
  createdAt: Date;
  expiresAt: Date;                // 24 hours from creation
  attempts: number;               // Max 5 attempts
}
```

### 3.2 Login

#### 3.2.1 Login Flow

```typescript
interface LoginRequest {
  email: string;
  password: string;
  rememberMe?: boolean;
  deviceInfo?: {
    deviceId?: string;
    deviceName?: string;
    userAgent: string;
    ipAddress: string;
  };
}

interface LoginResponse {
  user: UserProfile;
  tokens: {
    accessToken: string;
    refreshToken: string;
    expiresIn: number;            // Access token TTL in seconds
    tokenType: 'Bearer';
  };
  mfaRequired?: {
    methods: ('totp' | 'sms' | 'email')[];
    sessionToken: string;         // Temporary token for MFA
  };
}

// Login rate limiting
const loginRateLimits = {
  perEmail: {
    max: 5,
    window: 900,                  // 15 minutes
    blockDuration: 3600           // 1 hour
  },
  perIP: {
    max: 20,
    window: 900,
    blockDuration: 3600
  }
};
```

#### 3.2.2 Password Hashing

```typescript
interface PasswordHashingService {
  /**
   * Hash password using bcrypt
   */
  hash(password: string): Promise<string>;

  /**
   * Verify password against hash
   */
  verify(password: string, hash: string): Promise<boolean>;

  /**
   * Check if hash needs rehashing (algorithm upgrade)
   */
  needsRehash(hash: string): boolean;
}

// Configuration
const hashingConfig = {
  algorithm: 'bcrypt',
  saltRounds: 12,                 // Adjust based on performance
  pepperKey: process.env.PASSWORD_PEPPER, // Additional secret
  maxLength: 72                   // bcrypt limit
};
```

### 3.3 Multi-Factor Authentication (MFA)

#### 3.3.1 TOTP (Time-based One-Time Password)

```typescript
interface TOTPService {
  /**
   * Generate TOTP secret for user
   */
  generateSecret(userId: string): Promise<{
    secret: string;
    qrCode: string;               // Data URL for QR code
    backupCodes: string[];        // 10 single-use codes
  }>;

  /**
   * Verify TOTP code
   */
  verifyCode(params: {
    userId: string;
    code: string;
    window?: number;              // Time window (default: 1)
  }): Promise<boolean>;

  /**
   * Enable MFA for user
   */
  enableMFA(params: {
    userId: string;
    code: string;                 // Verify code before enabling
  }): Promise<boolean>;

  /**
   * Disable MFA for user
   */
  disableMFA(params: {
    userId: string;
    password: string;             // Require password
    code?: string;                // Or backup code
  }): Promise<boolean>;

  /**
   * Use backup code
   */
  useBackupCode(params: {
    userId: string;
    code: string;
  }): Promise<boolean>;
}
```

#### 3.3.2 SMS/Email MFA (Fallback)

```typescript
interface FallbackMFAService {
  /**
   * Send verification code via SMS/Email
   */
  sendCode(params: {
    userId: string;
    method: 'sms' | 'email';
  }): Promise<{
    sent: boolean;
    expiresIn: number;
    maskedDestination: string;    // e.g., '***@gmail.com'
  }>;

  /**
   * Verify code
   */
  verifyCode(params: {
    userId: string;
    code: string;
  }): Promise<boolean>;
}

// Code configuration
const mfaCodeConfig = {
  length: 6,
  expiresIn: 300,                 // 5 minutes
  maxAttempts: 3,
  rateLimitPerUser: {
    max: 3,
    window: 3600                  // 1 hour
  }
};
```

### 3.4 Password Recovery

#### 3.4.1 Reset Password Flow

```typescript
interface PasswordResetService {
  /**
   * Request password reset
   */
  requestReset(params: {
    email: string;
    ipAddress: string;
  }): Promise<{
    sent: boolean;
    email: string;                // Always return success (security)
  }>;

  /**
   * Verify reset token
   */
  verifyResetToken(token: string): Promise<{
    valid: boolean;
    email?: string;
    expiresAt?: Date;
  }>;

  /**
   * Reset password
   */
  resetPassword(params: {
    token: string;
    newPassword: string;
  }): Promise<{
    success: boolean;
    error?: string;
  }>;

  /**
   * Change password (authenticated user)
   */
  changePassword(params: {
    userId: string;
    currentPassword: string;
    newPassword: string;
  }): Promise<{
    success: boolean;
    error?: string;
  }>;
}

// Reset token structure
interface ResetToken {
  type: 'password_reset';
  userId: string;
  email: string;
  token: string;                  // Secure random token
  createdAt: Date;
  expiresAt: Date;                // 1 hour from creation
  used: boolean;
  ipAddress: string;
}
```

### 3.5 Social Authentication (OAuth2)

#### 3.5.1 OAuth Providers

```typescript
interface OAuthConfig {
  providers: {
    google: {
      enabled: boolean;
      clientId: string;
      clientSecret: string;
      scope: ['email', 'profile'];
      callbackUrl: string;
    };
    facebook: {
      enabled: boolean;
      clientId: string;
      clientSecret: string;
      scope: ['email', 'public_profile'];
      callbackUrl: string;
    };
    apple: {
      enabled: boolean;
      clientId: string;
      teamId: string;
      keyId: string;
      privateKey: string;
      scope: ['email', 'name'];
      callbackUrl: string;
    };
  };
}

interface OAuthService {
  /**
   * Initiate OAuth flow
   */
  initiateOAuth(provider: 'google' | 'facebook' | 'apple'): Promise<{
    authUrl: string;
    state: string;                // CSRF token
  }>;

  /**
   * Handle OAuth callback
   */
  handleCallback(params: {
    provider: string;
    code: string;
    state: string;
  }): Promise<LoginResponse | {
    needsRegistration: true;
    profile: {
      email: string;
      firstName?: string;
      lastName?: string;
      avatar?: string;
    };
    tempToken: string;
  }>;

  /**
   * Link OAuth account to existing user
   */
  linkAccount(params: {
    userId: string;
    provider: string;
    code: string;
  }): Promise<{
    linked: boolean;
    error?: string;
  }>;

  /**
   * Unlink OAuth account
   */
  unlinkAccount(params: {
    userId: string;
    provider: string;
  }): Promise<boolean>;
}
```

---

## 4. JWT Token Management

### 4.1 Token Structure

#### 4.1.1 Access Token

```typescript
interface AccessTokenPayload {
  // Standard claims
  iss: string;                    // Issuer (e.g., 'fashion-wallet')
  sub: string;                    // Subject (user ID)
  aud: string;                    // Audience (e.g., 'api')
  exp: number;                    // Expiration (Unix timestamp)
  iat: number;                    // Issued at
  jti: string;                    // JWT ID (unique)

  // Custom claims
  email: string;
  role: string;
  permissions: string[];
  sessionId: string;
  deviceId?: string;

  // Metadata
  type: 'access';
}

interface RefreshTokenPayload {
  iss: string;
  sub: string;
  exp: number;
  iat: number;
  jti: string;

  sessionId: string;
  deviceId?: string;
  tokenFamily: string;            // For rotation detection

  type: 'refresh';
}
```

#### 4.1.2 Token Configuration

```typescript
const tokenConfig = {
  accessToken: {
    secret: process.env.JWT_ACCESS_SECRET,
    expiresIn: '15m',             // 15 minutes
    algorithm: 'HS256',
    issuer: 'fashion-wallet',
    audience: 'api'
  },

  refreshToken: {
    secret: process.env.JWT_REFRESH_SECRET,
    expiresIn: '7d',              // 7 days
    extendedExpiresIn: '30d',     // With 'rememberMe'
    algorithm: 'HS256',
    issuer: 'fashion-wallet',
    audience: 'refresh'
  },

  // Token size limits
  maxPayloadSize: 1024            // bytes
};
```

### 4.2 Token Operations

```typescript
interface TokenService {
  /**
   * Generate access token
   */
  generateAccessToken(user: UserPayload): Promise<string>;

  /**
   * Generate refresh token
   */
  generateRefreshToken(params: {
    userId: string;
    sessionId: string;
    deviceId?: string;
    rememberMe?: boolean;
  }): Promise<string>;

  /**
   * Verify token
   */
  verifyToken<T = any>(token: string, type: 'access' | 'refresh'): Promise<T>;

  /**
   * Refresh access token
   */
  refreshAccessToken(refreshToken: string): Promise<{
    accessToken: string;
    refreshToken: string;         // New refresh token (rotation)
    expiresIn: number;
  }>;

  /**
   * Revoke token
   */
  revokeToken(token: string): Promise<void>;

  /**
   * Revoke all user tokens
   */
  revokeAllUserTokens(userId: string): Promise<void>;

  /**
   * Decode token without verification
   */
  decodeToken<T = any>(token: string): T | null;
}
```

### 4.3 Token Rotation

```typescript
/**
 * Automatic refresh token rotation for security
 */
interface TokenRotation {
  strategy: 'reuse_detection';

  // Store token families in Redis
  storage: {
    key: `refresh_token:${userId}:${tokenFamily}`;
    value: {
      tokenId: string;
      issued: Date;
      used: boolean;
      deviceId: string;
    };
    ttl: number;                  // Match token expiration
  };

  // Rotation logic
  rotate: {
    // On refresh, issue new refresh token
    onRefresh: true;

    // Invalidate old refresh token
    invalidateOld: true;

    // Detect reuse (possible token theft)
    detectReuse: {
      enabled: true;
      onDetection: 'revoke_family';  // Revoke all tokens in family
    };
  };
}
```

### 4.4 Token Blacklist

```typescript
interface TokenBlacklistService {
  /**
   * Add token to blacklist
   */
  blacklistToken(params: {
    token: string;
    reason: 'logout' | 'revoked' | 'compromised';
    expiresAt: Date;
  }): Promise<void>;

  /**
   * Check if token is blacklisted
   */
  isBlacklisted(token: string): Promise<boolean>;

  /**
   * Cleanup expired tokens
   */
  cleanupExpired(): Promise<number>;
}

// Redis storage for blacklist
const blacklistStorage = {
  key: `blacklist:${tokenId}`,
  value: {
    reason: string;
    blacklistedAt: Date;
  },
  ttl: number                     // Time until token expiry
};
```

---

## 5. Authorization (RBAC)

### 5.1 Roles and Permissions

#### 5.1.1 Role Definitions

```typescript
enum Role {
  USER = 'user',
  PREMIUM = 'premium',
  DESIGNER = 'designer',
  BRAND = 'brand',
  MODERATOR = 'moderator',
  ADMIN = 'admin',
  SUPER_ADMIN = 'super_admin'
}

interface RoleDefinition {
  name: Role;
  description: string;
  permissions: Permission[];
  inherits?: Role[];              // Role inheritance
  default?: boolean;              // Auto-assign on registration
}

const roleDefinitions: RoleDefinition[] = [
  {
    name: Role.USER,
    description: 'Regular user',
    permissions: [
      Permission.AVATAR_CREATE,
      Permission.AVATAR_READ_OWN,
      Permission.AVATAR_UPDATE_OWN,
      Permission.AVATAR_DELETE_OWN,
      Permission.DESIGN_CREATE,
      Permission.DESIGN_READ_OWN,
      Permission.DESIGN_UPDATE_OWN,
      Permission.DESIGN_DELETE_OWN,
      Permission.CATALOG_READ
    ],
    default: true
  },
  {
    name: Role.PREMIUM,
    description: 'Premium subscriber',
    inherits: [Role.USER],
    permissions: [
      Permission.DESIGN_EXPORT_HD,
      Permission.DESIGN_EXPORT_3D,
      Permission.CATALOG_READ_PREMIUM,
      Permission.AVATAR_CREATE_MULTIPLE
    ]
  },
  {
    name: Role.ADMIN,
    description: 'System administrator',
    permissions: [
      Permission.ALL
    ]
  }
];
```

#### 5.1.2 Permission System

```typescript
enum Permission {
  // Avatar permissions
  AVATAR_CREATE = 'avatar:create',
  AVATAR_READ_OWN = 'avatar:read:own',
  AVATAR_READ_ANY = 'avatar:read:any',
  AVATAR_UPDATE_OWN = 'avatar:update:own',
  AVATAR_UPDATE_ANY = 'avatar:update:any',
  AVATAR_DELETE_OWN = 'avatar:delete:own',
  AVATAR_DELETE_ANY = 'avatar:delete:any',

  // Design permissions
  DESIGN_CREATE = 'design:create',
  DESIGN_READ_OWN = 'design:read:own',
  DESIGN_READ_ANY = 'design:read:any',
  DESIGN_READ_PUBLIC = 'design:read:public',
  DESIGN_UPDATE_OWN = 'design:update:own',
  DESIGN_UPDATE_ANY = 'design:update:any',
  DESIGN_DELETE_OWN = 'design:delete:own',
  DESIGN_DELETE_ANY = 'design:delete:any',
  DESIGN_PUBLISH = 'design:publish',
  DESIGN_EXPORT_HD = 'design:export:hd',
  DESIGN_EXPORT_3D = 'design:export:3d',

  // Catalog permissions
  CATALOG_READ = 'catalog:read',
  CATALOG_READ_PREMIUM = 'catalog:read:premium',
  CATALOG_CREATE = 'catalog:create',
  CATALOG_UPDATE = 'catalog:update',
  CATALOG_DELETE = 'catalog:delete',

  // User management
  USER_READ_OWN = 'user:read:own',
  USER_READ_ANY = 'user:read:any',
  USER_UPDATE_OWN = 'user:update:own',
  USER_UPDATE_ANY = 'user:update:any',
  USER_DELETE_OWN = 'user:delete:own',
  USER_DELETE_ANY = 'user:delete:any',

  // System permissions
  SYSTEM_ADMIN = 'system:admin',
  SYSTEM_AUDIT = 'system:audit',

  // Wildcard
  ALL = '*'
}

/**
 * Permission format: resource:action:scope
 * - resource: avatar, design, catalog, user, system
 * - action: create, read, update, delete, publish, export
 * - scope: own, any, public, premium (optional)
 */
```

### 5.2 Authorization Service

```typescript
interface AuthorizationService {
  /**
   * Check if user has permission
   */
  hasPermission(params: {
    userId: string;
    permission: Permission | string;
    resource?: {
      type: string;
      id: string;
      ownerId?: string;
    };
  }): Promise<boolean>;

  /**
   * Check if user has role
   */
  hasRole(userId: string, role: Role | Role[]): Promise<boolean>;

  /**
   * Get user permissions
   */
  getUserPermissions(userId: string): Promise<Permission[]>;

  /**
   * Assign role to user
   */
  assignRole(params: {
    userId: string;
    role: Role;
    assignedBy: string;
    expiresAt?: Date;
  }): Promise<void>;

  /**
   * Remove role from user
   */
  removeRole(params: {
    userId: string;
    role: Role;
    removedBy: string;
  }): Promise<void>;

  /**
   * Create custom permission
   */
  createPermission(params: {
    userId: string;
    permission: string;
    resource?: string;
    expiresAt?: Date;
  }): Promise<void>;
}
```

### 5.3 Resource-Based Authorization

```typescript
/**
 * Check ownership and sharing permissions
 */
interface ResourceAuthService {
  /**
   * Check if user can access resource
   */
  canAccess(params: {
    userId: string;
    resource: {
      type: 'avatar' | 'design' | 'catalog';
      id: string;
    };
    action: 'read' | 'update' | 'delete';
  }): Promise<{
    allowed: boolean;
    reason?: string;
  }>;

  /**
   * Share resource with user
   */
  shareResource(params: {
    resourceType: string;
    resourceId: string;
    ownerId: string;
    sharedWithUserId: string;
    permissions: ('read' | 'write')[];
    expiresAt?: Date;
  }): Promise<void>;

  /**
   * Revoke resource access
   */
  revokeAccess(params: {
    resourceType: string;
    resourceId: string;
    userId: string;
  }): Promise<void>;

  /**
   * Get resource permissions for user
   */
  getResourcePermissions(params: {
    userId: string;
    resourceType: string;
    resourceId: string;
  }): Promise<{
    owner: boolean;
    permissions: string[];
    sharedBy?: string;
    expiresAt?: Date;
  }>;
}
```

---

## 6. API Security

### 6.1 API Keys

```typescript
interface APIKeyService {
  /**
   * Generate API key for user
   */
  generateAPIKey(params: {
    userId: string;
    name: string;
    scopes: Permission[];
    expiresAt?: Date;
    ipWhitelist?: string[];
  }): Promise<{
    key: string;                  // Show only once
    keyId: string;
    prefix: string;               // First 8 chars (for identification)
  }>;

  /**
   * Verify API key
   */
  verifyAPIKey(key: string): Promise<{
    valid: boolean;
    userId?: string;
    scopes?: Permission[];
    rateLimit?: {
      limit: number;
      remaining: number;
      reset: Date;
    };
  }>;

  /**
   * Revoke API key
   */
  revokeAPIKey(params: {
    userId: string;
    keyId: string;
  }): Promise<void>;

  /**
   * List user API keys
   */
  listAPIKeys(userId: string): Promise<Array<{
    keyId: string;
    prefix: string;
    name: string;
    scopes: Permission[];
    createdAt: Date;
    lastUsedAt?: Date;
    expiresAt?: Date;
  }>>;
}

// API key format
const apiKeyFormat = {
  prefix: 'fw_live_',             // Production
  prefixTest: 'fw_test_',         // Testing
  length: 64,                     // Characters
  encoding: 'base62'              // alphanumeric
};
```

### 6.2 Rate Limiting

```typescript
interface RateLimitConfig {
  strategies: {
    // Per user ID
    perUser: {
      anonymous: {
        max: 100,
        window: 900               // 15 minutes
      },
      authenticated: {
        max: 1000,
        window: 900
      },
      premium: {
        max: 5000,
        window: 900
      }
    };

    // Per IP address
    perIP: {
      max: 500,
      window: 900
    };

    // Per API endpoint
    perEndpoint: {
      '/auth/login': {
        max: 5,
        window: 900
      },
      '/auth/register': {
        max: 3,
        window: 3600
      },
      '/designs/export': {
        max: 10,
        window: 3600
      }
    };

    // Per API key
    perAPIKey: {
      default: {
        max: 10000,
        window: 3600
      }
    };
  };

  // Headers
  headers: {
    limit: 'X-RateLimit-Limit',
    remaining: 'X-RateLimit-Remaining',
    reset: 'X-RateLimit-Reset',
    retryAfter: 'Retry-After'
  };

  // Response on limit exceeded
  response: {
    statusCode: 429,
    message: 'Too many requests, please try again later.'
  };
}
```

### 6.3 CORS Configuration

```typescript
interface CORSConfig {
  // Allowed origins
  origins: string[] | ((origin: string) => boolean);

  // Allowed methods
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'];

  // Allowed headers
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'Accept',
    'Origin'
  ];

  // Exposed headers
  exposedHeaders: [
    'X-RateLimit-Limit',
    'X-RateLimit-Remaining',
    'X-RateLimit-Reset'
  ];

  // Credentials
  credentials: boolean;

  // Preflight cache
  maxAge: number;                 // 24 hours

  // Environment-specific
  development: {
    origins: ['http://localhost:3000', 'http://localhost:3001'];
  };

  production: {
    origins: ['https://fashionwallet.com', 'https://app.fashionwallet.com'];
  };
}
```

---

## 7. Session Management

### 7.1 Session Storage

```typescript
interface SessionData {
  sessionId: string;
  userId: string;
  deviceId?: string;
  deviceInfo?: {
    userAgent: string;
    browser: string;
    os: string;
    device: string;
  };
  ipAddress: string;
  location?: {
    country: string;
    city: string;
  };
  createdAt: Date;
  lastActivityAt: Date;
  expiresAt: Date;
  tokenFamily: string;            // For refresh token rotation
}

// Redis storage
const sessionStorage = {
  key: `session:${sessionId}`,
  value: SessionData,
  ttl: 604800                     // 7 days (match refresh token)
};
```

### 7.2 Session Service

```typescript
interface SessionService {
  /**
   * Create new session
   */
  createSession(params: {
    userId: string;
    deviceInfo?: DeviceInfo;
    ipAddress: string;
    rememberMe?: boolean;
  }): Promise<{
    sessionId: string;
    expiresAt: Date;
  }>;

  /**
   * Get session
   */
  getSession(sessionId: string): Promise<SessionData | null>;

  /**
   * Update session activity
   */
  updateActivity(sessionId: string): Promise<void>;

  /**
   * Terminate session
   */
  terminateSession(sessionId: string): Promise<void>;

  /**
   * Terminate all user sessions
   */
  terminateAllUserSessions(userId: string): Promise<number>;

  /**
   * List active sessions
   */
  listActiveSessions(userId: string): Promise<SessionData[]>;

  /**
   * Cleanup expired sessions
   */
  cleanupExpiredSessions(): Promise<number>;
}
```

### 7.3 Device Tracking

```typescript
interface DeviceTrackingService {
  /**
   * Register device
   */
  registerDevice(params: {
    userId: string;
    deviceInfo: DeviceInfo;
    ipAddress: string;
  }): Promise<{
    deviceId: string;
    trusted: boolean;
  }>;

  /**
   * Check if device is trusted
   */
  isDeviceTrusted(params: {
    userId: string;
    deviceId: string;
  }): Promise<boolean>;

  /**
   * Trust device
   */
  trustDevice(params: {
    userId: string;
    deviceId: string;
  }): Promise<void>;

  /**
   * Revoke device trust
   */
  revokeDeviceTrust(params: {
    userId: string;
    deviceId: string;
  }): Promise<void>;

  /**
   * List user devices
   */
  listDevices(userId: string): Promise<Array<{
    deviceId: string;
    deviceName: string;
    trusted: boolean;
    lastUsed: Date;
    location?: string;
  }>>;
}
```

---

## 8. Security Features

### 8.1 Account Lockout

```typescript
interface AccountLockoutService {
  /**
   * Record failed login attempt
   */
  recordFailedAttempt(params: {
    email: string;
    ipAddress: string;
  }): Promise<{
    attemptsRemaining: number;
    lockedUntil?: Date;
  }>;

  /**
   * Check if account is locked
   */
  isLocked(email: string): Promise<{
    locked: boolean;
    lockedUntil?: Date;
    reason?: string;
  }>;

  /**
   * Unlock account
   */
  unlockAccount(params: {
    email: string;
    reason: string;
    unlockedBy: string;
  }): Promise<void>;

  /**
   * Lock account (manual)
   */
  lockAccount(params: {
    email: string;
    reason: string;
    lockedBy: string;
    duration?: number;            // Seconds, null = indefinite
  }): Promise<void>;
}

// Lockout configuration
const lockoutConfig = {
  maxAttempts: 5,
  windowSeconds: 900,             // 15 minutes
  lockDuration: 3600,             // 1 hour
  permanentLockAfter: 10          // Permanent after 10 failed unlocks
};
```

### 8.2 Suspicious Activity Detection

```typescript
interface SuspiciousActivityService {
  /**
   * Detect suspicious login
   */
  detectSuspiciousLogin(params: {
    userId: string;
    ipAddress: string;
    deviceInfo: DeviceInfo;
    location?: GeoLocation;
  }): Promise<{
    suspicious: boolean;
    reasons: string[];
    riskScore: number;            // 0-100
    requireAdditionalVerification: boolean;
  }>;

  /**
   * Record security event
   */
  recordSecurityEvent(params: {
    userId: string;
    eventType: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    metadata: Record<string, any>;
  }): Promise<void>;

  /**
   * Get security events
   */
  getSecurityEvents(params: {
    userId: string;
    startDate?: Date;
    endDate?: Date;
    severity?: string[];
  }): Promise<SecurityEvent[]>;
}

// Detection rules
const suspiciousActivityRules = {
  newDevice: { score: 30, requireVerification: true },
  newLocation: { score: 20, requireVerification: false },
  newCountry: { score: 40, requireVerification: true },
  impossibleTravel: { score: 80, requireVerification: true },
  multipleFailedLogins: { score: 50, requireVerification: true },
  unusualTime: { score: 10, requireVerification: false }
};
```

### 8.3 Audit Logging

```typescript
interface AuditLog {
  id: string;
  userId: string;
  action: string;
  resource: {
    type: string;
    id: string;
  };
  result: 'success' | 'failure';
  metadata: {
    ipAddress: string;
    userAgent: string;
    deviceId?: string;
    changes?: Record<string, any>;
  };
  timestamp: Date;
}

interface AuditService {
  /**
   * Log authentication event
   */
  logAuth(params: {
    userId: string;
    action: 'login' | 'logout' | 'register' | 'password_reset';
    result: 'success' | 'failure';
    metadata: Record<string, any>;
  }): Promise<void>;

  /**
   * Log authorization event
   */
  logAuthz(params: {
    userId: string;
    action: string;
    resource: { type: string; id: string };
    result: 'allowed' | 'denied';
    reason?: string;
  }): Promise<void>;

  /**
   * Query audit logs
   */
  queryLogs(params: {
    userId?: string;
    action?: string;
    startDate: Date;
    endDate: Date;
    limit?: number;
  }): Promise<AuditLog[]>;
}
```

---

## 9. Implementation Requirements

### 9.1 Auth Module Structure

```typescript
@Module({
  imports: [
    JwtModule.register({
      secret: process.env.JWT_ACCESS_SECRET,
      signOptions: { expiresIn: '15m' }
    }),
    PassportModule.register({ defaultStrategy: 'jwt' })
  ],
  providers: [
    AuthService,
    JwtStrategy,
    LocalStrategy,
    GoogleStrategy,
    TokenService,
    PasswordService,
    MFAService,
    AuthorizationService,
    SessionService,
    AuditService
  ],
  exports: [
    AuthService,
    TokenService,
    AuthorizationService
  ]
})
export class AuthModule {}
```

### 9.2 Middleware and Guards

```typescript
// JWT Authentication Guard
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  canActivate(context: ExecutionContext): boolean | Promise<boolean> {
    // Extract token
    // Verify token
    // Check blacklist
    // Attach user to request
  }
}

// Permission Guard
@Injectable()
export class PermissionGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean | Promise<boolean> {
    // Get required permission from metadata
    // Check user permissions
    // Check resource ownership
  }
}

// Rate Limit Guard
@Injectable()
export class RateLimitGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean | Promise<boolean> {
    // Get rate limit configuration
    // Check Redis for current count
    // Increment counter
    // Return true/false
  }
}
```

---

## 10. Testing Requirements

```yaml
Unit Tests:
  - Password hashing and verification
  - Token generation and verification
  - Permission checking logic
  - Rate limiting logic
  - MFA code generation and verification

Integration Tests:
  - Login flow
  - Registration flow
  - Password reset flow
  - OAuth flow
  - Token refresh flow
  - MFA flow
  - Session management

Security Tests:
  - Brute force protection
  - Token theft detection
  - CSRF protection
  - XSS prevention
  - SQL injection prevention
  - Password strength enforcement
```

---

## 11. Success Criteria

```yaml
Acceptance Criteria:
  - User can register and verify email
  - User can login with email/password
  - User can login with OAuth (Google, Facebook)
  - MFA works correctly (TOTP)
  - Password reset flow works
  - JWT tokens are properly validated
  - Rate limiting prevents abuse
  - RBAC enforces permissions
  - Audit logs capture all auth events
  - Session management works across devices
  - Security features detect and prevent attacks
```

---

## Document Metadata

**Version**: 1.0
**Author**: Fashion Wallet Infrastructure Team
**Status**: Draft
**Review Cycle**: Bi-weekly
**Next Review**: December 2025
**Dependencies**: spec-infra-00 (Database)

---

**End of Authentication & Authorization Specification**

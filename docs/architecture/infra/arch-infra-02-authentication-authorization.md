# Architecture Document: Authentication & Authorization

## Document Overview

**Version**: 1.0
**Last Updated**: November 2025
**Document Type**: Architecture Document
**Status**: Draft
**Arch ID**: arch-infra-02
**Related Spec**: spec-infra-02

---

## 1. Executive Summary

This architecture document describes the authentication and authorization implementation for the Fashion Wallet backend, covering user authentication, JWT token management, role-based access control (RBAC), and security measures.

---

## 2. Architectural Overview

### 2.1 Authentication Flow

```
Client → API Gateway → Auth Middleware → Protected Route
  ↓          ↓              ↓                  ↓
Login → Validate → Generate JWT → Access Resource
        Credentials
```

### 2.2 Component Structure

```
src/infrastructure/auth/
├── auth.module.ts
├── strategies/
│   ├── jwt.strategy.ts
│   ├── local.strategy.ts
│   ├── google.strategy.ts
│   └── facebook.strategy.ts
├── services/
│   ├── auth.service.ts
│   ├── token.service.ts
│   ├── password.service.ts
│   ├── mfa.service.ts
│   ├── oauth.service.ts
│   └── session.service.ts
├── guards/
│   ├── jwt-auth.guard.ts
│   ├── permission.guard.ts
│   └── rate-limit.guard.ts
├── decorators/
│   ├── current-user.decorator.ts
│   ├── require-permissions.decorator.ts
│   └── public.decorator.ts
├── entities/
│   ├── user.entity.ts
│   ├── session.entity.ts
│   └── permission.entity.ts
└── interfaces/
    ├── auth.interface.ts
    └── jwt-payload.interface.ts
```

---

## 3. Authentication Service

### 3.1 Core Authentication

```typescript
@Injectable()
export class AuthService {
  constructor(
    private userRepository: UserRepository,
    private tokenService: TokenService,
    private passwordService: PasswordService,
    private sessionService: SessionService,
    private mfaService: MFAService
  ) {}

  /**
   * User login with email/password
   */
  async login(params: LoginDto): Promise<LoginResponse> {
    // 1. Validate credentials
    const user = await this.validateCredentials(
      params.email,
      params.password
    );

    // 2. Check MFA requirement
    if (user.mfaEnabled) {
      const sessionToken = await this.tokenService.generateMFASessionToken(
        user.id
      );
      return {
        mfaRequired: true,
        sessionToken,
        methods: user.mfaMethods
      };
    }

    // 3. Create session
    const session = await this.sessionService.createSession({
      userId: user.id,
      deviceInfo: params.deviceInfo,
      ipAddress: params.ipAddress
    });

    // 4. Generate tokens
    const tokens = await this.tokenService.generateTokenPair({
      userId: user.id,
      email: user.email,
      role: user.role,
      sessionId: session.id,
      rememberMe: params.rememberMe
    });

    return {
      user: this.sanitizeUser(user),
      tokens,
      session
    };
  }

  /**
   * Validate user credentials
   */
  private async validateCredentials(
    email: string,
    password: string
  ): Promise<User> {
    const user = await this.userRepository.findByEmail(email);
    if (!user) {
      throw new UnauthorizedError('Invalid credentials');
    }

    const isValid = await this.passwordService.verify(
      password,
      user.passwordHash
    );
    if (!isValid) {
      throw new UnauthorizedError('Invalid credentials');
    }

    if (user.status !== 'active') {
      throw new UnauthorizedError('Account is not active');
    }

    return user;
  }

  /**
   * Register new user
   */
  async register(params: RegisterDto): Promise<User> {
    // 1. Check if user exists
    const existing = await this.userRepository.findByEmail(params.email);
    if (existing) {
      throw new ConflictError('Email already registered');
    }

    // 2. Hash password
    const passwordHash = await this.passwordService.hash(params.password);

    // 3. Create user
    const user = await this.userRepository.create({
      email: params.email.toLowerCase(),
      passwordHash,
      firstName: params.firstName,
      lastName: params.lastName,
      role: 'user',
      status: 'pending_verification'
    });

    // 4. Send verification email
    await this.sendVerificationEmail(user);

    return this.sanitizeUser(user);
  }
}
```

---

## 4. Token Management

### 4.1 JWT Token Service

```typescript
@Injectable()
export class TokenService {
  constructor(
    private jwtService: JwtService,
    private cacheService: CacheService,
    private configService: ConfigService
  ) {}

  /**
   * Generate access and refresh tokens
   */
  async generateTokenPair(payload: TokenPayload): Promise<TokenPair> {
    const accessToken = await this.generateAccessToken(payload);
    const refreshToken = await this.generateRefreshToken(payload);

    // Store refresh token family for rotation detection
    await this.storeTokenFamily({
      userId: payload.userId,
      sessionId: payload.sessionId,
      tokenFamily: payload.tokenFamily || this.generateTokenFamily(),
      refreshToken
    });

    return {
      accessToken,
      refreshToken,
      expiresIn: this.configService.get('jwt.accessTokenExpiry'),
      tokenType: 'Bearer'
    };
  }

  /**
   * Generate access token
   */
  private async generateAccessToken(payload: TokenPayload): Promise<string> {
    const accessPayload: AccessTokenPayload = {
      sub: payload.userId,
      email: payload.email,
      role: payload.role,
      permissions: payload.permissions || [],
      sessionId: payload.sessionId,
      type: 'access',
      iss: 'fashion-wallet',
      aud: 'api'
    };

    return this.jwtService.signAsync(accessPayload, {
      secret: this.configService.get('jwt.accessSecret'),
      expiresIn: this.configService.get('jwt.accessTokenExpiry') // 15m
    });
  }

  /**
   * Generate refresh token
   */
  private async generateRefreshToken(payload: TokenPayload): Promise<string> {
    const expiresIn = payload.rememberMe
      ? this.configService.get('jwt.refreshTokenExpiryExtended') // 30d
      : this.configService.get('jwt.refreshTokenExpiry'); // 7d

    const refreshPayload: RefreshTokenPayload = {
      sub: payload.userId,
      sessionId: payload.sessionId,
      tokenFamily: payload.tokenFamily || this.generateTokenFamily(),
      type: 'refresh',
      iss: 'fashion-wallet',
      aud: 'refresh'
    };

    return this.jwtService.signAsync(refreshPayload, {
      secret: this.configService.get('jwt.refreshSecret'),
      expiresIn
    });
  }

  /**
   * Refresh access token
   */
  async refreshAccessToken(refreshToken: string): Promise<TokenPair> {
    // 1. Verify refresh token
    const payload = await this.verifyRefreshToken(refreshToken);

    // 2. Check if token family is valid (detect reuse)
    const isValid = await this.validateTokenFamily({
      userId: payload.sub,
      sessionId: payload.sessionId,
      tokenFamily: payload.tokenFamily
    });

    if (!isValid) {
      // Possible token theft - revoke all tokens
      await this.revokeAllUserTokens(payload.sub);
      throw new UnauthorizedError('Invalid refresh token');
    }

    // 3. Get user details
    const user = await this.userRepository.findById(payload.sub);

    // 4. Generate new token pair (rotation)
    return this.generateTokenPair({
      userId: user.id,
      email: user.email,
      role: user.role,
      sessionId: payload.sessionId,
      tokenFamily: payload.tokenFamily
    });
  }

  /**
   * Verify access token
   */
  async verifyAccessToken(token: string): Promise<AccessTokenPayload> {
    try {
      // 1. Verify signature and expiration
      const payload = await this.jwtService.verifyAsync<AccessTokenPayload>(
        token,
        { secret: this.configService.get('jwt.accessSecret') }
      );

      // 2. Check if token is blacklisted
      const isBlacklisted = await this.isTokenBlacklisted(payload.jti);
      if (isBlacklisted) {
        throw new UnauthorizedError('Token has been revoked');
      }

      return payload;
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        throw new UnauthorizedError('Token expired');
      }
      throw new UnauthorizedError('Invalid token');
    }
  }
}
```

---

## 5. Authorization (RBAC)

### 5.1 Permission System

```typescript
@Injectable()
export class AuthorizationService {
  constructor(
    private userRepository: UserRepository,
    private permissionRepository: PermissionRepository,
    private cacheService: CacheService
  ) {}

  /**
   * Check if user has permission
   */
  async hasPermission(params: {
    userId: string;
    permission: Permission;
    resource?: Resource;
  }): Promise<boolean> {
    // 1. Check cache first
    const cacheKey = `permissions:${params.userId}`;
    let permissions = await this.cacheService.get<Permission[]>(cacheKey);

    if (!permissions) {
      // 2. Load user permissions
      permissions = await this.getUserPermissions(params.userId);
      await this.cacheService.set(cacheKey, permissions, 3600);
    }

    // 3. Check for wildcard permission
    if (permissions.includes(Permission.ALL)) {
      return true;
    }

    // 4. Check specific permission
    if (permissions.includes(params.permission)) {
      // 5. Check resource ownership if applicable
      if (params.resource) {
        return this.checkResourceOwnership(params);
      }
      return true;
    }

    return false;
  }

  /**
   * Get all user permissions (role + custom)
   */
  private async getUserPermissions(userId: string): Promise<Permission[]> {
    const user = await this.userRepository.findById(userId);
    const rolePermissions = await this.getRolePermissions(user.role);
    const customPermissions = await this.permissionRepository.findByUser(
      userId
    );

    return [...rolePermissions, ...customPermissions.map(p => p.permission)];
  }

  /**
   * Check resource ownership
   */
  private async checkResourceOwnership(params: {
    userId: string;
    permission: Permission;
    resource: Resource;
  }): Promise<boolean> {
    // If permission includes "any" scope, skip ownership check
    if (params.permission.endsWith(':any')) {
      return true;
    }

    // If permission includes "own" scope, check ownership
    if (params.permission.endsWith(':own')) {
      return params.resource.ownerId === params.userId;
    }

    return false;
  }
}
```

### 5.2 Permission Guards

```typescript
/**
 * Guard to check permissions
 */
@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private authzService: AuthorizationService
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermissions = this.reflector.get<Permission[]>(
      PERMISSIONS_KEY,
      context.getHandler()
    );

    if (!requiredPermissions) {
      return true; // No permissions required
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new UnauthorizedError('User not authenticated');
    }

    // Check all required permissions
    for (const permission of requiredPermissions) {
      const hasPermission = await this.authzService.hasPermission({
        userId: user.id,
        permission,
        resource: this.extractResource(request)
      });

      if (!hasPermission) {
        throw new ForbiddenError(
          `Missing required permission: ${permission}`
        );
      }
    }

    return true;
  }

  private extractResource(request: any): Resource | undefined {
    // Extract resource from request params
    if (request.params.id) {
      return {
        type: this.getResourceType(request.path),
        id: request.params.id,
        ownerId: request.resource?.ownerId // Set by another middleware
      };
    }
    return undefined;
  }
}

/**
 * Decorator to require permissions
 */
export const RequirePermissions = (...permissions: Permission[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);

/**
 * Usage in controller
 */
@Controller('designs')
export class DesignController {
  @Get(':id')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermissions(Permission.DESIGN_READ_OWN)
  async getDesign(@Param('id') id: string) {
    return this.designService.findOne(id);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermissions(Permission.DESIGN_DELETE_OWN)
  async deleteDesign(@Param('id') id: string) {
    return this.designService.delete(id);
  }
}
```

---

## 6. Multi-Factor Authentication

### 6.1 TOTP Implementation

```typescript
@Injectable()
export class MFAService {
  constructor(
    private userRepository: UserRepository,
    private cacheService: CacheService
  ) {}

  /**
   * Generate MFA secret for user
   */
  async generateSecret(userId: string): Promise<MFASetup> {
    const user = await this.userRepository.findById(userId);
    const secret = authenticator.generateSecret();

    // Generate QR code
    const otpauth = authenticator.keyuri(
      user.email,
      'Fashion Wallet',
      secret
    );
    const qrCode = await QRCode.toDataURL(otpauth);

    // Generate backup codes
    const backupCodes = this.generateBackupCodes(10);

    // Store temporarily (not enabled yet)
    await this.cacheService.set(
      `mfa:setup:${userId}`,
      { secret, backupCodes },
      600 // 10 minutes
    );

    return {
      secret,
      qrCode,
      backupCodes
    };
  }

  /**
   * Enable MFA after verification
   */
  async enableMFA(params: {
    userId: string;
    code: string;
  }): Promise<boolean> {
    const setup = await this.cacheService.get(`mfa:setup:${params.userId}`);
    if (!setup) {
      throw new BadRequestError('MFA setup not found or expired');
    }

    // Verify code
    const isValid = authenticator.verify({
      token: params.code,
      secret: setup.secret
    });

    if (!isValid) {
      throw new BadRequestError('Invalid verification code');
    }

    // Enable MFA for user
    await this.userRepository.update(params.userId, {
      mfaEnabled: true,
      mfaSecret: setup.secret,
      mfaBackupCodes: setup.backupCodes.map(code =>
        this.hashBackupCode(code)
      )
    });

    // Cleanup setup cache
    await this.cacheService.delete(`mfa:setup:${params.userId}`);

    return true;
  }

  /**
   * Verify MFA code during login
   */
  async verifyCode(params: {
    userId: string;
    code: string;
  }): Promise<boolean> {
    const user = await this.userRepository.findById(params.userId);

    if (!user.mfaEnabled) {
      throw new BadRequestError('MFA not enabled');
    }

    // Try TOTP code
    const isValid = authenticator.verify({
      token: params.code,
      secret: user.mfaSecret
    });

    if (isValid) {
      return true;
    }

    // Try backup code
    return this.verifyBackupCode(user, params.code);
  }
}
```

---

## 7. Session Management

### 7.1 Session Service

```typescript
@Injectable()
export class SessionService {
  constructor(
    private sessionRepository: SessionRepository,
    private cacheService: CacheService,
    private deviceService: DeviceTrackingService
  ) {}

  /**
   * Create new session
   */
  async createSession(params: {
    userId: string;
    deviceInfo?: DeviceInfo;
    ipAddress: string;
    rememberMe?: boolean;
  }): Promise<Session> {
    const sessionId = uuidv4();
    const expiresIn = params.rememberMe ? 30 * 24 * 3600 : 7 * 24 * 3600;

    const session = await this.sessionRepository.create({
      id: sessionId,
      userId: params.userId,
      deviceInfo: params.deviceInfo,
      ipAddress: params.ipAddress,
      expiresAt: DateUtil.addSeconds(new Date(), expiresIn),
      tokenFamily: this.generateTokenFamily()
    });

    // Store in Redis for quick access
    await this.cacheService.set(
      `session:${sessionId}`,
      session,
      expiresIn
    );

    return session;
  }

  /**
   * Get active sessions for user
   */
  async getActiveSessions(userId: string): Promise<Session[]> {
    return this.sessionRepository.find({
      where: {
        userId,
        expiresAt: MoreThan(new Date())
      },
      order: { createdAt: 'DESC' }
    });
  }

  /**
   * Terminate session
   */
  async terminateSession(sessionId: string): Promise<void> {
    await this.sessionRepository.delete(sessionId);
    await this.cacheService.delete(`session:${sessionId}`);
  }

  /**
   * Terminate all user sessions (logout all devices)
   */
  async terminateAllSessions(userId: string): Promise<number> {
    const sessions = await this.sessionRepository.find({
      where: { userId }
    });

    for (const session of sessions) {
      await this.cacheService.delete(`session:${session.id}`);
    }

    const result = await this.sessionRepository.delete({ userId });
    return result.affected || 0;
  }
}
```

---

## 8. Security Measures

### 8.1 Rate Limiting

```typescript
/**
 * Rate limiting for authentication endpoints
 */
@Injectable()
export class AuthRateLimitGuard implements CanActivate {
  constructor(private cacheService: CacheService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const key = `rate_limit:auth:${request.ip}:${request.path}`;

    const current = await this.cacheService.get<number>(key) || 0;
    const limit = this.getLimitForEndpoint(request.path);

    if (current >= limit) {
      const ttl = await this.cacheService.ttl(key);
      throw new TooManyRequestsError(
        'Too many attempts. Please try again later.',
        ttl
      );
    }

    await this.cacheService.increment(key);
    await this.cacheService.expire(key, 900); // 15 minutes

    return true;
  }

  private getLimitForEndpoint(path: string): number {
    const limits = {
      '/auth/login': 5,
      '/auth/register': 3,
      '/auth/reset-password': 3,
      '/auth/verify-mfa': 5
    };
    return limits[path] || 10;
  }
}
```

---

## Document Metadata

**Version**: 1.0
**Author**: Fashion Wallet Engineering Team
**Status**: Draft
**Review Cycle**: Bi-weekly
**Next Review**: December 2025
**Dependencies**: arch-infra-00

---

**End of Authentication & Authorization Architecture Document**

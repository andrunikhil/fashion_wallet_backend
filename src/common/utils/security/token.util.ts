import * as crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';

/**
 * Token expiration information
 */
export interface TokenExpiration {
  token: string;
  expiresAt: Date;
}

/**
 * Token utility class for generating secure tokens
 * Provides cryptographically secure random token generation
 */
export class TokenUtil {
  /**
   * Generates a cryptographically secure random token
   * @param length Token length in bytes (default: 32)
   * @param encoding Output encoding (default: hex)
   * @returns Random token
   */
  static generateToken(
    length: number = 32,
    encoding: BufferEncoding = 'hex',
  ): string {
    return crypto.randomBytes(length).toString(encoding);
  }

  /**
   * Generates a URL-safe random token
   * @param length Token length in bytes (default: 32)
   * @returns URL-safe token
   */
  static generateUrlSafeToken(length: number = 32): string {
    return crypto
      .randomBytes(length)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
  }

  /**
   * Generates a numeric OTP (One-Time Password)
   * @param length Number of digits (default: 6)
   * @returns Numeric OTP
   */
  static generateOTP(length: number = 6): string {
    const max = Math.pow(10, length) - 1;
    const min = Math.pow(10, length - 1);
    const otp = crypto.randomInt(min, max + 1);
    return otp.toString().padStart(length, '0');
  }

  /**
   * Generates an API key with optional prefix
   * @param prefix Optional prefix (e.g., 'sk_', 'pk_')
   * @param length Key length in bytes (default: 32)
   * @returns API key
   */
  static generateApiKey(prefix: string = '', length: number = 32): string {
    const token = this.generateToken(length);
    return prefix ? `${prefix}${token}` : token;
  }

  /**
   * Generates a UUID v4
   * @returns UUID v4 string
   */
  static generateUUID(): string {
    return uuidv4();
  }

  /**
   * Generates a session ID
   * @param prefix Optional prefix (default: 'sess_')
   * @returns Session ID
   */
  static generateSessionId(prefix: string = 'sess_'): string {
    const token = this.generateUrlSafeToken(24);
    return `${prefix}${token}`;
  }

  /**
   * Generates a refresh token
   * @param length Token length in bytes (default: 48)
   * @returns Refresh token
   */
  static generateRefreshToken(length: number = 48): string {
    return this.generateUrlSafeToken(length);
  }

  /**
   * Generates a reset token with expiration
   * @param expiresInMs Expiration time in milliseconds (default: 1 hour)
   * @param length Token length in bytes (default: 32)
   * @returns Token with expiration
   */
  static generateResetToken(
    expiresInMs: number = 3600000, // 1 hour
    length: number = 32,
  ): TokenExpiration {
    const token = this.generateToken(length);
    const expiresAt = new Date(Date.now() + expiresInMs);

    return { token, expiresAt };
  }

  /**
   * Generates an email verification token
   * @param expiresInMs Expiration time in milliseconds (default: 24 hours)
   * @returns Token with expiration
   */
  static generateVerificationToken(
    expiresInMs: number = 86400000, // 24 hours
  ): TokenExpiration {
    return this.generateResetToken(expiresInMs);
  }

  /**
   * Checks if a token has expired
   * @param expiresAt Expiration date
   * @returns true if expired
   */
  static isExpired(expiresAt: Date): boolean {
    return new Date() > expiresAt;
  }

  /**
   * Validates token format (basic validation)
   * @param token Token to validate
   * @param minLength Minimum token length (default: 16)
   * @returns true if valid format
   */
  static isValidTokenFormat(token: string, minLength: number = 16): boolean {
    return (
      typeof token === 'string' &&
      token.length >= minLength &&
      /^[a-zA-Z0-9_-]+$/.test(token)
    );
  }

  /**
   * Generates a nonce (number used once)
   * @param length Nonce length in bytes (default: 16)
   * @returns Nonce string
   */
  static generateNonce(length: number = 16): string {
    return this.generateToken(length);
  }

  /**
   * Generates a CSRF token
   * @param length Token length in bytes (default: 32)
   * @returns CSRF token
   */
  static generateCsrfToken(length: number = 32): string {
    return this.generateUrlSafeToken(length);
  }

  /**
   * Generates a random password
   * @param length Password length (default: 16)
   * @param includeSymbols Include special symbols (default: true)
   * @returns Random password
   */
  static generateRandomPassword(
    length: number = 16,
    includeSymbols: boolean = true,
  ): string {
    const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const lowercase = 'abcdefghijklmnopqrstuvwxyz';
    const numbers = '0123456789';
    const symbols = '!@#$%^&*()_+-=[]{}|;:,.<>?';

    let charset = uppercase + lowercase + numbers;
    if (includeSymbols) {
      charset += symbols;
    }

    let password = '';
    const randomBytes = crypto.randomBytes(length);

    for (let i = 0; i < length; i++) {
      password += charset[randomBytes[i] % charset.length];
    }

    // Ensure at least one of each required type
    if (!/[A-Z]/.test(password)) {
      password = uppercase[randomBytes[0] % uppercase.length] + password.slice(1);
    }
    if (!/[a-z]/.test(password)) {
      password = password.slice(0, 1) + lowercase[randomBytes[1] % lowercase.length] + password.slice(2);
    }
    if (!/[0-9]/.test(password)) {
      password = password.slice(0, 2) + numbers[randomBytes[2] % numbers.length] + password.slice(3);
    }
    if (includeSymbols && !/[!@#$%^&*()_+\-=[\]{}|;:,.<>?]/.test(password)) {
      password = password.slice(0, 3) + symbols[randomBytes[3] % symbols.length] + password.slice(4);
    }

    return password;
  }

  /**
   * Generates a bearer token
   * @param length Token length in bytes (default: 32)
   * @returns Bearer token (without 'Bearer ' prefix)
   */
  static generateBearerToken(length: number = 32): string {
    return this.generateUrlSafeToken(length);
  }

  /**
   * Generates an authorization code (for OAuth)
   * @param length Code length in bytes (default: 32)
   * @returns Authorization code
   */
  static generateAuthCode(length: number = 32): string {
    return this.generateUrlSafeToken(length);
  }

  /**
   * Generates a state parameter (for OAuth)
   * @param length State length in bytes (default: 24)
   * @returns State parameter
   */
  static generateState(length: number = 24): string {
    return this.generateUrlSafeToken(length);
  }

  /**
   * Generates a code verifier (for PKCE)
   * @returns Code verifier
   */
  static generateCodeVerifier(): string {
    return this.generateUrlSafeToken(32);
  }

  /**
   * Generates a code challenge from verifier (for PKCE)
   * @param verifier Code verifier
   * @returns Code challenge
   */
  static generateCodeChallenge(verifier: string): string {
    return crypto
      .createHash('sha256')
      .update(verifier)
      .digest('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
  }

  /**
   * Generates a secure random string with custom charset
   * @param length String length
   * @param charset Character set to use
   * @returns Random string
   */
  static generateRandomString(length: number, charset: string): string {
    let result = '';
    const randomBytes = crypto.randomBytes(length);

    for (let i = 0; i < length; i++) {
      result += charset[randomBytes[i] % charset.length];
    }

    return result;
  }

  /**
   * Generates a time-based token that includes timestamp
   * @param length Token length in bytes (default: 24)
   * @returns Time-based token
   */
  static generateTimeBasedToken(length: number = 24): string {
    const timestamp = Date.now().toString(36);
    const random = this.generateToken(length, 'hex');
    return `${timestamp}_${random}`;
  }

  /**
   * Extracts timestamp from time-based token
   * @param token Time-based token
   * @returns Timestamp or null if invalid
   */
  static getTokenTimestamp(token: string): number | null {
    const parts = token.split('_');
    if (parts.length !== 2) {
      return null;
    }

    const timestamp = parseInt(parts[0], 36);
    return isNaN(timestamp) ? null : timestamp;
  }
}

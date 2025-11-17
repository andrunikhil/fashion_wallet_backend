import * as crypto from 'crypto';
import * as bcrypt from 'bcrypt';

/**
 * Hash utility class for cryptographic hashing
 * Provides secure hashing functions including password hashing
 */
export class HashUtil {
  private static readonly BCRYPT_ROUNDS = 12;
  private static readonly HMAC_ALGORITHM = 'sha256';

  /**
   * Hashes a password using bcrypt
   * @param password Password to hash
   * @param rounds Number of salt rounds (default: 12)
   * @returns Hashed password
   */
  static async hashPassword(password: string, rounds: number = this.BCRYPT_ROUNDS): Promise<string> {
    return bcrypt.hash(password, rounds);
  }

  /**
   * Verifies a password against a bcrypt hash
   * @param password Plain password
   * @param hash Hashed password
   * @returns true if password matches
   */
  static async verifyPassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  /**
   * Hashes data using SHA-256
   * @param data Data to hash
   * @param encoding Output encoding (default: hex)
   * @returns Hash string
   */
  static sha256(data: string | Buffer, encoding: crypto.BinaryToTextEncoding = 'hex'): string {
    return crypto.createHash('sha256').update(data).digest(encoding);
  }

  /**
   * Hashes data using SHA-512
   * @param data Data to hash
   * @param encoding Output encoding (default: hex)
   * @returns Hash string
   */
  static sha512(data: string | Buffer, encoding: crypto.BinaryToTextEncoding = 'hex'): string {
    return crypto.createHash('sha512').update(data).digest(encoding);
  }

  /**
   * Hashes data using SHA-1 (less secure, use for compatibility only)
   * @param data Data to hash
   * @param encoding Output encoding (default: hex)
   * @returns Hash string
   */
  static sha1(data: string | Buffer, encoding: crypto.BinaryToTextEncoding = 'hex'): string {
    return crypto.createHash('sha1').update(data).digest(encoding);
  }

  /**
   * Hashes data using MD5 (insecure, use only for non-security purposes)
   * @param data Data to hash
   * @param encoding Output encoding (default: hex)
   * @returns Hash string
   */
  static md5(data: string | Buffer, encoding: crypto.BinaryToTextEncoding = 'hex'): string {
    return crypto.createHash('md5').update(data).digest(encoding);
  }

  /**
   * Creates an HMAC (Hash-based Message Authentication Code)
   * @param data Data to hash
   * @param secret Secret key
   * @param algorithm Hash algorithm (default: sha256)
   * @param encoding Output encoding (default: hex)
   * @returns HMAC string
   */
  static hmac(
    data: string | Buffer,
    secret: string | Buffer,
    algorithm: string = this.HMAC_ALGORITHM,
    encoding: crypto.BinaryToTextEncoding = 'hex',
  ): string {
    return crypto.createHmac(algorithm, secret).update(data).digest(encoding);
  }

  /**
   * Verifies an HMAC
   * @param data Original data
   * @param secret Secret key
   * @param hmac HMAC to verify
   * @param algorithm Hash algorithm (default: sha256)
   * @returns true if HMAC is valid
   */
  static verifyHmac(
    data: string | Buffer,
    secret: string | Buffer,
    hmac: string,
    algorithm: string = this.HMAC_ALGORITHM,
  ): boolean {
    const calculated = this.hmac(data, secret, algorithm);
    return this.constantTimeCompare(calculated, hmac);
  }

  /**
   * Constant-time string comparison to prevent timing attacks
   * @param a First string
   * @param b Second string
   * @returns true if strings are equal
   */
  static constantTimeCompare(a: string, b: string): boolean {
    if (a.length !== b.length) {
      return false;
    }

    const bufferA = Buffer.from(a);
    const bufferB = Buffer.from(b);

    return crypto.timingSafeEqual(bufferA, bufferB);
  }

  /**
   * Generates a hash of a file
   * @param buffer File buffer
   * @param algorithm Hash algorithm (default: sha256)
   * @returns File hash
   */
  static hashFile(
    buffer: Buffer,
    algorithm: string = 'sha256',
    encoding: crypto.BinaryToTextEncoding = 'hex',
  ): string {
    return crypto.createHash(algorithm).update(buffer).digest(encoding);
  }

  /**
   * Generates a checksum for data integrity verification
   * @param data Data to checksum
   * @returns Checksum string
   */
  static checksum(data: string | Buffer): string {
    return this.sha256(data);
  }

  /**
   * Verifies data against a checksum
   * @param data Data to verify
   * @param checksum Expected checksum
   * @returns true if checksum matches
   */
  static verifyChecksum(data: string | Buffer, checksum: string): boolean {
    const calculated = this.checksum(data);
    return this.constantTimeCompare(calculated, checksum);
  }

  /**
   * Hashes an object (converts to JSON first)
   * @param obj Object to hash
   * @param algorithm Hash algorithm (default: sha256)
   * @returns Hash string
   */
  static hashObject(obj: any, algorithm: string = 'sha256'): string {
    const json = JSON.stringify(obj);
    return crypto.createHash(algorithm).update(json).digest('hex');
  }

  /**
   * Generates a random salt
   * @param length Salt length in bytes (default: 16)
   * @returns Salt as hex string
   */
  static generateSalt(length: number = 16): string {
    return crypto.randomBytes(length).toString('hex');
  }

  /**
   * Hashes data with a salt using PBKDF2
   * @param data Data to hash
   * @param salt Salt
   * @param iterations Number of iterations (default: 100000)
   * @param keyLength Output length (default: 64)
   * @returns Hashed data
   */
  static pbkdf2(
    data: string,
    salt: string | Buffer,
    iterations: number = 100000,
    keyLength: number = 64,
  ): string {
    const saltBuffer = typeof salt === 'string' ? Buffer.from(salt, 'hex') : salt;
    return crypto.pbkdf2Sync(data, saltBuffer, iterations, keyLength, 'sha512').toString('hex');
  }

  /**
   * Verifies PBKDF2 hash
   * @param data Original data
   * @param salt Salt used
   * @param hash Hash to verify
   * @param iterations Number of iterations
   * @param keyLength Key length
   * @returns true if hash matches
   */
  static verifyPbkdf2(
    data: string,
    salt: string | Buffer,
    hash: string,
    iterations: number = 100000,
    keyLength: number = 64,
  ): boolean {
    const calculated = this.pbkdf2(data, salt, iterations, keyLength);
    return this.constantTimeCompare(calculated, hash);
  }

  /**
   * Generates a fingerprint/digest of data
   * @param data Data to fingerprint
   * @returns Fingerprint string
   */
  static fingerprint(data: string | Buffer): string {
    return this.sha256(data).substring(0, 16);
  }
}

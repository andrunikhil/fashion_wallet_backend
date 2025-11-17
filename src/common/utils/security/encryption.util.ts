import * as crypto from 'crypto';

/**
 * Encryption configuration options
 */
export interface EncryptionOptions {
  algorithm?: string;
  keyDerivationIterations?: number;
  keyLength?: number;
  ivLength?: number;
  saltLength?: number;
  tagLength?: number;
}

/**
 * Encrypted data structure
 */
export interface EncryptedData {
  encrypted: string;
  iv: string;
  authTag: string;
  salt?: string;
}

/**
 * Encryption utility class using AES-256-GCM
 * Provides secure encryption and decryption with authenticated encryption
 */
export class EncryptionUtil {
  private static readonly DEFAULT_ALGORITHM = 'aes-256-gcm';
  private static readonly KEY_DERIVATION_ITERATIONS = 100000;
  private static readonly KEY_LENGTH = 32; // 256 bits
  private static readonly IV_LENGTH = 16; // 128 bits
  private static readonly SALT_LENGTH = 32;
  private static readonly TAG_LENGTH = 16;

  /**
   * Encrypts data using AES-256-GCM
   * @param plaintext Data to encrypt
   * @param key Encryption key (32 bytes for AES-256)
   * @param options Encryption options
   * @returns Encrypted data with IV and auth tag
   */
  static encrypt(
    plaintext: string,
    key: string | Buffer,
    options: EncryptionOptions = {},
  ): EncryptedData {
    const algorithm = options.algorithm || this.DEFAULT_ALGORITHM;
    const ivLength = options.ivLength || this.IV_LENGTH;

    // Generate IV
    const iv = crypto.randomBytes(ivLength);

    // Derive key if string provided
    const encryptionKey = typeof key === 'string'
      ? Buffer.from(key.padEnd(this.KEY_LENGTH, '0').slice(0, this.KEY_LENGTH))
      : key;

    // Create cipher
    const cipher = crypto.createCipheriv(algorithm, encryptionKey, iv);

    // Encrypt
    let encrypted = cipher.update(plaintext, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    // Get auth tag (for GCM mode)
    const authTag = cipher.getAuthTag();

    return {
      encrypted,
      iv: iv.toString('hex'),
      authTag: authTag.toString('hex'),
    };
  }

  /**
   * Decrypts data encrypted with AES-256-GCM
   * @param encryptedData Encrypted data structure
   * @param key Decryption key
   * @param options Decryption options
   * @returns Decrypted plaintext
   */
  static decrypt(
    encryptedData: EncryptedData,
    key: string | Buffer,
    options: EncryptionOptions = {},
  ): string {
    const algorithm = options.algorithm || this.DEFAULT_ALGORITHM;

    // Derive key if string provided
    const decryptionKey = typeof key === 'string'
      ? Buffer.from(key.padEnd(this.KEY_LENGTH, '0').slice(0, this.KEY_LENGTH))
      : key;

    // Convert hex strings to buffers
    const iv = Buffer.from(encryptedData.iv, 'hex');
    const authTag = Buffer.from(encryptedData.authTag, 'hex');

    // Create decipher
    const decipher = crypto.createDecipheriv(algorithm, decryptionKey, iv);
    decipher.setAuthTag(authTag);

    // Decrypt
    let decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }

  /**
   * Encrypts data with password-based key derivation
   * @param plaintext Data to encrypt
   * @param password Password for encryption
   * @param options Encryption options
   * @returns Encrypted data with salt
   */
  static encryptWithPassword(
    plaintext: string,
    password: string,
    options: EncryptionOptions = {},
  ): EncryptedData {
    const saltLength = options.saltLength || this.SALT_LENGTH;
    const keyLength = options.keyLength || this.KEY_LENGTH;
    const iterations = options.keyDerivationIterations || this.KEY_DERIVATION_ITERATIONS;

    // Generate salt
    const salt = crypto.randomBytes(saltLength);

    // Derive key from password
    const key = crypto.pbkdf2Sync(password, salt, iterations, keyLength, 'sha256');

    // Encrypt
    const result = this.encrypt(plaintext, key, options);

    return {
      ...result,
      salt: salt.toString('hex'),
    };
  }

  /**
   * Decrypts data with password-based key derivation
   * @param encryptedData Encrypted data structure with salt
   * @param password Password for decryption
   * @param options Decryption options
   * @returns Decrypted plaintext
   */
  static decryptWithPassword(
    encryptedData: EncryptedData,
    password: string,
    options: EncryptionOptions = {},
  ): string {
    if (!encryptedData.salt) {
      throw new Error('Salt is required for password-based decryption');
    }

    const keyLength = options.keyLength || this.KEY_LENGTH;
    const iterations = options.keyDerivationIterations || this.KEY_DERIVATION_ITERATIONS;

    // Convert salt from hex
    const salt = Buffer.from(encryptedData.salt, 'hex');

    // Derive key from password
    const key = crypto.pbkdf2Sync(password, salt, iterations, keyLength, 'sha256');

    // Decrypt
    return this.decrypt(encryptedData, key, options);
  }

  /**
   * Generates a cryptographically secure random key
   * @param length Key length in bytes (default: 32 for AES-256)
   * @returns Random key as hex string
   */
  static generateKey(length: number = this.KEY_LENGTH): string {
    return crypto.randomBytes(length).toString('hex');
  }

  /**
   * Derives a key from password using scrypt
   * @param password Password to derive key from
   * @param salt Salt for key derivation
   * @param keyLength Desired key length
   * @returns Derived key
   */
  static deriveKeyScrypt(
    password: string,
    salt: string | Buffer,
    keyLength: number = this.KEY_LENGTH,
  ): Buffer {
    const saltBuffer = typeof salt === 'string' ? Buffer.from(salt, 'hex') : salt;
    return crypto.scryptSync(password, saltBuffer, keyLength);
  }

  /**
   * Encrypts an object as JSON
   * @param obj Object to encrypt
   * @param key Encryption key
   * @returns Encrypted data
   */
  static encryptObject<T>(obj: T, key: string | Buffer): EncryptedData {
    const json = JSON.stringify(obj);
    return this.encrypt(json, key);
  }

  /**
   * Decrypts JSON data into an object
   * @param encryptedData Encrypted data
   * @param key Decryption key
   * @returns Decrypted object
   */
  static decryptObject<T>(encryptedData: EncryptedData, key: string | Buffer): T {
    const json = this.decrypt(encryptedData, key);
    return JSON.parse(json) as T;
  }

  /**
   * Encrypts a buffer
   * @param buffer Buffer to encrypt
   * @param key Encryption key
   * @returns Encrypted data
   */
  static encryptBuffer(buffer: Buffer, key: string | Buffer): EncryptedData {
    const base64 = buffer.toString('base64');
    return this.encrypt(base64, key);
  }

  /**
   * Decrypts to a buffer
   * @param encryptedData Encrypted data
   * @param key Decryption key
   * @returns Decrypted buffer
   */
  static decryptBuffer(encryptedData: EncryptedData, key: string | Buffer): Buffer {
    const base64 = this.decrypt(encryptedData, key);
    return Buffer.from(base64, 'base64');
  }
}

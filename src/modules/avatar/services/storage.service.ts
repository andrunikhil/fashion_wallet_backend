import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

export interface UploadResult {
  url: string;
  key: string;
  size: number;
}

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private s3Client: S3Client;
  private readonly bucketName: string;
  private readonly region: string;

  constructor(private readonly configService: ConfigService) {
    this.region = this.configService.get<string>('AWS_REGION', 'us-east-1');
    this.bucketName = this.configService.get<string>('S3_AVATAR_BUCKET', 'fashion-wallet-avatars');

    this.s3Client = new S3Client({
      region: this.region,
      credentials: {
        accessKeyId: this.configService.get<string>('AWS_ACCESS_KEY_ID', ''),
        secretAccessKey: this.configService.get<string>('AWS_SECRET_ACCESS_KEY', ''),
      },
    });
  }

  async uploadPhoto(
    avatarId: string,
    file: Express.Multer.File,
    type: 'front' | 'side' | 'back',
  ): Promise<UploadResult> {
    const key = `avatars/${avatarId}/photos/${type}-${Date.now()}.jpg`;

    try {
      const command = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype,
        ServerSideEncryption: 'AES256',
        Metadata: {
          avatarId,
          type,
          uploadedAt: new Date().toISOString(),
        },
      });

      await this.s3Client.send(command);

      const url = `https://${this.bucketName}.s3.${this.region}.amazonaws.com/${key}`;

      this.logger.log(`Uploaded photo for avatar ${avatarId}: ${key}`);

      return {
        url,
        key,
        size: file.size,
      };
    } catch (error) {
      this.logger.error(`Failed to upload photo for avatar ${avatarId}:`, error);
      throw new Error(`Failed to upload photo: ${error.message}`);
    }
  }

  async uploadProcessedPhoto(
    avatarId: string,
    buffer: Buffer,
    type: string,
  ): Promise<UploadResult> {
    const key = `avatars/${avatarId}/processed/${type}-${Date.now()}.jpg`;

    try {
      const command = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: key,
        Body: buffer,
        ContentType: 'image/jpeg',
        ServerSideEncryption: 'AES256',
        CacheControl: 'max-age=31536000, immutable',
      });

      await this.s3Client.send(command);

      const url = `https://${this.bucketName}.s3.${this.region}.amazonaws.com/${key}`;

      return {
        url,
        key,
        size: buffer.length,
      };
    } catch (error) {
      this.logger.error(`Failed to upload processed photo:`, error);
      throw new Error(`Failed to upload processed photo: ${error.message}`);
    }
  }

  async uploadModel(
    avatarId: string,
    modelData: Buffer,
    format: 'gltf' | 'glb' | 'obj' | 'fbx',
  ): Promise<UploadResult> {
    const key = `avatars/${avatarId}/models/avatar.${format}`;

    const contentTypes = {
      gltf: 'model/gltf+json',
      glb: 'model/gltf-binary',
      obj: 'model/obj',
      fbx: 'application/octet-stream',
    };

    try {
      const command = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: key,
        Body: modelData,
        ContentType: contentTypes[format],
        CacheControl: 'max-age=31536000, immutable',
        ServerSideEncryption: 'AES256',
      });

      await this.s3Client.send(command);

      const url = `https://${this.bucketName}.s3.${this.region}.amazonaws.com/${key}`;

      this.logger.log(`Uploaded ${format} model for avatar ${avatarId}`);

      return {
        url,
        key,
        size: modelData.length,
      };
    } catch (error) {
      this.logger.error(`Failed to upload model:`, error);
      throw new Error(`Failed to upload model: ${error.message}`);
    }
  }

  async uploadThumbnail(
    avatarId: string,
    imageBuffer: Buffer,
  ): Promise<UploadResult> {
    const key = `avatars/${avatarId}/thumbnails/thumbnail-${Date.now()}.jpg`;

    try {
      const command = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: key,
        Body: imageBuffer,
        ContentType: 'image/jpeg',
        ServerSideEncryption: 'AES256',
        CacheControl: 'max-age=31536000, immutable',
      });

      await this.s3Client.send(command);

      const url = `https://${this.bucketName}.s3.${this.region}.amazonaws.com/${key}`;

      return {
        url,
        key,
        size: imageBuffer.length,
      };
    } catch (error) {
      this.logger.error(`Failed to upload thumbnail:`, error);
      throw new Error(`Failed to upload thumbnail: ${error.message}`);
    }
  }

  async generateSignedUrl(
    key: string,
    expiresIn: number = 3600,
  ): Promise<string> {
    try {
      const command = new GetObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      });

      return await getSignedUrl(this.s3Client, command, { expiresIn });
    } catch (error) {
      this.logger.error(`Failed to generate signed URL:`, error);
      throw new Error(`Failed to generate signed URL: ${error.message}`);
    }
  }

  async deleteFile(key: string): Promise<void> {
    try {
      const command = new DeleteObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      });

      await this.s3Client.send(command);
      this.logger.log(`Deleted file: ${key}`);
    } catch (error) {
      this.logger.error(`Failed to delete file ${key}:`, error);
      throw new Error(`Failed to delete file: ${error.message}`);
    }
  }

  async deleteFiles(keys: string[]): Promise<void> {
    await Promise.all(keys.map(key => this.deleteFile(key)));
  }

  async deleteAvatarFiles(avatarId: string): Promise<void> {
    // Note: In production, you might want to use S3 batch delete or lifecycle policies
    this.logger.log(`Scheduled deletion of files for avatar ${avatarId}`);
    // This is a simplified version - real implementation would list and delete all files
  }

  async fileExists(key: string): Promise<boolean> {
    try {
      const command = new HeadObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      });

      await this.s3Client.send(command);
      return true;
    } catch (error) {
      if (error.name === 'NotFound') {
        return false;
      }
      throw error;
    }
  }

  async getFileSize(key: string): Promise<number> {
    try {
      const command = new HeadObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      });

      const response = await this.s3Client.send(command);
      return response.ContentLength || 0;
    } catch (error) {
      this.logger.error(`Failed to get file size for ${key}:`, error);
      throw new Error(`Failed to get file size: ${error.message}`);
    }
  }
}

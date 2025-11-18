import { Exclude, Expose } from 'class-transformer';
import { PhotoStatus, PhotoType } from '../../../infrastructure/database/entities/photo.entity';

@Exclude()
export class PhotoResponseDto {
  @Expose()
  id: string;

  @Expose()
  avatarId: string;

  @Expose()
  type: PhotoType;

  @Expose()
  status: PhotoStatus;

  @Expose()
  originalUrl: string;

  @Expose()
  processedUrl: string | null;

  @Expose()
  width: number | null;

  @Expose()
  height: number | null;

  @Expose()
  fileSizeBytes: number;

  @Expose()
  mimeType: string;

  @Expose()
  uploadedAt: Date;

  @Expose()
  processedAt: Date | null;

  // Excluded: originalS3Key, processedS3Key, originalFilename, exifData, landmarks, processingMetadata
}

@Exclude()
export class PhotoListResponseDto {
  @Expose()
  avatarId: string;

  @Expose()
  photos: PhotoResponseDto[];

  @Expose()
  total: number;
}

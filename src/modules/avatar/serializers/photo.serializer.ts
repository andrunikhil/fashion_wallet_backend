import { Injectable } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { Photo } from '../../../infrastructure/database/entities/photo.entity';
import { PhotoResponseDto, PhotoListResponseDto } from '../dto/photo-response.dto';

@Injectable()
export class PhotoSerializer {
  /**
   * Transform a Photo entity to response DTO
   */
  transformToResponse(photo: Photo): PhotoResponseDto {
    return plainToInstance(PhotoResponseDto, photo, {
      excludeExtraneousValues: true,
      enableImplicitConversion: true,
    });
  }

  /**
   * Transform array of photos
   */
  transformToResponses(photos: Photo[]): PhotoResponseDto[] {
    return photos.map((photo) => this.transformToResponse(photo));
  }

  /**
   * Transform to list response
   */
  transformToListResponse(avatarId: string, photos: Photo[]): PhotoListResponseDto {
    return {
      avatarId,
      photos: this.transformToResponses(photos),
      total: photos.length,
    };
  }
}

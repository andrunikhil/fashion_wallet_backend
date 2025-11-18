import { Injectable } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { Avatar } from '../../../infrastructure/database/entities/avatar.entity';
import { Measurement } from '../../../infrastructure/database/entities/measurement.entity';
import {
  AvatarResponseDto,
  AvatarListItemDto,
  AvatarDetailResponseDto,
  PaginatedAvatarResponseDto,
  ProcessingStatusResponseDto,
  CreateAvatarResponseDto,
} from '../dto/avatar-response.dto';
import { CreateAvatarResponse, PaginatedResponse } from '../services/avatar.service';

@Injectable()
export class AvatarSerializer {
  /**
   * Transform a single Avatar entity to response DTO
   */
  transformToResponse(avatar: Avatar): AvatarResponseDto {
    return plainToInstance(AvatarResponseDto, avatar, {
      excludeExtraneousValues: true,
      enableImplicitConversion: true,
    });
  }

  /**
   * Transform Avatar entity to list item DTO (minimal fields)
   */
  transformToListItem(avatar: Avatar): AvatarListItemDto {
    return plainToInstance(AvatarListItemDto, avatar, {
      excludeExtraneousValues: true,
      enableImplicitConversion: true,
    });
  }

  /**
   * Transform Avatar with measurements to detailed response
   */
  transformToDetailResponse(
    avatar: Avatar,
    measurements?: Measurement | null,
  ): AvatarDetailResponseDto {
    const dto = plainToInstance(AvatarDetailResponseDto, avatar, {
      excludeExtraneousValues: true,
      enableImplicitConversion: true,
    });

    if (measurements) {
      dto.measurements = {
        height: measurements.height,
        weight: measurements.weight,
        chestCircumference: measurements.chestCircumference,
        waistCircumference: measurements.waistCircumference,
        hipCircumference: measurements.hipCircumference,
        unit: measurements.unit,
        confidenceScore: measurements.confidenceScore,
      };
    }

    return dto;
  }

  /**
   * Transform array of avatars to list items
   */
  transformToListItems(avatars: Avatar[]): AvatarListItemDto[] {
    return avatars.map((avatar) => this.transformToListItem(avatar));
  }

  /**
   * Transform paginated result
   */
  transformToPaginatedResponse(
    paginatedResult: PaginatedResponse<Avatar>,
  ): PaginatedAvatarResponseDto {
    return {
      data: this.transformToListItems(paginatedResult.data),
      total: paginatedResult.total,
      page: paginatedResult.page,
      limit: paginatedResult.limit,
      totalPages: paginatedResult.totalPages,
      hasMore: paginatedResult.page * paginatedResult.limit < paginatedResult.total,
    };
  }

  /**
   * Transform create avatar response
   */
  transformToCreateResponse(
    response: CreateAvatarResponse,
  ): CreateAvatarResponseDto {
    return plainToInstance(CreateAvatarResponseDto, response, {
      excludeExtraneousValues: true,
      enableImplicitConversion: true,
    });
  }

  /**
   * Transform processing status response
   */
  transformToProcessingStatusResponse(data: {
    avatarId: string;
    status: string;
    progress: number;
    message: string | null;
    errorMessage: string | null;
    job: any;
  }): ProcessingStatusResponseDto {
    return plainToInstance(ProcessingStatusResponseDto, data, {
      excludeExtraneousValues: true,
      enableImplicitConversion: true,
    });
  }
}

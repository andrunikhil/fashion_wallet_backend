import { Exclude, Expose, Type } from 'class-transformer';
import { AvatarStatus, AvatarSource, BodyType } from '../../../infrastructure/database/entities/avatar.entity';

@Exclude()
export class AvatarResponseDto {
  @Expose()
  id: string;

  @Expose()
  name: string;

  @Expose()
  status: AvatarStatus;

  @Expose()
  source: AvatarSource;

  @Expose()
  bodyType: BodyType | null;

  @Expose()
  gender: string;

  @Expose()
  modelUrl: string | null;

  @Expose()
  modelFormat: string | null;

  @Expose()
  modelSizeBytes: number | null;

  @Expose()
  thumbnailUrl: string | null;

  @Expose()
  processingProgress: number;

  @Expose()
  processingMessage: string | null;

  @Expose()
  errorMessage: string | null;

  @Expose()
  confidenceScore: number | null;

  @Expose()
  customization: {
    skinTone?: string;
    hairColor?: string;
    hairStyle?: string;
    faceShape?: string;
    [key: string]: any;
  } | null;

  @Expose()
  isDefault: boolean;

  @Expose()
  isPublic: boolean;

  @Expose()
  viewCount: number;

  @Expose()
  lastViewedAt: Date | null;

  @Expose()
  createdAt: Date;

  @Expose()
  updatedAt: Date;

  // Internal fields that should NOT be exposed
  // userId - excluded for privacy
  // metadata - excluded as it's internal
  // deletedAt - excluded
}

@Exclude()
export class AvatarListItemDto {
  @Expose()
  id: string;

  @Expose()
  name: string;

  @Expose()
  status: AvatarStatus;

  @Expose()
  source: AvatarSource;

  @Expose()
  bodyType: BodyType | null;

  @Expose()
  thumbnailUrl: string | null;

  @Expose()
  processingProgress: number;

  @Expose()
  isDefault: boolean;

  @Expose()
  createdAt: Date;

  @Expose()
  updatedAt: Date;
}

@Exclude()
export class AvatarDetailResponseDto extends AvatarResponseDto {
  @Expose()
  @Type(() => MeasurementSummaryDto)
  measurements?: MeasurementSummaryDto | null;
}

@Exclude()
export class MeasurementSummaryDto {
  @Expose()
  height: number;

  @Expose()
  weight: number | null;

  @Expose()
  chestCircumference: number | null;

  @Expose()
  waistCircumference: number | null;

  @Expose()
  hipCircumference: number | null;

  @Expose()
  unit: string;

  @Expose()
  confidenceScore: number | null;
}

export class CreateAvatarResponseDto {
  @Expose()
  avatarId: string;

  @Expose()
  status: string;

  @Expose()
  estimatedCompletionTime: number;

  @Expose()
  processingJobId: string;
}

export class PaginatedAvatarResponseDto {
  @Expose()
  @Type(() => AvatarListItemDto)
  data: AvatarListItemDto[];

  @Expose()
  total: number;

  @Expose()
  page: number;

  @Expose()
  limit: number;

  @Expose()
  totalPages: number;

  @Expose()
  hasMore: boolean;
}

export class ProcessingStatusResponseDto {
  @Expose()
  avatarId: string;

  @Expose()
  status: AvatarStatus;

  @Expose()
  progress: number;

  @Expose()
  message: string | null;

  @Expose()
  errorMessage: string | null;

  @Expose()
  job: {
    id: string;
    status: string;
    progress: number;
    currentStep: string | null;
    startedAt: Date | null;
    completedAt: Date | null;
  } | null;
}

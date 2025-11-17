import { Avatar, AvatarStatus } from '../../../infrastructure/database/entities/avatar.entity';
import { Measurement } from '../../../infrastructure/database/entities/measurement.entity';

export class CreateAvatarResponse {
  avatarId: string;
  status: AvatarStatus;
  estimatedCompletionTime: number; // seconds
  processingJobId: string;
}

export class PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasMore: boolean;

  constructor(data: T[], total: number, page: number, limit: number) {
    this.data = data;
    this.total = total;
    this.page = page;
    this.limit = limit;
    this.totalPages = Math.ceil(total / limit);
    this.hasMore = page * limit < total;
  }
}

export class AvatarWithMeasurements {
  avatar: Avatar;
  measurements?: Measurement;
}

export class ProcessingStatusResponse {
  avatarId: string;
  status: AvatarStatus;
  progress: number;
  message?: string;
  estimatedTimeRemaining?: number; // seconds
}

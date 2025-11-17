import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull, FindOptionsWhere, In } from 'typeorm';
import { Avatar, AvatarStatus } from '../../../infrastructure/database/entities/avatar.entity';

export interface FindAvatarsOptions {
  userId?: string;
  status?: AvatarStatus | AvatarStatus[];
  source?: string;
  includeDeleted?: boolean;
  limit?: number;
  offset?: number;
  orderBy?: 'createdAt' | 'updatedAt' | 'viewCount';
  orderDirection?: 'ASC' | 'DESC';
}

@Injectable()
export class AvatarRepository {
  constructor(
    @InjectRepository(Avatar)
    private readonly repository: Repository<Avatar>,
  ) {}

  async findById(id: string, includeDeleted = false): Promise<Avatar | null> {
    const where: FindOptionsWhere<Avatar> = { id };
    if (!includeDeleted) {
      where.deletedAt = IsNull();
    }
    return this.repository.findOne({ where });
  }

  async findByUserId(
    userId: string,
    includeDeleted = false,
  ): Promise<Avatar[]> {
    const where: FindOptionsWhere<Avatar> = { userId };
    if (!includeDeleted) {
      where.deletedAt = IsNull();
    }
    return this.repository.find({
      where,
      order: { createdAt: 'DESC' },
    });
  }

  async findMany(options: FindAvatarsOptions): Promise<[Avatar[], number]> {
    const {
      userId,
      status,
      source,
      includeDeleted = false,
      limit = 10,
      offset = 0,
      orderBy = 'createdAt',
      orderDirection = 'DESC',
    } = options;

    const where: FindOptionsWhere<Avatar> = {};

    if (userId) {
      where.userId = userId;
    }

    if (status) {
      if (Array.isArray(status)) {
        where.status = In(status);
      } else {
        where.status = status;
      }
    }

    if (source) {
      where.source = source as any;
    }

    if (!includeDeleted) {
      where.deletedAt = IsNull();
    }

    return this.repository.findAndCount({
      where,
      take: limit,
      skip: offset,
      order: { [orderBy]: orderDirection },
    });
  }

  async create(data: Partial<Avatar>): Promise<Avatar> {
    const avatar = this.repository.create(data);
    return this.repository.save(avatar);
  }

  async update(id: string, data: Partial<Avatar>): Promise<Avatar> {
    await this.repository.update({ id }, data);
    const updated = await this.findById(id);
    if (!updated) {
      throw new Error(`Avatar with id ${id} not found after update`);
    }
    return updated;
  }

  async softDelete(id: string): Promise<boolean> {
    const result = await this.repository.softDelete(id);
    return result.affected !== null && result.affected > 0;
  }

  async hardDelete(id: string): Promise<boolean> {
    const result = await this.repository.delete(id);
    return result.affected !== null && result.affected > 0;
  }

  async restore(id: string): Promise<boolean> {
    const result = await this.repository.restore(id);
    return result.affected !== null && result.affected > 0;
  }

  async findDefaultByUserId(userId: string): Promise<Avatar | null> {
    return this.repository.findOne({
      where: {
        userId,
        isDefault: true,
        deletedAt: IsNull(),
      },
    });
  }

  async setDefault(id: string, userId: string): Promise<void> {
    // First, unset all defaults for this user
    await this.repository.update(
      { userId, isDefault: true },
      { isDefault: false },
    );

    // Then set the new default
    await this.repository.update({ id }, { isDefault: true });
  }

  async updateProcessingProgress(
    id: string,
    progress: number,
    message?: string,
  ): Promise<void> {
    const updateData: Partial<Avatar> = { processingProgress: progress };
    if (message) {
      updateData.processingMessage = message;
    }
    await this.repository.update({ id }, updateData);
  }

  async updateStatus(
    id: string,
    status: AvatarStatus,
    errorMessage?: string,
  ): Promise<void> {
    const updateData: Partial<Avatar> = { status };
    if (errorMessage) {
      updateData.errorMessage = errorMessage;
    }
    await this.repository.update({ id }, updateData);
  }

  async incrementViewCount(id: string): Promise<void> {
    await this.repository.increment({ id }, 'viewCount', 1);
    await this.repository.update({ id }, { lastViewedAt: new Date() });
  }

  async countByUserId(userId: string): Promise<number> {
    return this.repository.count({
      where: {
        userId,
        deletedAt: IsNull(),
      },
    });
  }

  async countByStatus(status: AvatarStatus): Promise<number> {
    return this.repository.count({
      where: {
        status,
        deletedAt: IsNull(),
      },
    });
  }

  async findProcessing(): Promise<Avatar[]> {
    return this.repository.find({
      where: {
        status: AvatarStatus.PROCESSING,
        deletedAt: IsNull(),
      },
      order: { createdAt: 'ASC' },
    });
  }

  async findStale(minutesOld: number): Promise<Avatar[]> {
    const staleDate = new Date();
    staleDate.setMinutes(staleDate.getMinutes() - minutesOld);

    return this.repository
      .createQueryBuilder('avatar')
      .where('avatar.status = :status', { status: AvatarStatus.PROCESSING })
      .andWhere('avatar.updated_at < :staleDate', { staleDate })
      .andWhere('avatar.deleted_at IS NULL')
      .getMany();
  }

  async exists(id: string): Promise<boolean> {
    const count = await this.repository.count({
      where: {
        id,
        deletedAt: IsNull(),
      },
    });
    return count > 0;
  }

  async existsByUserId(id: string, userId: string): Promise<boolean> {
    const count = await this.repository.count({
      where: {
        id,
        userId,
        deletedAt: IsNull(),
      },
    });
    return count > 0;
  }
}

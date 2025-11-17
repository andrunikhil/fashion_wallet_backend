import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import {
  Photo,
  PhotoType,
  PhotoStatus,
} from '../../../infrastructure/database/entities/photo.entity';

@Injectable()
export class PhotoRepository {
  constructor(
    @InjectRepository(Photo)
    private readonly repository: Repository<Photo>,
  ) {}

  async findById(id: string): Promise<Photo | null> {
    return this.repository.findOne({
      where: { id },
      relations: ['avatar'],
    });
  }

  async findByAvatarId(avatarId: string): Promise<Photo[]> {
    return this.repository.find({
      where: { avatarId },
      order: { type: 'ASC', createdAt: 'ASC' },
    });
  }

  async findByAvatarIdAndType(
    avatarId: string,
    type: PhotoType,
  ): Promise<Photo | null> {
    return this.repository.findOne({
      where: { avatarId, type },
    });
  }

  async findByType(type: PhotoType): Promise<Photo[]> {
    return this.repository.find({
      where: { type },
      relations: ['avatar'],
    });
  }

  async findByStatus(status: PhotoStatus): Promise<Photo[]> {
    return this.repository.find({
      where: { status },
      relations: ['avatar'],
    });
  }

  async findByAvatarIdAndStatus(
    avatarId: string,
    status: PhotoStatus,
  ): Promise<Photo[]> {
    return this.repository.find({
      where: { avatarId, status },
    });
  }

  async create(data: Partial<Photo>): Promise<Photo> {
    const photo = this.repository.create(data);
    return this.repository.save(photo);
  }

  async createMany(photos: Partial<Photo>[]): Promise<Photo[]> {
    const entities = this.repository.create(photos);
    return this.repository.save(entities);
  }

  async update(id: string, data: Partial<Photo>): Promise<Photo> {
    await this.repository.update({ id }, data);
    const updated = await this.findById(id);
    if (!updated) {
      throw new Error(`Photo with id ${id} not found after update`);
    }
    return updated;
  }

  async updateStatus(id: string, status: PhotoStatus, errorMessage?: string): Promise<void> {
    const updateData: Partial<Photo> = { status };
    if (errorMessage) {
      updateData.errorMessage = errorMessage;
    }
    await this.repository.update({ id }, updateData);
  }

  async updateProcessedUrl(id: string, url: string, s3Key: string): Promise<void> {
    await this.repository.update(
      { id },
      {
        processedUrl: url,
        processedS3Key: s3Key,
        status: PhotoStatus.PROCESSED,
      },
    );
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.repository.delete(id);
    return result.affected !== null && result.affected > 0;
  }

  async deleteByAvatarId(avatarId: string): Promise<number> {
    const result = await this.repository.delete({ avatarId });
    return result.affected || 0;
  }

  async deleteMany(ids: string[]): Promise<number> {
    const result = await this.repository.delete({ id: In(ids) });
    return result.affected || 0;
  }

  async countByAvatarId(avatarId: string): Promise<number> {
    return this.repository.count({ where: { avatarId } });
  }

  async hasRequiredPhotos(avatarId: string): Promise<{
    hasAll: boolean;
    missing: PhotoType[];
  }> {
    const photos = await this.findByAvatarId(avatarId);
    const photoTypes = photos.map(p => p.type);

    const requiredTypes = [PhotoType.FRONT];
    const optionalTypes = [PhotoType.SIDE, PhotoType.BACK];

    const missing: PhotoType[] = [];

    requiredTypes.forEach(type => {
      if (!photoTypes.includes(type)) {
        missing.push(type);
      }
    });

    return {
      hasAll: missing.length === 0,
      missing,
    };
  }

  async getPhotosByTypes(avatarId: string, types: PhotoType[]): Promise<Photo[]> {
    return this.repository.find({
      where: {
        avatarId,
        type: In(types),
      },
      order: { type: 'ASC' },
    });
  }

  async getProcessedPhotos(avatarId: string): Promise<Photo[]> {
    return this.repository.find({
      where: {
        avatarId,
        status: PhotoStatus.PROCESSED,
      },
      order: { type: 'ASC' },
    });
  }

  async getTotalStorageSize(avatarId: string): Promise<number> {
    const result = await this.repository
      .createQueryBuilder('photo')
      .select('SUM(photo.file_size_bytes)', 'total')
      .where('photo.avatar_id = :avatarId', { avatarId })
      .getRawOne();

    return parseInt(result.total || '0', 10);
  }

  async findLowQualityPhotos(threshold = 0.7): Promise<Photo[]> {
    return this.repository
      .createQueryBuilder('photo')
      .where('photo.quality_score < :threshold', { threshold })
      .andWhere('photo.quality_score IS NOT NULL')
      .leftJoinAndSelect('photo.avatar', 'avatar')
      .getMany();
  }

  async findFailedPhotos(): Promise<Photo[]> {
    return this.repository.find({
      where: { status: PhotoStatus.FAILED },
      relations: ['avatar'],
      order: { createdAt: 'DESC' },
    });
  }

  async exists(id: string): Promise<boolean> {
    const count = await this.repository.count({ where: { id } });
    return count > 0;
  }

  async existsByAvatarIdAndType(avatarId: string, type: PhotoType): Promise<boolean> {
    const count = await this.repository.count({
      where: { avatarId, type },
    });
    return count > 0;
  }
}

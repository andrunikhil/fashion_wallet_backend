import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsWhere, FindManyOptions } from 'typeorm';
import { Design } from '../entities/design.entity';

@Injectable()
export class DesignRepository {
  constructor(
    @InjectRepository(Design)
    private readonly designRepo: Repository<Design>,
  ) {}

  async create(design: Partial<Design>): Promise<Design> {
    const newDesign = this.designRepo.create(design);
    return this.designRepo.save(newDesign);
  }

  async findById(id: string, includeDeleted = false): Promise<Design | null> {
    const where: FindOptionsWhere<Design> = { id };
    if (!includeDeleted) {
      where.deletedAt = null as any;
    }
    return this.designRepo.findOne({
      where,
      relations: ['layers', 'versions'],
    });
  }

  async findByIdWithLayers(id: string): Promise<Design | null> {
    return this.designRepo.findOne({
      where: { id, deletedAt: null as any },
      relations: ['layers'],
      order: {
        layers: {
          orderIndex: 'ASC',
        },
      },
    });
  }

  async findByUserId(
    userId: string,
    options?: {
      status?: string;
      limit?: number;
      offset?: number;
      includeDeleted?: boolean;
    },
  ): Promise<[Design[], number]> {
    const where: FindOptionsWhere<Design> = { userId };

    if (options?.status) {
      where.status = options.status as any;
    }

    if (!options?.includeDeleted) {
      where.deletedAt = null as any;
    }

    const findOptions: FindManyOptions<Design> = {
      where,
      order: { createdAt: 'DESC' },
    };

    if (options?.limit) {
      findOptions.take = options.limit;
    }

    if (options?.offset) {
      findOptions.skip = options.offset;
    }

    return this.designRepo.findAndCount(findOptions);
  }

  async update(id: string, updates: Partial<Design>): Promise<Design | null> {
    await this.designRepo.update({ id }, updates);
    return this.findById(id);
  }

  async softDelete(id: string): Promise<boolean> {
    const result = await this.designRepo.update(
      { id },
      { deletedAt: new Date() },
    );
    return result.affected > 0;
  }

  async hardDelete(id: string): Promise<boolean> {
    const result = await this.designRepo.delete({ id });
    return result.affected > 0;
  }

  async incrementViewCount(id: string): Promise<void> {
    await this.designRepo.increment({ id }, 'viewCount', 1);
  }

  async incrementLikeCount(id: string): Promise<void> {
    await this.designRepo.increment({ id }, 'likeCount', 1);
  }

  async incrementForkCount(id: string): Promise<void> {
    await this.designRepo.increment({ id }, 'forkCount', 1);
  }

  async searchByTags(tags: string[], userId?: string): Promise<Design[]> {
    const query = this.designRepo
      .createQueryBuilder('design')
      .where('design.tags && :tags', { tags })
      .andWhere('design.deleted_at IS NULL');

    if (userId) {
      query.andWhere('design.user_id = :userId', { userId });
    }

    return query
      .orderBy('design.created_at', 'DESC')
      .getMany();
  }

  async getPublishedDesigns(
    limit: number = 20,
    offset: number = 0,
  ): Promise<[Design[], number]> {
    return this.designRepo.findAndCount({
      where: {
        status: 'published',
        visibility: 'public',
        deletedAt: null as any,
      },
      order: { publishedAt: 'DESC' },
      take: limit,
      skip: offset,
    });
  }
}

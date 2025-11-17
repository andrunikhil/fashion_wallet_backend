import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Export } from '../entities/export.entity';

@Injectable()
export class ExportRepository {
  constructor(
    @InjectRepository(Export)
    private readonly exportRepo: Repository<Export>,
  ) {}

  async create(exportData: Partial<Export>): Promise<Export> {
    const newExport = this.exportRepo.create(exportData);
    return this.exportRepo.save(newExport);
  }

  async findById(id: string): Promise<Export | null> {
    return this.exportRepo.findOne({ where: { id } });
  }

  async findByDesignId(
    designId: string,
    limit?: number,
  ): Promise<Export[]> {
    const query = this.exportRepo.find({
      where: { designId },
      order: { createdAt: 'DESC' },
    });

    if (limit) {
      return (await query).slice(0, limit);
    }

    return query;
  }

  async findByUserId(
    userId: string,
    limit: number = 20,
    offset: number = 0,
  ): Promise<[Export[], number]> {
    return this.exportRepo.findAndCount({
      where: { userId },
      order: { createdAt: 'DESC' },
      take: limit,
      skip: offset,
    });
  }

  async findQueuedExports(): Promise<Export[]> {
    return this.exportRepo.find({
      where: { status: 'queued' },
      order: { createdAt: 'ASC' },
    });
  }

  async findProcessingExports(): Promise<Export[]> {
    return this.exportRepo.find({
      where: { status: 'processing' },
    });
  }

  async update(id: string, updates: Partial<Export>): Promise<Export | null> {
    await this.exportRepo.update({ id }, updates);
    return this.findById(id);
  }

  async updateStatus(
    id: string,
    status: 'queued' | 'processing' | 'completed' | 'failed',
    progress?: number,
  ): Promise<void> {
    const updates: Partial<Export> = { status };

    if (progress !== undefined) {
      updates.progress = progress;
    }

    if (status === 'processing' && !updates.startedAt) {
      updates.startedAt = new Date();
    }

    if (status === 'completed' || status === 'failed') {
      updates.completedAt = new Date();
    }

    await this.exportRepo.update({ id }, updates);
  }

  async markAsFailed(id: string, errorMessage: string): Promise<void> {
    await this.exportRepo.update(
      { id },
      {
        status: 'failed',
        errorMessage,
        completedAt: new Date(),
      },
    );
  }

  async incrementRetryCount(id: string): Promise<void> {
    await this.exportRepo.increment({ id }, 'retryCount', 1);
  }

  async deleteExpired(): Promise<number> {
    const result = await this.exportRepo
      .createQueryBuilder()
      .delete()
      .where('expires_at < NOW()')
      .execute();

    return result.affected || 0;
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.exportRepo.delete({ id });
    return result.affected > 0;
  }
}

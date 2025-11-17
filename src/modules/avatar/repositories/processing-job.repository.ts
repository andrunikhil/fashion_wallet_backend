import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, LessThan } from 'typeorm';
import {
  ProcessingJob,
  ProcessingJobStatus,
  ProcessingJobType,
} from '../../../infrastructure/database/entities/processing-job.entity';

@Injectable()
export class ProcessingJobRepository {
  constructor(
    @InjectRepository(ProcessingJob)
    private readonly repository: Repository<ProcessingJob>,
  ) {}

  async findById(id: string): Promise<ProcessingJob | null> {
    return this.repository.findOne({
      where: { id },
      relations: ['avatar'],
    });
  }

  async findByAvatarId(avatarId: string): Promise<ProcessingJob[]> {
    return this.repository.find({
      where: { avatarId },
      order: { createdAt: 'DESC' },
    });
  }

  async findLatestByAvatarId(avatarId: string): Promise<ProcessingJob | null> {
    return this.repository.findOne({
      where: { avatarId },
      order: { createdAt: 'DESC' },
    });
  }

  async findByUserId(userId: string): Promise<ProcessingJob[]> {
    return this.repository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
      take: 50, // Limit to recent jobs
    });
  }

  async findByStatus(status: ProcessingJobStatus): Promise<ProcessingJob[]> {
    return this.repository.find({
      where: { status },
      order: { createdAt: 'ASC' },
    });
  }

  async findByStatusAndType(
    status: ProcessingJobStatus,
    jobType: ProcessingJobType,
  ): Promise<ProcessingJob[]> {
    return this.repository.find({
      where: { status, jobType },
      order: { priority: 'DESC', createdAt: 'ASC' },
    });
  }

  async create(data: Partial<ProcessingJob>): Promise<ProcessingJob> {
    const job = this.repository.create(data);
    return this.repository.save(job);
  }

  async update(id: string, data: Partial<ProcessingJob>): Promise<ProcessingJob> {
    await this.repository.update({ id }, data);
    const updated = await this.findById(id);
    if (!updated) {
      throw new Error(`ProcessingJob with id ${id} not found after update`);
    }
    return updated;
  }

  async updateStatus(id: string, status: ProcessingJobStatus): Promise<void> {
    const updateData: Partial<ProcessingJob> = { status };

    switch (status) {
      case ProcessingJobStatus.PROCESSING:
        updateData.startedAt = new Date();
        break;
      case ProcessingJobStatus.COMPLETED:
        updateData.completedAt = new Date();
        break;
      case ProcessingJobStatus.FAILED:
        updateData.failedAt = new Date();
        break;
      case ProcessingJobStatus.CANCELLED:
        updateData.cancelledAt = new Date();
        break;
    }

    await this.repository.update({ id }, updateData);
  }

  async updateProgress(
    id: string,
    progress: number,
    currentStep?: string,
  ): Promise<void> {
    const updateData: Partial<ProcessingJob> = { progress };
    if (currentStep) {
      updateData.currentStep = currentStep;
    }
    await this.repository.update({ id }, updateData);
  }

  async markFailed(id: string, errorMessage: string, errorStack?: string): Promise<void> {
    await this.repository.update(
      { id },
      {
        status: ProcessingJobStatus.FAILED,
        errorMessage,
        errorStack,
        failedAt: new Date(),
      },
    );
  }

  async markCompleted(id: string, resultData?: any): Promise<void> {
    const job = await this.findById(id);
    if (!job) {
      throw new Error(`ProcessingJob with id ${id} not found`);
    }

    const completedAt = new Date();
    const processingDurationMs = job.startedAt
      ? completedAt.getTime() - job.startedAt.getTime()
      : null;

    await this.repository.update(
      { id },
      {
        status: ProcessingJobStatus.COMPLETED,
        progress: 100,
        completedAt,
        processingDurationMs,
        resultData,
      },
    );
  }

  async incrementAttempt(id: string): Promise<void> {
    await this.repository.increment({ id }, 'attemptNumber', 1);
    await this.repository.update(
      { id },
      {
        lastAttemptAt: new Date(),
        status: ProcessingJobStatus.RETRYING,
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

  async deleteCompleted(olderThanHours = 24): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setHours(cutoffDate.getHours() - olderThanHours);

    const result = await this.repository.delete({
      status: ProcessingJobStatus.COMPLETED,
      completedAt: LessThan(cutoffDate),
      keepOnComplete: false,
    });

    return result.affected || 0;
  }

  async deleteFailed(olderThanDays = 7): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

    const result = await this.repository.delete({
      status: ProcessingJobStatus.FAILED,
      failedAt: LessThan(cutoffDate),
    });

    return result.affected || 0;
  }

  async countByStatus(status: ProcessingJobStatus): Promise<number> {
    return this.repository.count({ where: { status } });
  }

  async countActiveJobs(): Promise<number> {
    return this.repository.count({
      where: {
        status: In([
          ProcessingJobStatus.PENDING,
          ProcessingJobStatus.QUEUED,
          ProcessingJobStatus.PROCESSING,
          ProcessingJobStatus.RETRYING,
        ]),
      },
    });
  }

  async findStuckJobs(stuckAfterMinutes = 30): Promise<ProcessingJob[]> {
    const stuckDate = new Date();
    stuckDate.setMinutes(stuckDate.getMinutes() - stuckAfterMinutes);

    return this.repository
      .createQueryBuilder('job')
      .where('job.status = :status', { status: ProcessingJobStatus.PROCESSING })
      .andWhere('job.started_at < :stuckDate', { stuckDate })
      .leftJoinAndSelect('job.avatar', 'avatar')
      .getMany();
  }

  async findJobsForRetry(): Promise<ProcessingJob[]> {
    return this.repository
      .createQueryBuilder('job')
      .where('job.status = :status', { status: ProcessingJobStatus.FAILED })
      .andWhere('job.attempt_number < job.max_attempts')
      .andWhere('job.failed_at > :retryWindow', {
        retryWindow: new Date(Date.now() - 5 * 60 * 1000), // 5 minutes ago
      })
      .leftJoinAndSelect('job.avatar', 'avatar')
      .orderBy('job.priority', 'DESC')
      .addOrderBy('job.created_at', 'ASC')
      .getMany();
  }

  async getJobStatistics(): Promise<{
    total: number;
    pending: number;
    processing: number;
    completed: number;
    failed: number;
    cancelled: number;
    averageProcessingTime: number;
  }> {
    const [
      total,
      pending,
      processing,
      completed,
      failed,
      cancelled,
    ] = await Promise.all([
      this.repository.count(),
      this.countByStatus(ProcessingJobStatus.PENDING),
      this.countByStatus(ProcessingJobStatus.PROCESSING),
      this.countByStatus(ProcessingJobStatus.COMPLETED),
      this.countByStatus(ProcessingJobStatus.FAILED),
      this.countByStatus(ProcessingJobStatus.CANCELLED),
    ]);

    const avgResult = await this.repository
      .createQueryBuilder('job')
      .select('AVG(job.processing_duration_ms)', 'avg')
      .where('job.status = :status', { status: ProcessingJobStatus.COMPLETED })
      .andWhere('job.processing_duration_ms IS NOT NULL')
      .getRawOne();

    const averageProcessingTime = parseInt(avgResult?.avg || '0', 10);

    return {
      total,
      pending,
      processing,
      completed,
      failed,
      cancelled,
      averageProcessingTime,
    };
  }

  async exists(id: string): Promise<boolean> {
    const count = await this.repository.count({ where: { id } });
    return count > 0;
  }

  async isProcessing(avatarId: string): Promise<boolean> {
    const count = await this.repository.count({
      where: {
        avatarId,
        status: In([
          ProcessingJobStatus.PENDING,
          ProcessingJobStatus.QUEUED,
          ProcessingJobStatus.PROCESSING,
        ]),
      },
    });
    return count > 0;
  }
}

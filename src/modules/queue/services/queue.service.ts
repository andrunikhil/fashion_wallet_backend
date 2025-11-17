import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue, Job } from 'bullmq';
import { AvatarProcessingJobData, JobStatus } from '../interfaces/job.interface';

@Injectable()
export class QueueService {
  private readonly logger = new Logger(QueueService.name);

  constructor(
    @InjectQueue('avatar-processing')
    private avatarQueue: Queue,
  ) {}

  async addProcessingJob(
    data: AvatarProcessingJobData,
    priority: number = 5,
  ): Promise<Job> {
    this.logger.log(`Adding processing job for avatar ${data.avatarId}`);

    const job = await this.avatarQueue.add('avatar:process-photos', data, {
      priority,
      jobId: `avatar-${data.avatarId}-${Date.now()}`,
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000,
      },
      removeOnComplete: {
        age: 3600, // Keep for 1 hour
      },
      removeOnFail: {
        age: 86400, // Keep for 24 hours
      },
    });

    this.logger.log(`Job ${job.id} added to queue for avatar ${data.avatarId}`);

    return job;
  }

  async getJob(jobId: string): Promise<Job | undefined> {
    return this.avatarQueue.getJob(jobId);
  }

  async getJobStatus(jobId: string): Promise<JobStatus> {
    const job = await this.getJob(jobId);

    if (!job) {
      throw new NotFoundException(`Job ${jobId} not found`);
    }

    const state = await job.getState();
    const progress = typeof job.progress === 'string'
      ? parseInt(job.progress) || 0
      : job.progress || 0;

    return {
      id: job.id,
      state,
      progress,
      data: job.data,
      returnvalue: job.returnvalue,
      failedReason: job.failedReason,
    };
  }

  async removeJob(jobId: string): Promise<void> {
    const job = await this.getJob(jobId);

    if (job) {
      await job.remove();
      this.logger.log(`Job ${jobId} removed from queue`);
    }
  }

  async getQueueStats(): Promise<any> {
    const [waiting, active, completed, failed, delayed] = await Promise.all([
      this.avatarQueue.getWaitingCount(),
      this.avatarQueue.getActiveCount(),
      this.avatarQueue.getCompletedCount(),
      this.avatarQueue.getFailedCount(),
      this.avatarQueue.getDelayedCount(),
    ]);

    return {
      waiting,
      active,
      completed,
      failed,
      delayed,
      total: waiting + active + completed + failed + delayed,
    };
  }

  async pauseQueue(): Promise<void> {
    await this.avatarQueue.pause();
    this.logger.log('Queue paused');
  }

  async resumeQueue(): Promise<void> {
    await this.avatarQueue.resume();
    this.logger.log('Queue resumed');
  }

  async cleanQueue(grace: number = 0): Promise<void> {
    await this.avatarQueue.clean(grace, 100, 'completed');
    await this.avatarQueue.clean(grace, 100, 'failed');
    this.logger.log('Queue cleaned');
  }
}

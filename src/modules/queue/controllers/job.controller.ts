import {
  Controller,
  Get,
  Delete,
  Param,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { QueueService } from '../services/queue.service';

@Controller('api/v1/jobs')
export class JobController {
  private readonly logger = new Logger(JobController.name);

  constructor(private readonly queueService: QueueService) {}

  @Get(':id')
  async getJobStatus(@Param('id') jobId: string) {
    this.logger.log(`Fetching status for job ${jobId}`);

    try {
      const status = await this.queueService.getJobStatus(jobId);
      return status;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }

      this.logger.error(`Failed to get job status: ${error.message}`);
      throw new NotFoundException(`Job ${jobId} not found`);
    }
  }

  @Delete(':id')
  async cancelJob(@Param('id') jobId: string) {
    this.logger.log(`Canceling job ${jobId}`);

    try {
      await this.queueService.removeJob(jobId);

      return {
        message: `Job ${jobId} has been canceled`,
        jobId,
      };
    } catch (error) {
      this.logger.error(`Failed to cancel job: ${error.message}`);
      throw new NotFoundException(`Job ${jobId} not found`);
    }
  }

  @Get('stats')
  async getQueueStats() {
    this.logger.log('Fetching queue statistics');

    try {
      const stats = await this.queueService.getQueueStats();
      return stats;
    } catch (error) {
      this.logger.error(`Failed to get queue stats: ${error.message}`);
      throw error;
    }
  }
}

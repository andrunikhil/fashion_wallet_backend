import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { QueueService } from './services/queue.service';
import { JobController } from './controllers/job.controller';

@Module({
  imports: [
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        connection: {
          host: configService.get('REDIS_HOST', 'localhost'),
          port: parseInt(configService.get('REDIS_PORT', '6379')),
        },
      }),
      inject: [ConfigService],
    }),
    BullModule.registerQueue({
      name: 'avatar-processing',
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
        removeOnComplete: {
          age: 3600, // Keep for 1 hour
          count: 100, // Keep max 100 completed jobs
        },
        removeOnFail: {
          age: 86400, // Keep for 24 hours
          count: 200, // Keep max 200 failed jobs
        },
      },
    }),
  ],
  controllers: [JobController],
  providers: [QueueService],
  exports: [BullModule, QueueService],
})
export class QueueModule {}

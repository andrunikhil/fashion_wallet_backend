import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { AvatarGateway } from '../gateways/avatar.gateway';

interface StatusUpdateEvent {
  avatarId: string;
  status: string;
  message?: string;
  timestamp: Date;
}

interface ProgressEvent {
  avatarId: string;
  jobId: string;
  progress: number;
  currentStep: string;
  timestamp: Date;
}

interface CompletedEvent {
  avatarId: string;
  userId: string;
  jobId: string;
  processingTime: number;
  bodyType?: string;
  measurements?: any;
}

interface FailedEvent {
  avatarId: string;
  userId: string;
  jobId: string;
  error: string;
  retryable: boolean;
}

@Injectable()
export class AvatarEventSubscriber {
  private readonly logger = new Logger(AvatarEventSubscriber.name);

  constructor(private readonly avatarGateway: AvatarGateway) {}

  @OnEvent('avatar.status.update')
  handleStatusUpdate(payload: StatusUpdateEvent) {
    this.logger.debug(
      `Handling status update for avatar ${payload.avatarId}: ${payload.status}`,
    );

    this.avatarGateway.emitStatusUpdate(payload.avatarId, {
      avatarId: payload.avatarId,
      status: payload.status,
      message: payload.message,
      timestamp: payload.timestamp,
    });
  }

  @OnEvent('avatar.processing.progress')
  handleProgress(payload: ProgressEvent) {
    this.logger.debug(
      `Handling progress update for avatar ${payload.avatarId}: ${payload.progress}%`,
    );

    this.avatarGateway.emitProcessingUpdate(payload.avatarId, {
      avatarId: payload.avatarId,
      progress: payload.progress,
      currentStep: payload.currentStep,
      timestamp: payload.timestamp,
    });
  }

  @OnEvent('avatar.processing.completed')
  handleProcessingComplete(payload: CompletedEvent) {
    this.logger.log(
      `Handling processing completion for avatar ${payload.avatarId}`,
    );

    this.avatarGateway.emitProcessingComplete(payload.avatarId, {
      avatarId: payload.avatarId,
      processingTime: payload.processingTime,
      bodyType: payload.bodyType,
      success: true,
    });

    // Also notify the user
    this.avatarGateway.emitToUser(payload.userId, 'avatar:completed', {
      avatarId: payload.avatarId,
      message: 'Your avatar has been processed successfully',
    });
  }

  @OnEvent('avatar.processing.failed')
  handleProcessingFailed(payload: FailedEvent) {
    this.logger.error(
      `Handling processing failure for avatar ${payload.avatarId}: ${payload.error}`,
    );

    this.avatarGateway.emitProcessingError(payload.avatarId, {
      avatarId: payload.avatarId,
      error: payload.error,
      retryable: payload.retryable,
    });

    // Also notify the user
    this.avatarGateway.emitToUser(payload.userId, 'avatar:failed', {
      avatarId: payload.avatarId,
      error: payload.error,
      retryable: payload.retryable,
    });
  }

  @OnEvent('avatar.measurements.updated')
  handleMeasurementsUpdated(payload: any) {
    this.logger.log(
      `Handling measurements update for avatar ${payload.avatarId}`,
    );

    this.avatarGateway.emitStatusUpdate(payload.avatarId, {
      avatarId: payload.avatarId,
      event: 'measurements_updated',
      measurements: payload.measurements,
      timestamp: new Date(),
    });
  }

  @OnEvent('avatar.regeneration.requested')
  handleRegenerationRequested(payload: any) {
    this.logger.log(
      `Handling regeneration request for avatar ${payload.avatarId}`,
    );

    this.avatarGateway.emitStatusUpdate(payload.avatarId, {
      avatarId: payload.avatarId,
      event: 'regeneration_started',
      reason: payload.reason,
      timestamp: new Date(),
    });
  }
}

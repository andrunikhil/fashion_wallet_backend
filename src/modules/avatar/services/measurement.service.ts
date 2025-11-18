import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { MeasurementRepository } from '../repositories/measurement.repository';
import { AvatarRepository } from '../repositories/avatar.repository';
import { Measurement } from '../../../infrastructure/database/entities/measurement.entity';
import { AvatarStatus } from '../../../infrastructure/database/entities/avatar.entity';
import { UpdateMeasurementDto } from '../dto/update-measurement.dto';

@Injectable()
export class MeasurementService {
  private readonly logger = new Logger(MeasurementService.name);

  constructor(
    private readonly measurementRepo: MeasurementRepository,
    private readonly avatarRepo: AvatarRepository,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * Get measurements for an avatar
   */
  async getMeasurements(avatarId: string, userId: string): Promise<Measurement> {
    // Verify avatar exists and user has access
    const avatar = await this.avatarRepo.findById(avatarId);
    if (!avatar) {
      throw new NotFoundException(`Avatar with id ${avatarId} not found`);
    }

    if (avatar.userId !== userId) {
      throw new ForbiddenException('You do not have access to this avatar');
    }

    const measurements = await this.measurementRepo.findByAvatarId(avatarId);
    if (!measurements) {
      throw new NotFoundException(`No measurements found for avatar ${avatarId}`);
    }

    return measurements;
  }

  /**
   * Update measurements for an avatar
   */
  async updateMeasurements(
    avatarId: string,
    userId: string,
    dto: UpdateMeasurementDto,
  ): Promise<Measurement> {
    this.logger.log(`Updating measurements for avatar ${avatarId}`);

    // Verify avatar exists and user has access
    const avatar = await this.avatarRepo.findById(avatarId);
    if (!avatar) {
      throw new NotFoundException(`Avatar with id ${avatarId} not found`);
    }

    if (avatar.userId !== userId) {
      throw new ForbiddenException('You do not have access to this avatar');
    }

    // Cannot update measurements while avatar is processing
    if (avatar.status === AvatarStatus.PROCESSING) {
      throw new BadRequestException(
        'Cannot update measurements while avatar is being processed',
      );
    }

    // Get existing measurements
    const existingMeasurements = await this.measurementRepo.findByAvatarId(avatarId);
    if (!existingMeasurements) {
      throw new NotFoundException(`No measurements found for avatar ${avatarId}`);
    }

    // Update measurements
    const updateData: Partial<Measurement> = {};

    // Update only provided fields
    if (dto.height !== undefined) updateData.height = dto.height;
    if (dto.weight !== undefined) updateData.weight = dto.weight;
    if (dto.shoulderWidth !== undefined) updateData.shoulderWidth = dto.shoulderWidth;
    if (dto.chestCircumference !== undefined) updateData.chestCircumference = dto.chestCircumference;
    if (dto.bustCircumference !== undefined) updateData.bustCircumference = dto.bustCircumference;
    if (dto.waistCircumference !== undefined) updateData.waistCircumference = dto.waistCircumference;
    if (dto.hipCircumference !== undefined) updateData.hipCircumference = dto.hipCircumference;
    if (dto.armLength !== undefined) updateData.armLength = dto.armLength;
    if (dto.bicepCircumference !== undefined) updateData.bicepCircumference = dto.bicepCircumference;
    if (dto.inseamLength !== undefined) updateData.inseamLength = dto.inseamLength;
    if (dto.thighCircumference !== undefined) updateData.thighCircumference = dto.thighCircumference;
    if (dto.calfCircumference !== undefined) updateData.calfCircumference = dto.calfCircumference;
    if (dto.neckCircumference !== undefined) updateData.neckCircumference = dto.neckCircumference;
    if (dto.wristCircumference !== undefined) updateData.wristCircumference = dto.wristCircumference;
    if (dto.ankleCircumference !== undefined) updateData.ankleCircumference = dto.ankleCircumference;
    if (dto.footLength !== undefined) updateData.footLength = dto.footLength;
    if (dto.footWidth !== undefined) updateData.footWidth = dto.footWidth;

    // Mark measurements as manual source
    updateData.source = 'manual' as any;

    const updatedMeasurements = await this.measurementRepo.update(
      existingMeasurements.id,
      updateData,
    );

    // Emit event
    this.eventEmitter.emit('avatar.measurements.updated', {
      avatarId,
      userId,
      measurementId: updatedMeasurements.id,
      regenerateModel: dto.regenerateModel,
      timestamp: new Date(),
    });

    // TODO: If regenerateModel is true, trigger model regeneration
    if (dto.regenerateModel) {
      this.logger.log(`Model regeneration requested for avatar ${avatarId}`);
      // This would be handled by a separate service/queue
    }

    return updatedMeasurements;
  }

  /**
   * Validate measurements
   */
  async validateMeasurements(measurements: Partial<Measurement>) {
    const errors: any[] = [];
    const warnings: any[] = [];
    const suggestions: any[] = [];

    // Height validation
    if (measurements.height) {
      if (measurements.height < 120 || measurements.height > 250) {
        errors.push({
          field: 'height',
          message: 'Height must be between 120cm and 250cm',
          constraint: 'range',
          currentValue: measurements.height,
          expectedRange: { min: 120, max: 250 },
        });
      }
    }

    // Weight validation
    if (measurements.weight) {
      if (measurements.weight < 30 || measurements.weight > 300) {
        errors.push({
          field: 'weight',
          message: 'Weight must be between 30kg and 300kg',
          constraint: 'range',
          currentValue: measurements.weight,
          expectedRange: { min: 30, max: 300 },
        });
      }
    }

    // Shoulder width validation
    if (measurements.shoulderWidth) {
      if (measurements.shoulderWidth < 30 || measurements.shoulderWidth > 70) {
        errors.push({
          field: 'shoulderWidth',
          message: 'Shoulder width must be between 30cm and 70cm',
          constraint: 'range',
          currentValue: measurements.shoulderWidth,
          expectedRange: { min: 30, max: 70 },
        });
      }
    }

    // Chest circumference validation
    if (measurements.chestCircumference) {
      if (measurements.chestCircumference < 60 || measurements.chestCircumference > 180) {
        errors.push({
          field: 'chestCircumference',
          message: 'Chest circumference must be between 60cm and 180cm',
          constraint: 'range',
          currentValue: measurements.chestCircumference,
          expectedRange: { min: 60, max: 180 },
        });
      }
    }

    // Waist circumference validation
    if (measurements.waistCircumference) {
      if (measurements.waistCircumference < 50 || measurements.waistCircumference > 200) {
        errors.push({
          field: 'waistCircumference',
          message: 'Waist circumference must be between 50cm and 200cm',
          constraint: 'range',
          currentValue: measurements.waistCircumference,
          expectedRange: { min: 50, max: 200 },
        });
      }
    }

    // Hip circumference validation
    if (measurements.hipCircumference) {
      if (measurements.hipCircumference < 60 || measurements.hipCircumference > 200) {
        errors.push({
          field: 'hipCircumference',
          message: 'Hip circumference must be between 60cm and 200cm',
          constraint: 'range',
          currentValue: measurements.hipCircumference,
          expectedRange: { min: 60, max: 200 },
        });
      }
    }

    // Proportional validation
    if (measurements.hipCircumference && measurements.waistCircumference) {
      const ratio = measurements.hipCircumference / measurements.waistCircumference;
      if (ratio < 0.8 || ratio > 1.5) {
        warnings.push({
          field: 'hipToWaist',
          message: 'Hip to waist ratio seems unusual. Please verify measurements.',
          severity: 'medium',
        });
      }
    }

    if (measurements.shoulderWidth && measurements.waistCircumference) {
      const ratio = measurements.shoulderWidth / measurements.waistCircumference;
      if (ratio < 0.3 || ratio > 0.8) {
        warnings.push({
          field: 'shoulderToWaist',
          message: 'Shoulder to waist ratio seems unusual. Please verify measurements.',
          severity: 'medium',
        });
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      suggestions,
    };
  }
}

import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  Measurement,
  MeasurementUnit,
  MeasurementSource,
} from '../../../infrastructure/database/entities/measurement.entity';

@Injectable()
export class MeasurementRepository {
  constructor(
    @InjectRepository(Measurement)
    private readonly repository: Repository<Measurement>,
  ) {}

  async findByAvatarId(avatarId: string): Promise<Measurement | null> {
    return this.repository.findOne({
      where: { avatarId },
      relations: ['avatar'],
    });
  }

  async create(data: Partial<Measurement>): Promise<Measurement> {
    const measurement = this.repository.create(data);
    return this.repository.save(measurement);
  }

  async update(
    id: string,
    data: Partial<Measurement>,
  ): Promise<Measurement> {
    await this.repository.update({ id }, data);
    const updated = await this.repository.findOne({ where: { id } });
    if (!updated) {
      throw new Error(`Measurement with id ${id} not found after update`);
    }
    return updated;
  }

  async updateByAvatarId(
    avatarId: string,
    data: Partial<Measurement>,
  ): Promise<Measurement> {
    const existing = await this.findByAvatarId(avatarId);
    if (!existing) {
      throw new Error(`Measurement for avatar ${avatarId} not found`);
    }
    return this.update(existing.id, data);
  }

  async upsert(
    avatarId: string,
    data: Partial<Measurement>,
  ): Promise<Measurement> {
    const existing = await this.findByAvatarId(avatarId);

    if (existing) {
      return this.update(existing.id, data);
    } else {
      return this.create({ ...data, avatarId });
    }
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.repository.delete(id);
    return result.affected !== null && result.affected > 0;
  }

  async deleteByAvatarId(avatarId: string): Promise<boolean> {
    const result = await this.repository.delete({ avatarId });
    return result.affected !== null && result.affected > 0;
  }

  async updateSingleMeasurement(
    avatarId: string,
    key: keyof Measurement,
    value: number,
  ): Promise<Measurement> {
    const measurement = await this.findByAvatarId(avatarId);
    if (!measurement) {
      throw new Error(`Measurement for avatar ${avatarId} not found`);
    }

    const updateData: Partial<Measurement> = {
      [key]: value,
      source: MeasurementSource.MANUAL,
    };

    return this.update(measurement.id, updateData);
  }

  async convertUnit(
    avatarId: string,
    targetUnit: MeasurementUnit,
  ): Promise<Measurement> {
    const measurement = await this.findByAvatarId(avatarId);
    if (!measurement) {
      throw new Error(`Measurement for avatar ${avatarId} not found`);
    }

    if (measurement.unit === targetUnit) {
      return measurement;
    }

    const conversionFactor = targetUnit === MeasurementUnit.IMPERIAL ? 1 / 2.54 : 2.54;

    const numericFields: (keyof Measurement)[] = [
      'height',
      'shoulderWidth',
      'chestCircumference',
      'bustCircumference',
      'underBustCircumference',
      'waistCircumference',
      'naturalWaistCircumference',
      'hipCircumference',
      'highHipCircumference',
      'armLength',
      'bicepCircumference',
      'wristCircumference',
      'inseamLength',
      'outseamLength',
      'thighCircumference',
      'kneeCircumference',
      'calfCircumference',
      'ankleCircumference',
      'neckCircumference',
      'torsoLength',
      'backLength',
      'footLength',
      'footWidth',
    ];

    const convertedData: Partial<Measurement> = { unit: targetUnit };

    numericFields.forEach(field => {
      const value = measurement[field];
      if (typeof value === 'number') {
        convertedData[field] = Number((value * conversionFactor).toFixed(2));
      }
    });

    // Special handling for weight (kg to lbs or vice versa)
    if (measurement.weight) {
      const weightFactor = targetUnit === MeasurementUnit.IMPERIAL ? 2.20462 : 1 / 2.20462;
      convertedData.weight = Number((measurement.weight * weightFactor).toFixed(2));
    }

    return this.update(measurement.id, convertedData);
  }

  async validateMeasurements(measurements: Partial<Measurement>): Promise<{
    isValid: boolean;
    errors: string[];
  }> {
    const errors: string[] = [];

    // Height validation (metric)
    if (measurements.height) {
      if (measurements.unit === MeasurementUnit.METRIC) {
        if (measurements.height < 140 || measurements.height > 220) {
          errors.push('Height must be between 140cm and 220cm');
        }
      } else {
        if (measurements.height < 55 || measurements.height > 87) {
          errors.push('Height must be between 55 and 87 inches');
        }
      }
    }

    // Chest/Bust validation
    if (measurements.chestCircumference) {
      if (measurements.unit === MeasurementUnit.METRIC) {
        if (measurements.chestCircumference < 70 || measurements.chestCircumference > 150) {
          errors.push('Chest circumference must be between 70cm and 150cm');
        }
      } else {
        if (measurements.chestCircumference < 28 || measurements.chestCircumference > 59) {
          errors.push('Chest circumference must be between 28 and 59 inches');
        }
      }
    }

    // Waist validation
    if (measurements.waistCircumference) {
      if (measurements.unit === MeasurementUnit.METRIC) {
        if (measurements.waistCircumference < 60 || measurements.waistCircumference > 150) {
          errors.push('Waist circumference must be between 60cm and 150cm');
        }
      } else {
        if (measurements.waistCircumference < 24 || measurements.waistCircumference > 59) {
          errors.push('Waist circumference must be between 24 and 59 inches');
        }
      }
    }

    // Hip validation
    if (measurements.hipCircumference) {
      if (measurements.unit === MeasurementUnit.METRIC) {
        if (measurements.hipCircumference < 70 || measurements.hipCircumference > 160) {
          errors.push('Hip circumference must be between 70cm and 160cm');
        }
      } else {
        if (measurements.hipCircumference < 28 || measurements.hipCircumference > 63) {
          errors.push('Hip circumference must be between 28 and 63 inches');
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  async exists(avatarId: string): Promise<boolean> {
    const count = await this.repository.count({ where: { avatarId } });
    return count > 0;
  }

  async findBySource(source: MeasurementSource): Promise<Measurement[]> {
    return this.repository.find({
      where: { source },
      relations: ['avatar'],
    });
  }

  async findLowConfidence(threshold = 0.7): Promise<Measurement[]> {
    return this.repository
      .createQueryBuilder('measurement')
      .where('measurement.confidence_score < :threshold', { threshold })
      .andWhere('measurement.source = :source', { source: MeasurementSource.AUTO })
      .leftJoinAndSelect('measurement.avatar', 'avatar')
      .getMany();
  }
}

import { Injectable } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { Measurement } from '../../../infrastructure/database/entities/measurement.entity';
import { MeasurementResponseDto } from '../dto/measurement-response.dto';

@Injectable()
export class MeasurementSerializer {
  /**
   * Transform a Measurement entity to response DTO
   */
  transformToResponse(measurement: Measurement): MeasurementResponseDto {
    return plainToInstance(MeasurementResponseDto, measurement, {
      excludeExtraneousValues: true,
      enableImplicitConversion: true,
    });
  }

  /**
   * Transform array of measurements
   */
  transformToResponses(measurements: Measurement[]): MeasurementResponseDto[] {
    return measurements.map((m) => this.transformToResponse(m));
  }
}

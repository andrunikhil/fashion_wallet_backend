import {
  Controller,
  Get,
  Put,
  Post,
  Body,
  Param,
  ParseUUIDPipe,
  Logger,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
} from '@nestjs/swagger';
import { MeasurementService } from '../services/measurement.service';
import { MeasurementSerializer } from '../serializers/measurement.serializer';
import { UpdateMeasurementDto } from '../dto/update-measurement.dto';
import { Measurement } from '../../../infrastructure/database/entities/measurement.entity';

// TODO: Add @UseGuards(JwtAuthGuard) and @CurrentUser() decorator once auth is setup
@ApiTags('Measurements')
@Controller('api/v1/avatars/:id/measurements')
export class MeasurementController {
  private readonly logger = new Logger(MeasurementController.name);

  constructor(
    private readonly measurementService: MeasurementService,
    private readonly measurementSerializer: MeasurementSerializer,
  ) {}

  /**
   * GET /api/v1/avatars/:id/measurements
   * Get measurements for an avatar
   */
  @Get()
  @ApiOperation({ summary: 'Get avatar measurements', description: 'Retrieve body measurements for a specific avatar' })
  @ApiParam({ name: 'id', description: 'Avatar ID' })
  @ApiResponse({ status: 200, description: 'Measurements retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Avatar or measurements not found' })
  @ApiResponse({ status: 403, description: 'Access denied' })
  async getMeasurements(
    @Param('id', ParseUUIDPipe) avatarId: string,
    // @CurrentUser() user: User, // TODO: Add when auth is ready
  ) {
    // Temporary: Use hardcoded userId until auth is implemented
    const userId = '00000000-0000-0000-0000-000000000000';

    this.logger.log(`Getting measurements for avatar ${avatarId}`);

    const measurements = await this.measurementService.getMeasurements(avatarId, userId);
    return this.measurementSerializer.transformToResponse(measurements);
  }

  /**
   * PUT /api/v1/avatars/:id/measurements
   * Update measurements for an avatar
   */
  @Put()
  @ApiOperation({ summary: 'Update avatar measurements', description: 'Update body measurements for an avatar. Optionally trigger 3D model regeneration.' })
  @ApiParam({ name: 'id', description: 'Avatar ID' })
  @ApiResponse({ status: 200, description: 'Measurements updated successfully' })
  @ApiResponse({ status: 400, description: 'Invalid measurements or avatar is processing' })
  @ApiResponse({ status: 404, description: 'Avatar or measurements not found' })
  @ApiResponse({ status: 403, description: 'Access denied' })
  async updateMeasurements(
    @Param('id', ParseUUIDPipe) avatarId: string,
    @Body() dto: UpdateMeasurementDto,
    // @CurrentUser() user: User, // TODO: Add when auth is ready
  ) {
    // Temporary: Use hardcoded userId until auth is implemented
    const userId = '00000000-0000-0000-0000-000000000000';

    this.logger.log(`Updating measurements for avatar ${avatarId}`);

    const measurements = await this.measurementService.updateMeasurements(
      avatarId,
      userId,
      dto,
    );
    return this.measurementSerializer.transformToResponse(measurements);
  }

  /**
   * POST /api/v1/avatars/:id/measurements/validate
   * Validate measurements without saving
   */
  @Post('validate')
  @ApiOperation({ summary: 'Validate measurements', description: 'Validate body measurements without saving. Returns validation errors, warnings, and suggestions.' })
  @ApiParam({ name: 'id', description: 'Avatar ID' })
  @ApiResponse({ status: 200, description: 'Validation completed successfully' })
  @ApiResponse({ status: 400, description: 'Invalid request' })
  async validateMeasurements(
    @Param('id', ParseUUIDPipe) avatarId: string,
    @Body() measurements: Partial<Measurement>,
    // @CurrentUser() user: User, // TODO: Add when auth is ready
  ) {
    this.logger.log(`Validating measurements for avatar ${avatarId}`);

    const validationResult = await this.measurementService.validateMeasurements(measurements);
    return validationResult;
  }
}

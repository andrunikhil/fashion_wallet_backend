import {
  Controller,
  Get,
  Param,
  Query,
  StreamableFile,
  NotFoundException,
  Logger,
  ParseUUIDPipe,
} from '@nestjs/common';
import { AvatarModelRepository } from '../repositories/avatar-model.repository';
import { ModelExportService } from '../services/model/model-export.service';

@Controller('api/v1/avatars/:id/model')
export class AvatarModelController {
  private readonly logger = new Logger(AvatarModelController.name);

  constructor(
    private readonly avatarModelRepo: AvatarModelRepository,
    private readonly modelExportService: ModelExportService,
  ) {}

  @Get()
  async getModel(
    @Param('id', ParseUUIDPipe) avatarId: string,
    @Query('format') format: 'gltf' | 'glb' | 'obj' = 'glb',
    @Query('lod') lod: number = 0,
  ): Promise<StreamableFile> {
    this.logger.log(`Fetching model for avatar ${avatarId} in ${format} format, LOD ${lod}`);

    // Get model from database
    const modelData = await this.avatarModelRepo.getModel(avatarId);

    if (!modelData) {
      throw new NotFoundException(`Model not found for avatar ${avatarId}`);
    }

    // Export to requested format
    let buffer: Buffer;

    switch (format) {
      case 'gltf':
        buffer = await this.modelExportService.exportToGLTF(modelData as any);
        break;
      case 'obj':
        buffer = await this.modelExportService.exportToOBJ(modelData as any);
        break;
      case 'glb':
      default:
        buffer = await this.modelExportService.exportToGLB(modelData as any);
        break;
    }

    const contentType = format === 'gltf' ? 'model/gltf+json' :
                       format === 'obj' ? 'model/obj' : 'model/gltf-binary';

    return new StreamableFile(buffer, {
      type: contentType,
      disposition: `attachment; filename="avatar-${avatarId}.${format}"`,
    });
  }

  @Get('info')
  async getModelInfo(@Param('id', ParseUUIDPipe) avatarId: string) {
    this.logger.log(`Fetching model info for avatar ${avatarId}`);

    const modelData = await this.avatarModelRepo.getModel(avatarId);

    if (!modelData) {
      throw new NotFoundException(`Model not found for avatar ${avatarId}`);
    }

    const size = await this.avatarModelRepo.getModelSize(avatarId);

    return {
      avatarId,
      vertexCount: modelData.mesh?.vertexCount || 0,
      faceCount: modelData.mesh?.faceCount || 0,
      size,
      createdAt: modelData.createdAt,
      updatedAt: modelData.updatedAt,
    };
  }
}

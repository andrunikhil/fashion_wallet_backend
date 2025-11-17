import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CanvasSettings } from '../entities/canvas-settings.entity';

@Injectable()
export class CanvasSettingsRepository {
  constructor(
    @InjectRepository(CanvasSettings)
    private readonly canvasSettingsRepo: Repository<CanvasSettings>,
  ) {}

  async create(settings: Partial<CanvasSettings>): Promise<CanvasSettings> {
    const newSettings = this.canvasSettingsRepo.create(settings);
    return this.canvasSettingsRepo.save(newSettings);
  }

  async findByDesignId(designId: string): Promise<CanvasSettings | null> {
    return this.canvasSettingsRepo.findOne({ where: { designId } });
  }

  async update(
    designId: string,
    updates: Partial<CanvasSettings>,
  ): Promise<CanvasSettings | null> {
    await this.canvasSettingsRepo.update({ designId }, updates);
    return this.findByDesignId(designId);
  }

  async delete(designId: string): Promise<boolean> {
    const result = await this.canvasSettingsRepo.delete({ designId });
    return result.affected > 0;
  }

  async createDefault(designId: string): Promise<CanvasSettings> {
    return this.create({
      designId,
      camera: {
        position: { x: 0, y: 1.6, z: 3 },
        target: { x: 0, y: 1, z: 0 },
        fov: 50,
      },
      lighting: {
        preset: 'studio',
      },
      background: {
        type: 'color',
        value: '#f0f0f0',
      },
      showGrid: false,
      showGuides: false,
      snapToGrid: false,
      gridSize: 10,
      renderQuality: 'standard',
      antialiasing: true,
      shadows: true,
      ambientOcclusion: false,
    });
  }
}

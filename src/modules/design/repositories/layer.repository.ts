import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Layer } from '../entities/layer.entity';

@Injectable()
export class LayerRepository {
  constructor(
    @InjectRepository(Layer)
    private readonly layerRepo: Repository<Layer>,
  ) {}

  async create(layer: Partial<Layer>): Promise<Layer> {
    const newLayer = this.layerRepo.create(layer);
    return this.layerRepo.save(newLayer);
  }

  async findById(id: string): Promise<Layer | null> {
    return this.layerRepo.findOne({ where: { id } });
  }

  async findByDesignId(designId: string): Promise<Layer[]> {
    return this.layerRepo.find({
      where: { designId },
      order: { orderIndex: 'ASC' },
    });
  }

  async findByIds(ids: string[]): Promise<Layer[]> {
    return this.layerRepo.find({
      where: { id: In(ids) },
      order: { orderIndex: 'ASC' },
    });
  }

  async update(id: string, updates: Partial<Layer>): Promise<Layer | null> {
    await this.layerRepo.update({ id }, updates);
    return this.findById(id);
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.layerRepo.delete({ id });
    return result.affected > 0;
  }

  async deleteByDesignId(designId: string): Promise<number> {
    const result = await this.layerRepo.delete({ designId });
    return result.affected || 0;
  }

  async getMaxOrderIndex(designId: string): Promise<number> {
    const result = await this.layerRepo
      .createQueryBuilder('layer')
      .select('MAX(layer.order_index)', 'maxOrder')
      .where('layer.design_id = :designId', { designId })
      .getRawOne();

    return result?.maxOrder || 0;
  }

  async reorderLayers(updates: Array<{ id: string; orderIndex: number }>): Promise<void> {
    await Promise.all(
      updates.map(({ id, orderIndex }) =>
        this.layerRepo.update({ id }, { orderIndex }),
      ),
    );
  }

  async bulkCreate(layers: Partial<Layer>[]): Promise<Layer[]> {
    const newLayers = this.layerRepo.create(layers);
    return this.layerRepo.save(newLayers);
  }

  async countByDesignId(designId: string): Promise<number> {
    return this.layerRepo.count({ where: { designId } });
  }

  async findByCatalogItemId(catalogItemId: string): Promise<Layer[]> {
    return this.layerRepo.find({
      where: { catalogItemId },
    });
  }
}

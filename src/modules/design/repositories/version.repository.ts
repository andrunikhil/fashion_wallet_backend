import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Version } from '../entities/version.entity';

@Injectable()
export class VersionRepository {
  constructor(
    @InjectRepository(Version)
    private readonly versionRepo: Repository<Version>,
  ) {}

  async create(version: Partial<Version>): Promise<Version> {
    const newVersion = this.versionRepo.create(version);
    return this.versionRepo.save(newVersion);
  }

  async findById(id: string): Promise<Version | null> {
    return this.versionRepo.findOne({ where: { id } });
  }

  async findByDesignId(designId: string, limit?: number): Promise<Version[]> {
    const query = this.versionRepo.find({
      where: { designId },
      order: { versionNumber: 'DESC' },
    });

    if (limit) {
      return (await query).slice(0, limit);
    }

    return query;
  }

  async findByVersionNumber(
    designId: string,
    versionNumber: number,
  ): Promise<Version | null> {
    return this.versionRepo.findOne({
      where: { designId, versionNumber },
    });
  }

  async getLatestVersion(designId: string): Promise<Version | null> {
    return this.versionRepo.findOne({
      where: { designId },
      order: { versionNumber: 'DESC' },
    });
  }

  async getNextVersionNumber(designId: string): Promise<number> {
    const latest = await this.getLatestVersion(designId);
    return latest ? latest.versionNumber + 1 : 1;
  }

  async deleteByDesignId(designId: string): Promise<number> {
    const result = await this.versionRepo.delete({ designId });
    return result.affected || 0;
  }

  async countByDesignId(designId: string): Promise<number> {
    return this.versionRepo.count({ where: { designId } });
  }
}

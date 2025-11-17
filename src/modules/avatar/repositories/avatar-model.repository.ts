import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  AvatarModel,
  AvatarModelDocument,
} from '../schemas/avatar-model.schema';

@Injectable()
export class AvatarModelRepository {
  constructor(
    @InjectModel(AvatarModel.name)
    private readonly model: Model<AvatarModelDocument>,
  ) {}

  async findByAvatarId(avatarId: string): Promise<AvatarModel | null> {
    return this.model.findOne({ avatarId }).exec();
  }

  async create(data: Partial<AvatarModel>): Promise<AvatarModel> {
    const model = new this.model(data);
    return model.save();
  }

  async upsert(avatarId: string, data: Partial<AvatarModel>): Promise<AvatarModel> {
    const existing = await this.findByAvatarId(avatarId);

    if (existing) {
      return this.update(avatarId, data);
    } else {
      return this.create({ ...data, avatarId });
    }
  }

  async update(avatarId: string, data: Partial<AvatarModel>): Promise<AvatarModel> {
    const result = await this.model
      .findOneAndUpdate(
        { avatarId },
        {
          $set: {
            ...data,
            updatedAt: new Date(),
          },
        },
        { new: true },
      )
      .exec();

    if (!result) {
      throw new Error(`Avatar model for avatarId ${avatarId} not found`);
    }

    return result;
  }

  async saveMesh(
    avatarId: string,
    meshData: any,
  ): Promise<void> {
    await this.model
      .updateOne(
        { avatarId },
        {
          $set: {
            mesh: meshData,
            updatedAt: new Date(),
          },
        },
        { upsert: true },
      )
      .exec();
  }

  async saveLODs(avatarId: string, lods: any[]): Promise<void> {
    await this.model
      .updateOne(
        { avatarId },
        {
          $set: {
            lod: lods,
            updatedAt: new Date(),
          },
        },
      )
      .exec();
  }

  async addLOD(avatarId: string, lodLevel: any): Promise<void> {
    await this.model
      .updateOne(
        { avatarId },
        {
          $push: {
            lod: lodLevel,
          },
          $set: {
            updatedAt: new Date(),
          },
        },
      )
      .exec();
  }

  async getLOD(avatarId: string, level: number): Promise<any | null> {
    const model = await this.model
      .findOne(
        { avatarId },
        { lod: { $elemMatch: { level } } },
      )
      .exec();

    return model?.lod?.[0] || null;
  }

  async saveTextures(avatarId: string, textures: any): Promise<void> {
    await this.model
      .updateOne(
        { avatarId },
        {
          $set: {
            textures,
            updatedAt: new Date(),
          },
        },
      )
      .exec();
  }

  async saveSkeleton(avatarId: string, skeleton: any): Promise<void> {
    await this.model
      .updateOne(
        { avatarId },
        {
          $set: {
            skeleton,
            updatedAt: new Date(),
          },
        },
      )
      .exec();
  }

  async saveExportFormat(
    avatarId: string,
    format: string,
    exportData: { url: string; s3Key: string; sizeBytes: number },
  ): Promise<void> {
    await this.model
      .updateOne(
        { avatarId },
        {
          $set: {
            [`exportFormats.${format}`]: exportData,
            updatedAt: new Date(),
          },
        },
      )
      .exec();
  }

  async getExportFormat(avatarId: string, format: string): Promise<any | null> {
    const model = await this.model
      .findOne({ avatarId })
      .select(`exportFormats.${format}`)
      .exec();

    return model?.exportFormats?.[format] || null;
  }

  async delete(avatarId: string): Promise<boolean> {
    const result = await this.model.deleteOne({ avatarId }).exec();
    return result.deletedCount > 0;
  }

  async exists(avatarId: string): Promise<boolean> {
    const count = await this.model.countDocuments({ avatarId }).exec();
    return count > 0;
  }

  async getModelSize(avatarId: string): Promise<number> {
    const model = await this.model
      .findOne({ avatarId })
      .select('totalSizeBytes')
      .exec();

    return model?.totalSizeBytes || 0;
  }

  async updateAccessTracking(avatarId: string): Promise<void> {
    await this.model
      .updateOne(
        { avatarId },
        {
          $inc: { accessCount: 1 },
          $set: { lastAccessedAt: new Date() },
        },
      )
      .exec();
  }

  async getQuality(avatarId: string): Promise<any | null> {
    const model = await this.model
      .findOne({ avatarId })
      .select('quality')
      .exec();

    return model?.quality || null;
  }

  async setQuality(avatarId: string, quality: any): Promise<void> {
    await this.model
      .updateOne(
        { avatarId },
        {
          $set: {
            quality,
            updatedAt: new Date(),
          },
        },
      )
      .exec();
  }

  async incrementVersion(avatarId: string, previousVersionId?: string): Promise<number> {
    const result = await this.model
      .findOneAndUpdate(
        { avatarId },
        {
          $inc: { version: 1 },
          $set: {
            previousVersionId: previousVersionId || null,
            updatedAt: new Date(),
          },
        },
        { new: true },
      )
      .select('version')
      .exec();

    return result?.version || 1;
  }

  async findByBodyType(bodyType: string, limit = 10): Promise<AvatarModel[]> {
    return this.model
      .find({ 'generationMetadata.bodyType': bodyType })
      .sort({ createdAt: -1 })
      .limit(limit)
      .exec();
  }

  async findLargeModels(sizeThresholdBytes: number): Promise<AvatarModel[]> {
    return this.model
      .find({ totalSizeBytes: { $gt: sizeThresholdBytes } })
      .select('avatarId totalSizeBytes createdAt')
      .sort({ totalSizeBytes: -1 })
      .exec();
  }

  async findOldUnaccessed(daysOld: number): Promise<AvatarModel[]> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    return this.model
      .find({
        $or: [
          { lastAccessedAt: { $lt: cutoffDate } },
          { lastAccessedAt: null, createdAt: { $lt: cutoffDate } },
        ],
      })
      .select('avatarId lastAccessedAt createdAt totalSizeBytes')
      .exec();
  }

  async getStatistics(): Promise<{
    total: number;
    totalSize: number;
    averageSize: number;
    withLODs: number;
    withTextures: number;
    byBodyType: Record<string, number>;
  }> {
    const [
      total,
      sizeStats,
      withLODs,
      withTextures,
      bodyTypeStats,
    ] = await Promise.all([
      this.model.countDocuments().exec(),
      this.model.aggregate([
        {
          $group: {
            _id: null,
            totalSize: { $sum: '$totalSizeBytes' },
            avgSize: { $avg: '$totalSizeBytes' },
          },
        },
      ]).exec(),
      this.model.countDocuments({ lod: { $exists: true, $ne: [] } }).exec(),
      this.model.countDocuments({ textures: { $exists: true } }).exec(),
      this.model.aggregate([
        {
          $group: {
            _id: '$generationMetadata.bodyType',
            count: { $sum: 1 },
          },
        },
      ]).exec(),
    ]);

    const byBodyType: Record<string, number> = {};
    bodyTypeStats.forEach((stat: any) => {
      if (stat._id) {
        byBodyType[stat._id] = stat.count;
      }
    });

    return {
      total,
      totalSize: sizeStats[0]?.totalSize || 0,
      averageSize: Math.round(sizeStats[0]?.avgSize || 0),
      withLODs,
      withTextures,
      byBodyType,
    };
  }

  async cleanupOrphaned(existingAvatarIds: string[]): Promise<number> {
    const result = await this.model
      .deleteMany({
        avatarId: { $nin: existingAvatarIds },
      })
      .exec();

    return result.deletedCount;
  }
}

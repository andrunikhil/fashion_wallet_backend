import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  DesignSnapshot,
  DesignSnapshotDocument,
} from '../../../infrastructure/database/schemas/design-snapshot.schema';
import {
  DesignAutosave,
  DesignAutosaveDocument,
} from '../../../infrastructure/database/schemas/design-autosave.schema';
import {
  RenderCache,
  RenderCacheDocument,
} from '../../../infrastructure/database/schemas/render-cache.schema';

@Injectable()
export class SnapshotRepository {
  constructor(
    @InjectModel(DesignSnapshot.name)
    private snapshotModel: Model<DesignSnapshotDocument>,
    @InjectModel(DesignAutosave.name)
    private autosaveModel: Model<DesignAutosaveDocument>,
    @InjectModel(RenderCache.name)
    private renderCacheModel: Model<RenderCacheDocument>,
  ) {}

  // Design Snapshots
  async createSnapshot(snapshot: Partial<DesignSnapshot>): Promise<DesignSnapshot> {
    const created = new this.snapshotModel(snapshot);
    return created.save();
  }

  async findSnapshotByVersionId(versionId: string): Promise<DesignSnapshot | null> {
    return this.snapshotModel.findOne({ versionId }).exec();
  }

  async findSnapshotsByDesignId(designId: string, limit?: number): Promise<DesignSnapshot[]> {
    const query = this.snapshotModel
      .find({ designId })
      .sort({ createdAt: -1 });

    if (limit) {
      query.limit(limit);
    }

    return query.exec();
  }

  async deleteSnapshotsByDesignId(designId: string): Promise<number> {
    const result = await this.snapshotModel.deleteMany({ designId }).exec();
    return result.deletedCount || 0;
  }

  // Auto-saves
  async createAutosave(autosave: Partial<DesignAutosave>): Promise<DesignAutosave> {
    const created = new this.autosaveModel(autosave);
    return created.save();
  }

  async findLatestAutosave(designId: string): Promise<DesignAutosave | null> {
    return this.autosaveModel
      .findOne({ designId })
      .sort({ createdAt: -1 })
      .exec();
  }

  async findAutosavesByDesignId(designId: string, limit?: number): Promise<DesignAutosave[]> {
    const query = this.autosaveModel
      .find({ designId })
      .sort({ createdAt: -1 });

    if (limit) {
      query.limit(limit);
    }

    return query.exec();
  }

  async deleteOldAutosaves(designId: string, keepCount: number = 5): Promise<number> {
    const autosaves = await this.autosaveModel
      .find({ designId })
      .sort({ createdAt: -1 })
      .skip(keepCount)
      .exec();

    if (autosaves.length === 0) {
      return 0;
    }

    const idsToDelete = autosaves.map((a) => a._id);
    const result = await this.autosaveModel
      .deleteMany({ _id: { $in: idsToDelete } })
      .exec();

    return result.deletedCount || 0;
  }

  // Render Cache
  async findRenderCacheByHash(renderHash: string): Promise<RenderCache | null> {
    const cache = await this.renderCacheModel.findOne({ renderHash }).exec();

    if (cache) {
      // Update hit count and last accessed
      await this.renderCacheModel.updateOne(
        { _id: cache._id },
        {
          $inc: { hitCount: 1 },
          $set: { lastAccessed: new Date() }
        }
      ).exec();
    }

    return cache;
  }

  async createRenderCache(cache: Partial<RenderCache>): Promise<RenderCache> {
    const created = new this.renderCacheModel(cache);
    return created.save();
  }

  async updateRenderCache(renderHash: string, imageUrl: string): Promise<void> {
    await this.renderCacheModel.updateOne(
      { renderHash },
      {
        imageUrl,
        lastAccessed: new Date()
      }
    ).exec();
  }

  async deleteRenderCache(renderHash: string): Promise<boolean> {
    const result = await this.renderCacheModel.deleteOne({ renderHash }).exec();
    return result.deletedCount > 0;
  }

  async cleanupExpiredRenderCache(daysOld: number = 30): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    const result = await this.renderCacheModel.deleteMany({
      lastAccessed: { $lt: cutoffDate }
    }).exec();

    return result.deletedCount || 0;
  }
}

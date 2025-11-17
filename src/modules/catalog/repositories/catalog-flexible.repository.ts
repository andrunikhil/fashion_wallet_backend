import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CatalogFlexible, CatalogFlexibleDocument } from '../schemas/catalog-flexible.schema';

@Injectable()
export class CatalogFlexibleRepository {
  constructor(
    @InjectModel(CatalogFlexible.name)
    private catalogFlexibleModel: Model<CatalogFlexibleDocument>,
  ) {}

  async create(data: Partial<CatalogFlexible>): Promise<CatalogFlexibleDocument> {
    const created = new this.catalogFlexibleModel(data);
    return created.save();
  }

  async findByCatalogId(catalogId: string): Promise<CatalogFlexibleDocument | null> {
    return this.catalogFlexibleModel.findOne({ catalogId }).exec();
  }

  async update(
    catalogId: string,
    data: Partial<CatalogFlexible>,
  ): Promise<CatalogFlexibleDocument | null> {
    return this.catalogFlexibleModel
      .findOneAndUpdate({ catalogId }, { $set: data }, { new: true })
      .exec();
  }

  async delete(catalogId: string): Promise<boolean> {
    const result = await this.catalogFlexibleModel.deleteOne({ catalogId }).exec();
    return result.deletedCount > 0;
  }

  async incrementView(catalogId: string): Promise<void> {
    await this.catalogFlexibleModel
      .updateOne(
        { catalogId },
        {
          $inc: { 'analytics.views': 1 },
          $set: { 'analytics.lastUpdated': new Date() },
        },
      )
      .exec();
  }

  async incrementUse(catalogId: string): Promise<void> {
    await this.catalogFlexibleModel
      .updateOne(
        { catalogId },
        {
          $inc: { 'analytics.uses': 1 },
          $set: { 'analytics.lastUpdated': new Date() },
        },
      )
      .exec();
  }

  async incrementFavorite(catalogId: string): Promise<void> {
    await this.catalogFlexibleModel
      .updateOne(
        { catalogId },
        {
          $inc: { 'analytics.favorites': 1 },
          $set: { 'analytics.lastUpdated': new Date() },
        },
      )
      .exec();
  }

  async decrementFavorite(catalogId: string): Promise<void> {
    await this.catalogFlexibleModel
      .updateOne(
        { catalogId },
        {
          $inc: { 'analytics.favorites': -1 },
          $set: { 'analytics.lastUpdated': new Date() },
        },
      )
      .exec();
  }

  async updateRating(catalogId: string, rating: number): Promise<void> {
    await this.catalogFlexibleModel
      .updateOne(
        { catalogId },
        {
          $set: {
            'analytics.rating': rating,
            'analytics.lastUpdated': new Date(),
          },
        },
      )
      .exec();
  }

  async findByType(
    type: string,
    limit: number = 100,
  ): Promise<CatalogFlexibleDocument[]> {
    return this.catalogFlexibleModel
      .find({ type })
      .sort({ 'analytics.rating': -1 })
      .limit(limit)
      .exec();
  }

  async searchByTerms(
    searchTerms: string[],
    limit: number = 100,
  ): Promise<CatalogFlexibleDocument[]> {
    return this.catalogFlexibleModel
      .find({ searchTerms: { $in: searchTerms } })
      .sort({ 'analytics.rating': -1 })
      .limit(limit)
      .exec();
  }

  async findByColorTags(
    colorTags: string[],
    limit: number = 100,
  ): Promise<CatalogFlexibleDocument[]> {
    return this.catalogFlexibleModel
      .find({ colorTags: { $in: colorTags } })
      .sort({ 'analytics.rating': -1 })
      .limit(limit)
      .exec();
  }
}

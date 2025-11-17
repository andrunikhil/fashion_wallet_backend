import { Model, Document, FilterQuery, UpdateQuery, ClientSession } from 'mongoose';
import { BaseRepository } from './base.repository';
import { FindOptions } from '../interfaces/repository.interface';

export class MongoRepository<T extends Document> extends BaseRepository<T> {
  constructor(
    private readonly model: Model<T>,
  ) {
    super();
  }

  async findById(id: string): Promise<T | null> {
    return this.model.findById(id).exec();
  }

  async findAll(options?: FindOptions): Promise<T[]> {
    let query = this.model.find();

    if (options?.where) {
      query = query.where(options.where as FilterQuery<T>);
    }

    if (options?.skip) {
      query = query.skip(options.skip);
    }

    if (options?.limit) {
      query = query.limit(options.limit);
    }

    if (options?.sort) {
      query = query.sort(options.sort);
    }

    return query.exec();
  }

  async findOne(conditions: Record<string, any>): Promise<T | null> {
    return this.model.findOne(conditions as FilterQuery<T>).exec();
  }

  async create(data: Partial<T>): Promise<T> {
    const entity = new this.model(data);
    return entity.save();
  }

  async update(id: string, data: Partial<T>): Promise<T> {
    const updated = await this.model
      .findByIdAndUpdate(id, data as UpdateQuery<T>, { new: true })
      .exec();

    if (!updated) {
      throw new Error(`Entity with id ${id} not found`);
    }

    return updated;
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.model.findByIdAndDelete(id).exec();
    return !!result;
  }

  async softDelete(id: string): Promise<boolean> {
    const result = await this.model
      .findByIdAndUpdate(
        id,
        { deletedAt: new Date() } as UpdateQuery<T>,
        { new: true },
      )
      .exec();

    return !!result;
  }

  async count(conditions?: Record<string, any>): Promise<number> {
    if (conditions) {
      return this.model.countDocuments(conditions as FilterQuery<T>).exec();
    }
    return this.model.countDocuments().exec();
  }

  async transaction<R>(
    work: (session: ClientSession) => Promise<R>,
  ): Promise<R> {
    const session = await this.model.db.startSession();
    session.startTransaction();

    try {
      const result = await work(session);
      await session.commitTransaction();
      return result;
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  getModel(): Model<T> {
    return this.model;
  }
}

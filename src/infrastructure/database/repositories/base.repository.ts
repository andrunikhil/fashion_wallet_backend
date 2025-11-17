import { FindOptions, IBaseRepository } from '../interfaces/repository.interface';

export abstract class BaseRepository<T> implements IBaseRepository<T> {
  abstract findById(id: string): Promise<T | null>;
  abstract findAll(options?: FindOptions): Promise<T[]>;
  abstract findOne(conditions: Record<string, any>): Promise<T | null>;
  abstract create(data: Partial<T>): Promise<T>;
  abstract update(id: string, data: Partial<T>): Promise<T>;
  abstract delete(id: string): Promise<boolean>;
  abstract count(conditions?: Record<string, any>): Promise<number>;
}

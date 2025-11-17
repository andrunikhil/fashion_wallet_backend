import { Repository, EntityManager, FindOptionsWhere, FindManyOptions } from 'typeorm';
import { BaseRepository } from './base.repository';
import { FindOptions } from '../interfaces/repository.interface';

export class PostgresRepository<T extends { id: string }> extends BaseRepository<T> {
  constructor(
    private readonly repository: Repository<T>,
  ) {
    super();
  }

  async findById(id: string): Promise<T | null> {
    return this.repository.findOne({
      where: { id } as FindOptionsWhere<T>,
    });
  }

  async findAll(options?: FindOptions): Promise<T[]> {
    const findOptions: FindManyOptions<T> = {};

    if (options?.where) {
      findOptions.where = options.where as FindOptionsWhere<T>;
    }

    if (options?.skip) {
      findOptions.skip = options.skip;
    }

    if (options?.limit) {
      findOptions.take = options.limit;
    }

    if (options?.sort) {
      findOptions.order = options.sort as any;
    }

    return this.repository.find(findOptions);
  }

  async findOne(conditions: Record<string, any>): Promise<T | null> {
    return this.repository.findOne({
      where: conditions as FindOptionsWhere<T>,
    });
  }

  async create(data: Partial<T>): Promise<T> {
    const entity = this.repository.create(data as any);
    const saved = await this.repository.save(entity);
    return saved as unknown as T;
  }

  async update(id: string, data: Partial<T>): Promise<T> {
    await this.repository.update({ id } as FindOptionsWhere<T>, data as any);
    const updated = await this.findById(id);
    if (!updated) {
      throw new Error(`Entity with id ${id} not found`);
    }
    return updated;
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.repository.delete({ id } as FindOptionsWhere<T>);
    return result.affected > 0;
  }

  async softDelete(id: string): Promise<boolean> {
    const result = await this.repository.softDelete({ id } as FindOptionsWhere<T>);
    return result.affected > 0;
  }

  async count(conditions?: Record<string, any>): Promise<number> {
    return this.repository.count({
      where: conditions as FindOptionsWhere<T>,
    });
  }

  async transaction<R>(
    work: (entityManager: EntityManager) => Promise<R>,
  ): Promise<R> {
    return this.repository.manager.transaction(work);
  }

  getRepository(): Repository<T> {
    return this.repository;
  }
}

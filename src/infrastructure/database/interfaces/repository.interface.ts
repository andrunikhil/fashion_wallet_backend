export interface FindOptions {
  skip?: number;
  limit?: number;
  sort?: Record<string, 1 | -1>;
  where?: Record<string, any>;
}

export interface IBaseRepository<T> {
  findById(id: string): Promise<T | null>;
  findAll(options?: FindOptions): Promise<T[]>;
  findOne(conditions: Record<string, any>): Promise<T | null>;
  create(data: Partial<T>): Promise<T>;
  update(id: string, data: Partial<T>): Promise<T>;
  delete(id: string): Promise<boolean>;
  count(conditions?: Record<string, any>): Promise<number>;
}

export interface ITransactionRepository<T> extends IBaseRepository<T> {
  transaction<R>(work: (repository: IBaseRepository<T>) => Promise<R>): Promise<R>;
}

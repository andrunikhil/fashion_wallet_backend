export interface IPaginationOptions {
  page?: number;
  limit?: number;
}

export interface IPaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface IPaginatedResult<T> {
  items: T[];
  pagination: IPaginationMeta;
}

export interface IFindAllOptions extends IPaginationOptions {
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
  filters?: Record<string, any>;
}

export interface IRepositoryFindResult<T> {
  items: T[];
  total: number;
}

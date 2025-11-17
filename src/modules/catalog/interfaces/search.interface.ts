import { CatalogItemType, SortField, SortOrder } from '../dto/catalog-filter.dto';
import { ICatalogItem } from './catalog-item.interface';

export interface ISearchFilters {
  category?: string[];
  tags?: string[];
  colors?: string[];
  occasions?: string[];
  seasons?: string[];
  priceRange?: {
    min: number;
    max: number;
  };
  brandPartner?: string;
  type?: CatalogItemType;
  isFeatured?: boolean;
  isActive?: boolean;
}

export interface ISearchRequest {
  query?: string;
  filters?: ISearchFilters;
  page?: number;
  limit?: number;
  sortBy?: SortField;
  sortOrder?: SortOrder;
}

export interface ISearchFacet {
  value: string;
  count: number;
}

export interface ISearchFacets {
  categories: ISearchFacet[];
  colors: ISearchFacet[];
  occasions: ISearchFacet[];
  seasons: ISearchFacet[];
  brands: ISearchFacet[];
  priceRange?: {
    min: number;
    max: number;
    avg: number;
  };
}

export interface ISearchResponse {
  items: ICatalogItem[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
  facets?: ISearchFacets;
  suggestions?: string[];
  took?: number; // Search time in milliseconds
}

export interface IVisualSearchRequest {
  imageBuffer: Buffer;
  filters?: ISearchFilters;
  topK?: number;
}

export interface IVisualSearchResult {
  item: ICatalogItem;
  similarity: number; // 0-100
  matchReason: string;
}

export interface IVisualSearchResponse {
  items: IVisualSearchResult[];
  took?: number;
}

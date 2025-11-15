import { Injectable } from '@nestjs/common';

@Injectable()
export class CatalogService {
  getSilhouettes(filters: any) {
    return {
      message: 'Catalog service - Get silhouettes',
      filters,
      data: [],
    };
  }

  getFabrics(filters: any) {
    return {
      message: 'Catalog service - Get fabrics',
      filters,
      data: [],
    };
  }

  getPatterns(filters: any) {
    return {
      message: 'Catalog service - Get patterns',
      filters,
      data: [],
    };
  }

  search(query: string) {
    return {
      message: 'Catalog service - Search catalog',
      query,
      results: [],
    };
  }

  getRecommendations(params: any) {
    return {
      message: 'Catalog service - Get recommendations',
      params,
      recommendations: [],
    };
  }
}

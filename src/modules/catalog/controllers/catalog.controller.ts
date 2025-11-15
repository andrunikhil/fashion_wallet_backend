import { Controller, Get, Query } from '@nestjs/common';
import { CatalogService } from '../services/catalog.service';

@Controller('catalog')
export class CatalogController {
  constructor(private readonly catalogService: CatalogService) {}

  @Get('silhouettes')
  getSilhouettes(@Query() filters: any) {
    return this.catalogService.getSilhouettes(filters);
  }

  @Get('fabrics')
  getFabrics(@Query() filters: any) {
    return this.catalogService.getFabrics(filters);
  }

  @Get('patterns')
  getPatterns(@Query() filters: any) {
    return this.catalogService.getPatterns(filters);
  }

  @Get('search')
  search(@Query('q') query: string) {
    return this.catalogService.search(query);
  }

  @Get('recommendations')
  getRecommendations(@Query() params: any) {
    return this.catalogService.getRecommendations(params);
  }
}

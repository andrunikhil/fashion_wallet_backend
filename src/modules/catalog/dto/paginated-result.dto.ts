import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsPositive, Min } from 'class-validator';

export class PaginationDto {
  @ApiProperty({ description: 'Page number (1-indexed)', example: 1, default: 1 })
  @IsInt()
  @IsPositive()
  @Min(1)
  page?: number = 1;

  @ApiProperty({ description: 'Number of items per page', example: 24, default: 24 })
  @IsInt()
  @IsPositive()
  @Min(1)
  limit?: number = 24;
}

export class PaginationMetaDto {
  @ApiProperty({ description: 'Total number of items', example: 100 })
  total: number;

  @ApiProperty({ description: 'Current page number', example: 1 })
  page: number;

  @ApiProperty({ description: 'Items per page', example: 24 })
  limit: number;

  @ApiProperty({ description: 'Total number of pages', example: 5 })
  totalPages: number;

  @ApiProperty({ description: 'Whether there is a next page', example: true })
  hasNextPage: boolean;

  @ApiProperty({ description: 'Whether there is a previous page', example: false })
  hasPreviousPage: boolean;
}

export class PaginatedResultDto<T> {
  @ApiProperty({ description: 'Array of items', type: () => Array })
  items: T[];

  @ApiProperty({ description: 'Pagination metadata', type: PaginationMetaDto })
  pagination: PaginationMetaDto;

  constructor(items: T[], page: number, limit: number, total: number) {
    this.items = items;
    const totalPages = Math.ceil(total / limit);
    this.pagination = {
      total,
      page,
      limit,
      totalPages,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1,
    };
  }
}

import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { UserFavorite } from '../entities/user-favorite.entity';

@Injectable()
export class UserFavoriteRepository extends Repository<UserFavorite> {
  constructor(
    @InjectDataSource() private dataSource: DataSource,
  ) {
    super(UserFavorite, dataSource.createEntityManager());
  }

  async findByUserId(userId: string, page: number = 1, limit: number = 24): Promise<{
    favorites: UserFavorite[];
    total: number;
  }> {
    const [favorites, total] = await this.findAndCount({
      where: { userId },
      relations: ['catalogItem', 'catalogItem.brandPartner'],
      order: {
        createdAt: 'DESC',
      },
      skip: (page - 1) * limit,
      take: limit,
    });

    return { favorites, total };
  }

  async isFavorited(userId: string, catalogItemId: string): Promise<boolean> {
    const count = await this.count({
      where: { userId, catalogItemId },
    });
    return count > 0;
  }

  async findByUserAndItem(
    userId: string,
    catalogItemId: string,
  ): Promise<UserFavorite | null> {
    return this.findOne({
      where: { userId, catalogItemId },
    });
  }

  async getFavoriteItemIds(userId: string): Promise<string[]> {
    const favorites = await this.find({
      where: { userId },
      select: ['catalogItemId'],
    });

    return favorites.map((f) => f.catalogItemId);
  }
}

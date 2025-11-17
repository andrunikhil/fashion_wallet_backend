import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { InjectModel } from '@nestjs/mongoose';
import { Repository } from 'typeorm';
import { Model } from 'mongoose';
import { User } from '../entities/user.entity';
import { Avatar } from '../entities/avatar.entity';
import { CatalogItem } from '../entities/catalog-item.entity';
import { Design, DesignDocument } from '../schemas/design.schema';

@Injectable()
export class DatabaseSeederService {
  private readonly logger = new Logger(DatabaseSeederService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Avatar)
    private readonly avatarRepository: Repository<Avatar>,
    @InjectRepository(CatalogItem)
    private readonly catalogItemRepository: Repository<CatalogItem>,
    @InjectModel(Design.name)
    private readonly designModel: Model<DesignDocument>,
  ) {}

  async seedAll(): Promise<void> {
    this.logger.log('Starting database seeding...');

    await this.seedUsers();
    await this.seedAvatars();
    await this.seedCatalogItems();
    await this.seedDesigns();

    this.logger.log('Database seeding completed successfully');
  }

  async seedUsers(): Promise<User[]> {
    this.logger.log('Seeding users...');

    const users = [
      {
        email: 'admin@fashionwallet.com',
        passwordHash: '$2b$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW', // "secret"
        firstName: 'Admin',
        lastName: 'User',
        role: 'admin',
        isActive: true,
        emailVerified: true,
      },
      {
        email: 'user@fashionwallet.com',
        passwordHash: '$2b$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW', // "secret"
        firstName: 'Test',
        lastName: 'User',
        role: 'user',
        isActive: true,
        emailVerified: true,
      },
      {
        email: 'designer@fashionwallet.com',
        passwordHash: '$2b$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW', // "secret"
        firstName: 'Designer',
        lastName: 'User',
        role: 'designer',
        isActive: true,
        emailVerified: true,
      },
    ];

    const createdUsers: User[] = [];
    for (const userData of users) {
      const existing = await this.userRepository.findOne({
        where: { email: userData.email },
      });

      if (!existing) {
        const user = this.userRepository.create(userData);
        const saved = await this.userRepository.save(user);
        createdUsers.push(saved);
        this.logger.log(`Created user: ${userData.email}`);
      } else {
        createdUsers.push(existing);
      }
    }

    return createdUsers;
  }

  async seedAvatars(): Promise<Avatar[]> {
    this.logger.log('Seeding avatars...');

    const users = await this.userRepository.find({ take: 3 });
    if (users.length === 0) {
      this.logger.warn('No users found to seed avatars');
      return [];
    }

    const avatars = [
      {
        userId: users[0].id,
        name: 'Default Avatar',
        gender: 'unisex',
        measurements: {
          height: 170,
          weight: 65,
          chest: 90,
          waist: 75,
          hips: 95,
          shoulderWidth: 40,
        },
        isDefault: true,
      },
      {
        userId: users[1]?.id || users[0].id,
        name: 'Male Avatar',
        gender: 'male',
        measurements: {
          height: 180,
          weight: 75,
          chest: 100,
          waist: 85,
          hips: 95,
          shoulderWidth: 45,
        },
        isDefault: false,
      },
    ];

    const createdAvatars: Avatar[] = [];
    for (const avatarData of avatars) {
      const avatar = this.avatarRepository.create(avatarData);
      const saved = await this.avatarRepository.save(avatar);
      createdAvatars.push(saved);
    }

    this.logger.log(`Created ${createdAvatars.length} avatars`);
    return createdAvatars;
  }

  async seedCatalogItems(): Promise<CatalogItem[]> {
    this.logger.log('Seeding catalog items...');

    const items = [
      {
        name: 'Classic T-Shirt',
        description: 'A classic t-shirt silhouette',
        type: 'silhouette',
        category: 'top',
        properties: {
          tags: ['casual', 'basic', 'everyday'],
        },
        isPremium: false,
        isActive: true,
        price: 0,
      },
      {
        name: 'Cotton Fabric',
        description: 'Soft cotton fabric',
        type: 'fabric',
        category: 'top',
        properties: {
          material: 'cotton',
          tags: ['soft', 'breathable', 'natural'],
        },
        isPremium: false,
        isActive: true,
        price: 0,
      },
      {
        name: 'Striped Pattern',
        description: 'Classic striped pattern',
        type: 'pattern',
        category: 'top',
        properties: {
          patternType: 'stripes',
          tags: ['classic', 'versatile'],
        },
        isPremium: false,
        isActive: true,
        price: 0,
      },
      {
        name: 'Designer Jeans',
        description: 'Premium designer jeans silhouette',
        type: 'silhouette',
        category: 'bottom',
        properties: {
          tags: ['premium', 'designer', 'fashion'],
        },
        isPremium: true,
        isActive: true,
        price: 1000,
      },
    ];

    const createdItems: CatalogItem[] = [];
    for (const itemData of items) {
      const item = this.catalogItemRepository.create(itemData);
      const saved = await this.catalogItemRepository.save(item);
      createdItems.push(saved);
    }

    this.logger.log(`Created ${createdItems.length} catalog items`);
    return createdItems;
  }

  async seedDesigns(): Promise<DesignDocument[]> {
    this.logger.log('Seeding designs...');

    const users = await this.userRepository.find({ take: 2 });
    if (users.length === 0) {
      this.logger.warn('No users found to seed designs');
      return [];
    }

    const catalogItems = await this.catalogItemRepository.find({ take: 3 });

    const designs = [
      {
        userId: users[0].id,
        name: 'My First Design',
        status: 'draft',
        layers: [
          {
            id: 'layer-1',
            type: 'silhouette',
            itemId: catalogItems[0]?.id,
            position: { x: 0, y: 0, z: 0 },
            visible: true,
          },
        ],
        metadata: {
          tags: ['casual', 'everyday'],
          description: 'A simple everyday outfit',
        },
        catalogItemIds: catalogItems.slice(0, 2).map((item) => item.id),
        version: 1,
      },
      {
        userId: users[1]?.id || users[0].id,
        name: 'Published Design',
        status: 'published',
        layers: [
          {
            id: 'layer-1',
            type: 'silhouette',
            itemId: catalogItems[0]?.id,
            position: { x: 0, y: 0, z: 0 },
            visible: true,
          },
          {
            id: 'layer-2',
            type: 'fabric',
            itemId: catalogItems[1]?.id,
            position: { x: 0, y: 0, z: 1 },
            visible: true,
          },
        ],
        metadata: {
          tags: ['published', 'featured'],
          description: 'A featured design',
        },
        catalogItemIds: catalogItems.map((item) => item.id),
        version: 1,
      },
    ];

    const createdDesigns: DesignDocument[] = [];
    for (const designData of designs) {
      const design = new this.designModel(designData);
      const saved = await design.save();
      createdDesigns.push(saved);
    }

    this.logger.log(`Created ${createdDesigns.length} designs`);
    return createdDesigns;
  }

  async clearAll(): Promise<void> {
    this.logger.warn('Clearing all database data...');

    await this.designModel.deleteMany({});
    await this.catalogItemRepository.delete({});
    await this.avatarRepository.delete({});
    await this.userRepository.delete({});

    this.logger.log('Database cleared successfully');
  }
}

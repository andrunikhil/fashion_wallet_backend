import { Test, TestingModule } from '@nestjs/testing';
import { Repository } from 'typeorm';
import { PostgresRepository } from '../postgres.repository';
import { User } from '../../entities/user.entity';

describe('PostgresRepository', () => {
  let postgresRepository: PostgresRepository<User>;
  let mockRepository: jest.Mocked<Repository<User>>;

  beforeEach(async () => {
    // Create mock repository
    mockRepository = {
      findOne: jest.fn(),
      find: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      softDelete: jest.fn(),
      count: jest.fn(),
      manager: {
        transaction: jest.fn(),
      },
    } as any;

    postgresRepository = new PostgresRepository(mockRepository);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findById', () => {
    it('should find entity by id', async () => {
      const mockUser: User = {
        id: '123',
        email: 'test@example.com',
        passwordHash: 'hash',
        firstName: 'John',
        lastName: 'Doe',
        role: 'user',
        isActive: true,
        emailVerified: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
        createdBy: null,
        updatedBy: null,
      };

      mockRepository.findOne.mockResolvedValue(mockUser);

      const result = await postgresRepository.findById('123');

      expect(result).toEqual(mockUser);
      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { id: '123' },
      });
    });

    it('should return null when entity not found', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      const result = await postgresRepository.findById('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('findAll', () => {
    it('should find all entities without options', async () => {
      const mockUsers: User[] = [
        {
          id: '1',
          email: 'user1@example.com',
          passwordHash: 'hash',
          firstName: 'User',
          lastName: 'One',
          role: 'user',
          isActive: true,
          emailVerified: false,
          createdAt: new Date(),
          updatedAt: new Date(),
          deletedAt: null,
          createdBy: null,
          updatedBy: null,
        },
      ];

      mockRepository.find.mockResolvedValue(mockUsers);

      const result = await postgresRepository.findAll();

      expect(result).toEqual(mockUsers);
      expect(mockRepository.find).toHaveBeenCalledWith({});
    });

    it('should find all entities with pagination', async () => {
      mockRepository.find.mockResolvedValue([]);

      await postgresRepository.findAll({
        skip: 10,
        limit: 20,
      });

      expect(mockRepository.find).toHaveBeenCalledWith({
        skip: 10,
        take: 20,
      });
    });

    it('should find all entities with sorting', async () => {
      mockRepository.find.mockResolvedValue([]);

      await postgresRepository.findAll({
        sort: { createdAt: -1 },
      });

      expect(mockRepository.find).toHaveBeenCalledWith({
        order: { createdAt: -1 },
      });
    });
  });

  describe('create', () => {
    it('should create a new entity', async () => {
      const userData = {
        email: 'newuser@example.com',
        passwordHash: 'hash',
        firstName: 'New',
        lastName: 'User',
      };

      const mockUser: User = {
        id: 'new-id',
        ...userData,
        role: 'user',
        isActive: true,
        emailVerified: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
        createdBy: null,
        updatedBy: null,
      };

      mockRepository.create.mockReturnValue(mockUser as any);
      mockRepository.save.mockResolvedValue(mockUser);

      const result = await postgresRepository.create(userData);

      expect(mockRepository.create).toHaveBeenCalledWith(userData);
      expect(mockRepository.save).toHaveBeenCalled();
      expect(result.email).toBe(userData.email);
    });
  });

  describe('update', () => {
    it('should update an entity', async () => {
      const updateData = { firstName: 'Updated' };
      const updatedUser: User = {
        id: '123',
        email: 'test@example.com',
        passwordHash: 'hash',
        firstName: 'Updated',
        lastName: 'Doe',
        role: 'user',
        isActive: true,
        emailVerified: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
        createdBy: null,
        updatedBy: null,
      };

      mockRepository.update.mockResolvedValue({ affected: 1, raw: [], generatedMaps: [] });
      mockRepository.findOne.mockResolvedValue(updatedUser);

      const result = await postgresRepository.update('123', updateData);

      expect(result.firstName).toBe('Updated');
      expect(mockRepository.update).toHaveBeenCalledWith({ id: '123' }, updateData);
    });

    it('should throw error when entity not found', async () => {
      mockRepository.update.mockResolvedValue({ affected: 1, raw: [], generatedMaps: [] });
      mockRepository.findOne.mockResolvedValue(null);

      await expect(
        postgresRepository.update('nonexistent', { firstName: 'Test' }),
      ).rejects.toThrow('Entity with id nonexistent not found');
    });
  });

  describe('delete', () => {
    it('should delete an entity', async () => {
      mockRepository.delete.mockResolvedValue({ affected: 1, raw: [] });

      const result = await postgresRepository.delete('123');

      expect(result).toBe(true);
      expect(mockRepository.delete).toHaveBeenCalledWith({ id: '123' });
    });

    it('should return false when entity not found', async () => {
      mockRepository.delete.mockResolvedValue({ affected: 0, raw: [] });

      const result = await postgresRepository.delete('nonexistent');

      expect(result).toBe(false);
    });
  });

  describe('count', () => {
    it('should count entities', async () => {
      mockRepository.count.mockResolvedValue(5);

      const result = await postgresRepository.count();

      expect(result).toBe(5);
    });

    it('should count entities with conditions', async () => {
      mockRepository.count.mockResolvedValue(2);

      const result = await postgresRepository.count({ role: 'admin' });

      expect(result).toBe(2);
      expect(mockRepository.count).toHaveBeenCalledWith({
        where: { role: 'admin' },
      });
    });
  });

  describe('transaction', () => {
    it('should execute work in a transaction', async () => {
      const mockWork = jest.fn().mockResolvedValue('result');
      (mockRepository.manager.transaction as unknown as jest.Mock) = jest.fn(async (work) => {
        return work({} as any);
      });

      const result = await postgresRepository.transaction(mockWork);

      expect(result).toBe('result');
    });
  });
});

import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Collaborator } from '../entities/collaborator.entity';

@Injectable()
export class CollaboratorRepository {
  constructor(
    @InjectRepository(Collaborator)
    private readonly collaboratorRepo: Repository<Collaborator>,
  ) {}

  async create(collaborator: Partial<Collaborator>): Promise<Collaborator> {
    const newCollaborator = this.collaboratorRepo.create(collaborator);
    return this.collaboratorRepo.save(newCollaborator);
  }

  async findById(id: string): Promise<Collaborator | null> {
    return this.collaboratorRepo.findOne({
      where: { id },
    });
  }

  async findByDesignId(designId: string): Promise<Collaborator[]> {
    return this.collaboratorRepo.find({
      where: { designId },
      order: { addedAt: 'ASC' },
    });
  }

  async findByDesignIdAndUserId(
    designId: string,
    userId: string,
  ): Promise<Collaborator | null> {
    return this.collaboratorRepo.findOne({
      where: { designId, userId },
    });
  }

  async findByUserId(userId: string): Promise<Collaborator[]> {
    return this.collaboratorRepo.find({
      where: { userId },
      order: { addedAt: 'DESC' },
    });
  }

  async update(
    id: string,
    updates: Partial<Collaborator>,
  ): Promise<Collaborator | null> {
    await this.collaboratorRepo.update({ id }, updates);
    return this.findById(id);
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.collaboratorRepo.delete({ id });
    return result.affected > 0;
  }

  async deleteByDesignIdAndUserId(
    designId: string,
    userId: string,
  ): Promise<boolean> {
    const result = await this.collaboratorRepo.delete({ designId, userId });
    return result.affected > 0;
  }

  async hasAccess(
    designId: string,
    userId: string,
    minRole?: 'viewer' | 'commenter' | 'editor' | 'owner',
  ): Promise<boolean> {
    const collaborator = await this.findByDesignIdAndUserId(designId, userId);

    if (!collaborator) {
      return false;
    }

    if (!minRole) {
      return true;
    }

    const roleHierarchy = {
      viewer: 0,
      commenter: 1,
      editor: 2,
      owner: 3,
    };

    return roleHierarchy[collaborator.role] >= roleHierarchy[minRole];
  }

  async getRole(
    designId: string,
    userId: string,
  ): Promise<'viewer' | 'commenter' | 'editor' | 'owner' | null> {
    const collaborator = await this.findByDesignIdAndUserId(designId, userId);
    return collaborator?.role || null;
  }
}

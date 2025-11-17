import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLog } from '../entities/audit-log.entity';

export interface AuditLogEntry {
  userId?: string;
  entityType: string;
  entityId: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'READ';
  oldValues?: Record<string, any>;
  newValues?: Record<string, any>;
  metadata?: string;
  ipAddress?: string;
  userAgent?: string;
}

@Injectable()
export class AuditLoggerService {
  private readonly logger = new Logger(AuditLoggerService.name);

  constructor(
    @InjectRepository(AuditLog)
    private readonly auditLogRepository: Repository<AuditLog>,
  ) {}

  async log(entry: AuditLogEntry): Promise<void> {
    try {
      const auditLog = this.auditLogRepository.create({
        userId: entry.userId || null,
        entityType: entry.entityType,
        entityId: entry.entityId,
        action: entry.action,
        oldValues: entry.oldValues || null,
        newValues: entry.newValues || null,
        metadata: entry.metadata || null,
        ipAddress: entry.ipAddress || null,
        userAgent: entry.userAgent || null,
      });

      await this.auditLogRepository.save(auditLog);

      this.logger.debug(`Audit log created: ${entry.action} on ${entry.entityType}:${entry.entityId}`);
    } catch (error) {
      this.logger.error('Failed to create audit log', error);
      // Don't throw - audit logging failures shouldn't break the application
    }
  }

  async logCreate(
    entityType: string,
    entityId: string,
    newValues: Record<string, any>,
    userId?: string,
    metadata?: { ipAddress?: string; userAgent?: string },
  ): Promise<void> {
    await this.log({
      userId,
      entityType,
      entityId,
      action: 'CREATE',
      newValues,
      ipAddress: metadata?.ipAddress,
      userAgent: metadata?.userAgent,
    });
  }

  async logUpdate(
    entityType: string,
    entityId: string,
    oldValues: Record<string, any>,
    newValues: Record<string, any>,
    userId?: string,
    metadata?: { ipAddress?: string; userAgent?: string },
  ): Promise<void> {
    await this.log({
      userId,
      entityType,
      entityId,
      action: 'UPDATE',
      oldValues,
      newValues,
      ipAddress: metadata?.ipAddress,
      userAgent: metadata?.userAgent,
    });
  }

  async logDelete(
    entityType: string,
    entityId: string,
    oldValues: Record<string, any>,
    userId?: string,
    metadata?: { ipAddress?: string; userAgent?: string },
  ): Promise<void> {
    await this.log({
      userId,
      entityType,
      entityId,
      action: 'DELETE',
      oldValues,
      ipAddress: metadata?.ipAddress,
      userAgent: metadata?.userAgent,
    });
  }

  async findByEntity(entityType: string, entityId: string): Promise<AuditLog[]> {
    return this.auditLogRepository.find({
      where: { entityType, entityId },
      order: { createdAt: 'DESC' },
    });
  }

  async findByUser(userId: string, limit: number = 100): Promise<AuditLog[]> {
    return this.auditLogRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  async findRecent(limit: number = 100): Promise<AuditLog[]> {
    return this.auditLogRepository.find({
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }
}

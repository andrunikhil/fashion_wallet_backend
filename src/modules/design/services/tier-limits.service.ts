import { Injectable, ForbiddenException } from '@nestjs/common';
import { DesignRepository } from '../repositories/design.repository';
import { LayerRepository } from '../repositories/layer.repository';
import { ExportRepository } from '../repositories/export.repository';

export type UserTier = 'free' | 'pro' | 'enterprise';

export interface TierLimits {
  maxDesigns: number;
  maxLayers: number;
  maxExportsPerDay: number;
  maxExportSize: number; // in MB
  allowedExportFormats: string[];
  maxCollaborators: number;
  allowVersionHistory: boolean;
  versionHistoryDays: number;
}

/**
 * Tier Limits Service
 * Manages tier-based usage limits and validations
 */
@Injectable()
export class TierLimitsService {
  private readonly TIER_LIMITS: Record<UserTier, TierLimits> = {
    free: {
      maxDesigns: 10,
      maxLayers: 10,
      maxExportsPerDay: 5,
      maxExportSize: 50, // 50 MB
      allowedExportFormats: ['image'],
      maxCollaborators: 1,
      allowVersionHistory: false,
      versionHistoryDays: 7,
    },
    pro: {
      maxDesigns: 100,
      maxLayers: 50,
      maxExportsPerDay: 50,
      maxExportSize: 500, // 500 MB
      allowedExportFormats: ['image', 'video', 'techpack'],
      maxCollaborators: 10,
      allowVersionHistory: true,
      versionHistoryDays: 90,
    },
    enterprise: {
      maxDesigns: -1, // unlimited
      maxLayers: 200,
      maxExportsPerDay: -1, // unlimited
      maxExportSize: 2000, // 2 GB
      allowedExportFormats: ['image', 'video', 'model', 'techpack'],
      maxCollaborators: -1, // unlimited
      allowVersionHistory: true,
      versionHistoryDays: 365,
    },
  };

  constructor(
    private readonly designRepo: DesignRepository,
    private readonly layerRepo: LayerRepository,
    private readonly exportRepo: ExportRepository,
  ) {}

  /**
   * Get tier limits for a user
   */
  getTierLimits(tier: UserTier): TierLimits {
    return this.TIER_LIMITS[tier] || this.TIER_LIMITS.free;
  }

  /**
   * Extract user tier from user object
   * Default to 'free' if tier is not specified
   */
  getUserTier(user: any): UserTier {
    const tier = user?.tier || user?.subscription?.tier || 'free';
    return ['free', 'pro', 'enterprise'].includes(tier) ? tier : 'free';
  }

  /**
   * Validate if user can create a new design
   */
  async validateDesignCreation(userId: string, userTier: UserTier): Promise<void> {
    const limits = this.getTierLimits(userTier);

    // Unlimited designs for enterprise
    if (limits.maxDesigns === -1) {
      return;
    }

    // Count user's existing designs
    const [designs, count] = await this.designRepo.findByUserId(userId, {
      includeDeleted: false,
    });

    if (count >= limits.maxDesigns) {
      throw new ForbiddenException(
        `Design limit reached. Your ${userTier} tier allows ${limits.maxDesigns} designs. Please upgrade to create more.`,
      );
    }
  }

  /**
   * Validate if user can add more layers to a design
   */
  async validateLayerAddition(
    designId: string,
    userTier: UserTier,
  ): Promise<void> {
    const limits = this.getTierLimits(userTier);

    // Count existing layers
    const layers = await this.layerRepo.findByDesignId(designId);

    if (layers.length >= limits.maxLayers) {
      throw new ForbiddenException(
        `Layer limit reached. Your ${userTier} tier allows ${limits.maxLayers} layers per design. Please upgrade to add more.`,
      );
    }
  }

  /**
   * Validate if user can create an export
   */
  async validateExportCreation(
    userId: string,
    userTier: UserTier,
    exportType: string,
  ): Promise<void> {
    const limits = this.getTierLimits(userTier);

    // Check if export format is allowed
    if (!limits.allowedExportFormats.includes(exportType)) {
      throw new ForbiddenException(
        `Export type '${exportType}' is not available in your ${userTier} tier. ` +
        `Available formats: ${limits.allowedExportFormats.join(', ')}. Please upgrade for more formats.`,
      );
    }

    // Unlimited exports for enterprise
    if (limits.maxExportsPerDay === -1) {
      return;
    }

    // Count exports created today
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [exports] = await this.exportRepo.findByUserId(userId, 1000); // Get last 1000 exports to check today's count
    const todayExports = exports.filter(
      (exp) => exp.createdAt >= today,
    );

    if (todayExports.length >= limits.maxExportsPerDay) {
      throw new ForbiddenException(
        `Daily export limit reached. Your ${userTier} tier allows ${limits.maxExportsPerDay} exports per day. ` +
        `Please try again tomorrow or upgrade your plan.`,
      );
    }
  }

  /**
   * Validate if user can add collaborators
   */
  async validateCollaboratorAddition(
    designId: string,
    currentCollaboratorCount: number,
    userTier: UserTier,
  ): Promise<void> {
    const limits = this.getTierLimits(userTier);

    // Unlimited collaborators for enterprise
    if (limits.maxCollaborators === -1) {
      return;
    }

    if (currentCollaboratorCount >= limits.maxCollaborators) {
      throw new ForbiddenException(
        `Collaborator limit reached. Your ${userTier} tier allows ${limits.maxCollaborators} collaborators per design. ` +
        `Please upgrade to add more.`,
      );
    }
  }

  /**
   * Check if version history is allowed for tier
   */
  validateVersionHistoryAccess(userTier: UserTier): void {
    const limits = this.getTierLimits(userTier);

    if (!limits.allowVersionHistory) {
      throw new ForbiddenException(
        `Version history is not available in your ${userTier} tier. Please upgrade to Pro or Enterprise.`,
      );
    }
  }

  /**
   * Get version history retention days for tier
   */
  getVersionHistoryRetentionDays(userTier: UserTier): number {
    const limits = this.getTierLimits(userTier);
    return limits.versionHistoryDays;
  }
}

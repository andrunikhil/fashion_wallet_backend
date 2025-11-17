import {
  Injectable,
  NotFoundException,
  OnModuleDestroy,
  Logger,
} from '@nestjs/common';
import { DesignRepository } from '../repositories/design.repository';
import { LayerRepository } from '../repositories/layer.repository';
import { CanvasSettingsRepository } from '../repositories/canvas-settings.repository';
import { SnapshotRepository } from '../repositories/snapshot.repository';

export interface DesignState {
  design: any;
  layers: any[];
  canvasSettings: any;
  autosaveNumber: number;
  savedAt: Date;
}

/**
 * Auto-Save Service
 * Manages automatic saving of design state with debouncing
 */
@Injectable()
export class AutoSaveService implements OnModuleDestroy {
  private readonly logger = new Logger(AutoSaveService.name);

  // Debounce delay: 30 seconds after last change
  private readonly AUTOSAVE_DELAY_MS = 30000;

  // Keep last 5 autosaves per design
  private readonly MAX_AUTOSAVES_PER_DESIGN = 5;

  // Map to track pending autosave timers
  private autosaveTimers: Map<string, NodeJS.Timeout> = new Map();

  // Map to track pending save operations
  private pendingSaves: Map<string, { designId: string; userId: string }> = new Map();

  constructor(
    private readonly designRepo: DesignRepository,
    private readonly layerRepo: LayerRepository,
    private readonly canvasSettingsRepo: CanvasSettingsRepository,
    private readonly snapshotRepo: SnapshotRepository,
  ) {}

  /**
   * Schedule an auto-save operation (debounced)
   * If called multiple times, resets the timer
   */
  scheduleAutoSave(designId: string, userId: string): void {
    // Cancel existing timer if any
    this.cancelAutoSave(designId);

    this.logger.debug(`Scheduling auto-save for design ${designId} in ${this.AUTOSAVE_DELAY_MS}ms`);

    // Schedule new auto-save
    const timer = setTimeout(async () => {
      try {
        await this.performAutoSave(designId, userId);
      } catch (error) {
        this.logger.error(
          `Auto-save failed for design ${designId}:`,
          error.stack,
        );
      } finally {
        // Clean up timer reference
        this.autosaveTimers.delete(designId);
        this.pendingSaves.delete(designId);
      }
    }, this.AUTOSAVE_DELAY_MS);

    this.autosaveTimers.set(designId, timer);
    this.pendingSaves.set(designId, { designId, userId });
  }

  /**
   * Cancel pending auto-save for a design
   */
  cancelAutoSave(designId: string): void {
    const timer = this.autosaveTimers.get(designId);
    if (timer) {
      clearTimeout(timer);
      this.autosaveTimers.delete(designId);
      this.pendingSaves.delete(designId);
      this.logger.debug(`Cancelled auto-save for design ${designId}`);
    }
  }

  /**
   * Perform auto-save immediately (called by timer or manually)
   */
  async performAutoSave(designId: string, userId: string): Promise<void> {
    this.logger.log(`Performing auto-save for design ${designId}`);

    try {
      // Get current design state
      const design = await this.designRepo.findById(designId);
      if (!design) {
        this.logger.warn(`Design ${designId} not found, skipping auto-save`);
        return;
      }

      // Verify user still has access
      if (design.userId !== userId) {
        this.logger.warn(
          `User ${userId} no longer owns design ${designId}, skipping auto-save`,
        );
        return;
      }

      const layers = await this.layerRepo.findByDesignId(designId);
      const canvasSettings = await this.canvasSettingsRepo.findByDesignId(
        designId,
      );

      // Get latest autosave to calculate diff and autosave number
      const latestAutosave = await this.snapshotRepo.findLatestAutosave(
        designId,
      );
      const nextAutosaveNumber = latestAutosave
        ? latestAutosave.autosaveNumber + 1
        : 1;

      // Check if state has actually changed since last autosave
      if (latestAutosave && !this.hasStateChanged(latestAutosave.state, {
        design,
        layers,
        canvasSettings,
      })) {
        this.logger.debug(
          `No changes detected for design ${designId}, skipping auto-save`,
        );
        return;
      }

      // Create autosave in MongoDB
      await this.snapshotRepo.createAutosave({
        designId,
        userId,
        autosaveNumber: nextAutosaveNumber,
        state: {
          design: {
            id: design.id,
            name: design.name,
            description: design.description,
            avatar_id: design.avatarId,
            category: design.category,
            tags: design.tags,
            status: design.status,
            visibility: design.visibility,
          },
          layers: layers.map((layer) => ({
            id: layer.id,
            type: layer.type,
            order_index: layer.orderIndex,
            name: layer.name,
            catalog_item_id: layer.catalogItemId,
            catalog_item_type: layer.catalogItemType,
            transform: layer.transform,
            customization: layer.customization,
            is_visible: layer.isVisible,
            is_locked: layer.isLocked,
            blend_mode: layer.blendMode,
            opacity: layer.opacity,
          })),
          canvasSettings: canvasSettings
            ? {
                camera: canvasSettings.camera,
                lighting: canvasSettings.lighting,
                background: canvasSettings.background,
                show_grid: canvasSettings.showGrid,
                show_guides: canvasSettings.showGuides,
                snap_to_grid: canvasSettings.snapToGrid,
                grid_size: canvasSettings.gridSize,
                render_quality: canvasSettings.renderQuality,
                antialiasing: canvasSettings.antialiasing,
                shadows: canvasSettings.shadows,
                ambient_occlusion: canvasSettings.ambientOcclusion,
              }
            : {},
        },
      });

      this.logger.log(
        `Auto-save completed for design ${designId} (autosave #${nextAutosaveNumber})`,
      );

      // Clean up old autosaves (keep only last N)
      await this.cleanupOldAutosaves(designId);
    } catch (error) {
      this.logger.error(`Failed to auto-save design ${designId}:`, error.stack);
      throw error;
    }
  }

  /**
   * Recover design from latest autosave
   */
  async recoverDesign(designId: string, userId: string): Promise<DesignState | null> {
    this.logger.log(`Recovering design ${designId} for user ${userId}`);

    const latestAutosave = await this.snapshotRepo.findLatestAutosave(designId);

    if (!latestAutosave) {
      this.logger.warn(`No autosave found for design ${designId}`);
      return null;
    }

    // Verify user owns the design
    if (latestAutosave.userId !== userId) {
      this.logger.warn(
        `User ${userId} cannot recover design ${designId} owned by ${latestAutosave.userId}`,
      );
      return null;
    }

    return {
      design: latestAutosave.state.design,
      layers: latestAutosave.state.layers,
      canvasSettings: latestAutosave.state.canvasSettings,
      autosaveNumber: latestAutosave.autosaveNumber,
      savedAt: latestAutosave.createdAt || new Date(),
    };
  }

  /**
   * Get latest autosave for a design
   */
  async getLatestAutosave(designId: string): Promise<DesignState | null> {
    const autosave = await this.snapshotRepo.findLatestAutosave(designId);

    if (!autosave) {
      return null;
    }

    return {
      design: autosave.state.design,
      layers: autosave.state.layers,
      canvasSettings: autosave.state.canvasSettings,
      autosaveNumber: autosave.autosaveNumber,
      savedAt: autosave.createdAt || new Date(),
    };
  }

  /**
   * Clean up old autosaves, keeping only the latest N
   */
  async cleanupOldAutosaves(designId: string): Promise<void> {
    try {
      const deletedCount = await this.snapshotRepo.deleteOldAutosaves(
        designId,
        this.MAX_AUTOSAVES_PER_DESIGN,
      );

      if (deletedCount > 0) {
        this.logger.debug(
          `Cleaned up ${deletedCount} old autosaves for design ${designId}`,
        );
      }
    } catch (error) {
      this.logger.error(
        `Failed to cleanup old autosaves for design ${designId}:`,
        error.stack,
      );
    }
  }

  /**
   * Check if design state has changed since last autosave
   */
  private hasStateChanged(oldState: any, newState: any): boolean {
    // Simple comparison using JSON stringify
    // For production, consider using a more sophisticated diff library
    const oldHash = JSON.stringify(oldState);
    const newHash = JSON.stringify({
      design: newState.design,
      layers: newState.layers,
      canvasSettings: newState.canvasSettings,
    });

    return oldHash !== newHash;
  }

  /**
   * Graceful shutdown: save all pending autosaves
   */
  async onModuleDestroy(): Promise<void> {
    this.logger.log('Auto-save service shutting down, saving pending changes...');

    const pendingSavesArray = Array.from(this.pendingSaves.values());

    if (pendingSavesArray.length === 0) {
      this.logger.log('No pending auto-saves');
      return;
    }

    this.logger.log(`Saving ${pendingSavesArray.length} pending auto-saves`);

    // Cancel all timers
    this.autosaveTimers.forEach((timer) => clearTimeout(timer));
    this.autosaveTimers.clear();

    // Perform all pending saves
    const savePromises = pendingSavesArray.map(({ designId, userId }) =>
      this.performAutoSave(designId, userId).catch((error) => {
        this.logger.error(
          `Failed to save design ${designId} during shutdown:`,
          error.stack,
        );
      }),
    );

    await Promise.all(savePromises);

    this.pendingSaves.clear();
    this.logger.log('Auto-save service shutdown complete');
  }

  /**
   * Get stats about pending autosaves (for monitoring)
   */
  getStats(): {
    pendingCount: number;
    pendingDesigns: string[];
  } {
    return {
      pendingCount: this.pendingSaves.size,
      pendingDesigns: Array.from(this.pendingSaves.keys()),
    };
  }
}

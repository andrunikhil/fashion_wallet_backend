import { Logger } from '@nestjs/common';
import * as THREE from 'three';
import { ThreeJSSSRRenderer } from './threejs-ssr-renderer';

/**
 * Layer data interface matching the design layer entity
 */
export interface RenderLayer {
  id: string;
  type: string;
  orderIndex: number;
  catalogItemId?: string;
  catalogItemType?: string;
  transform?: {
    position?: { x: number; y: number; z: number };
    rotation?: { x: number; y: number; z: number };
    scale?: { x: number; y: number; z: number };
  };
  customization?: {
    color?: string;
    pattern?: string;
    material?: string;
    [key: string]: any;
  };
  isVisible: boolean;
  blendMode?: string;
  opacity?: number;
}

/**
 * Canvas settings interface
 */
export interface CanvasSettings {
  camera?: {
    position?: { x: number; y: number; z: number };
    lookAt?: { x: number; y: number; z: number };
    fov?: number;
  };
  lighting?: {
    preset?: 'studio' | 'outdoor' | 'soft' | 'dramatic';
    customLights?: Array<{
      type: 'directional' | 'point' | 'spot' | 'ambient';
      color: string;
      intensity: number;
      position?: { x: number; y: number; z: number };
    }>;
  };
  background?: {
    color?: string;
    transparent?: boolean;
  };
  postProcessing?: {
    bloom?: boolean;
    toneMappingExposure?: number;
  };
}

/**
 * Fashion Render Helper
 *
 * Specialized helper for rendering fashion designs with avatars and clothing layers
 * Integrates with the catalog service to load 3D models
 */
export class FashionRenderHelper {
  private readonly logger = new Logger(FashionRenderHelper.name);
  private renderer: ThreeJSSSRRenderer;

  constructor(config: {
    width?: number;
    height?: number;
    antialias?: boolean;
  } = {}) {
    this.renderer = new ThreeJSSSRRenderer(config);
  }

  /**
   * Render a complete fashion design
   */
  async renderDesign(
    avatarModelPath: string,
    layers: RenderLayer[],
    canvasSettings: CanvasSettings = {},
    renderOptions: {
      format?: 'png' | 'jpeg' | 'webp';
      quality?: number;
      usePlaceholder?: boolean;
    } = {}
  ): Promise<Buffer> {
    try {
      this.logger.log('Starting fashion design render');

      // Setup scene
      this.setupScene(canvasSettings);

      // Setup camera
      this.setupCamera(canvasSettings);

      // Setup lighting
      this.setupLighting(canvasSettings);

      // Load avatar model
      await this.loadAvatar(avatarModelPath);

      // Load and apply clothing layers
      await this.loadLayers(layers);

      // Center camera on the complete scene
      this.renderer.centerCameraOnScene(2.5);

      // Apply post-processing settings
      this.applyPostProcessing(canvasSettings);

      // Render to buffer
      if (renderOptions.usePlaceholder) {
        return await this.renderer.createPlaceholderRender({
          format: renderOptions.format,
          quality: renderOptions.quality,
          background: canvasSettings.background?.color,
          text: 'Fashion Design',
        });
      }

      return await this.renderer.renderToBuffer({
        format: renderOptions.format,
        quality: renderOptions.quality,
        background: canvasSettings.background?.transparent
          ? undefined
          : canvasSettings.background?.color,
      });

    } catch (error) {
      this.logger.error('Failed to render design:', error);

      // Fallback to placeholder on error
      this.logger.warn('Falling back to placeholder render');
      return await this.renderer.createPlaceholderRender({
        format: renderOptions.format,
        quality: renderOptions.quality,
        text: 'Render Error',
      });
    }
  }

  /**
   * Setup scene based on canvas settings
   */
  private setupScene(canvasSettings: CanvasSettings): void {
    const sceneOptions: any = {};

    if (canvasSettings.background) {
      if (canvasSettings.background.transparent) {
        sceneOptions.background = null; // Transparent background
      } else if (canvasSettings.background.color) {
        sceneOptions.background = canvasSettings.background.color;
      }
    }

    this.renderer.setupScene(sceneOptions);
  }

  /**
   * Setup camera based on canvas settings
   */
  private setupCamera(canvasSettings: CanvasSettings): void {
    const cameraOptions: any = {};

    if (canvasSettings.camera) {
      if (canvasSettings.camera.position) {
        cameraOptions.position = canvasSettings.camera.position;
      }
      if (canvasSettings.camera.lookAt) {
        cameraOptions.lookAt = canvasSettings.camera.lookAt;
      }
      if (canvasSettings.camera.fov) {
        cameraOptions.fov = canvasSettings.camera.fov;
      }
    }

    this.renderer.setupCamera(cameraOptions);
  }

  /**
   * Setup lighting based on canvas settings
   */
  private setupLighting(canvasSettings: CanvasSettings): void {
    if (canvasSettings.lighting?.customLights) {
      // TODO: Implement custom lights
      // For now, use preset
      const preset = canvasSettings.lighting.preset || 'studio';
      this.renderer.setupLighting(preset);
    } else {
      const preset = canvasSettings.lighting?.preset || 'studio';
      this.renderer.setupLighting(preset);
    }
  }

  /**
   * Load avatar model
   */
  private async loadAvatar(avatarModelPath: string): Promise<void> {
    this.logger.log(`Loading avatar: ${avatarModelPath}`);

    try {
      await this.renderer.loadGLTFModel(avatarModelPath, {
        name: 'avatar',
        position: { x: 0, y: 0, z: 0 },
        scale: 1,
      });

      this.logger.log('Avatar loaded successfully');
    } catch (error) {
      this.logger.error('Failed to load avatar:', error);
      // Create a simple placeholder mesh for avatar
      this.createPlaceholderAvatar();
    }
  }

  /**
   * Create a placeholder avatar (simple humanoid shape)
   */
  private createPlaceholderAvatar(): void {
    const group = new THREE.Group();
    group.name = 'avatar-placeholder';

    // Body
    const bodyGeometry = new THREE.CylinderGeometry(0.3, 0.25, 1.2, 8);
    const bodyMaterial = new THREE.MeshStandardMaterial({ color: 0xcccccc });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.position.y = 1;
    body.castShadow = true;
    body.receiveShadow = true;
    group.add(body);

    // Head
    const headGeometry = new THREE.SphereGeometry(0.2, 16, 16);
    const headMaterial = new THREE.MeshStandardMaterial({ color: 0xffdbac });
    const head = new THREE.Mesh(headGeometry, headMaterial);
    head.position.y = 1.8;
    head.castShadow = true;
    group.add(head);

    // Arms
    const armGeometry = new THREE.CylinderGeometry(0.08, 0.08, 0.8, 8);
    const armMaterial = new THREE.MeshStandardMaterial({ color: 0xcccccc });

    const leftArm = new THREE.Mesh(armGeometry, armMaterial);
    leftArm.position.set(-0.4, 1.2, 0);
    leftArm.rotation.z = Math.PI / 6;
    leftArm.castShadow = true;
    group.add(leftArm);

    const rightArm = new THREE.Mesh(armGeometry, armMaterial);
    rightArm.position.set(0.4, 1.2, 0);
    rightArm.rotation.z = -Math.PI / 6;
    rightArm.castShadow = true;
    group.add(rightArm);

    // Legs
    const legGeometry = new THREE.CylinderGeometry(0.1, 0.09, 1, 8);
    const legMaterial = new THREE.MeshStandardMaterial({ color: 0x888888 });

    const leftLeg = new THREE.Mesh(legGeometry, legMaterial);
    leftLeg.position.set(-0.15, 0.3, 0);
    leftLeg.castShadow = true;
    group.add(leftLeg);

    const rightLeg = new THREE.Mesh(legGeometry, legMaterial);
    rightLeg.position.set(0.15, 0.3, 0);
    rightLeg.castShadow = true;
    group.add(rightLeg);

    this.renderer.addToScene(group);
    this.logger.log('Created placeholder avatar');
  }

  /**
   * Load clothing layers in order
   */
  private async loadLayers(layers: RenderLayer[]): Promise<void> {
    // Sort layers by order index
    const sortedLayers = [...layers].sort((a, b) => a.orderIndex - b.orderIndex);

    this.logger.log(`Loading ${sortedLayers.length} clothing layers`);

    for (const layer of sortedLayers) {
      if (layer.isVisible) {
        await this.loadLayer(layer);
      }
    }

    this.logger.log('All layers loaded');
  }

  /**
   * Load a single clothing layer
   */
  private async loadLayer(layer: RenderLayer): Promise<void> {
    try {
      // In production, you would:
      // 1. Get the catalog item model path from catalog service
      // 2. Load the GLTF model
      // 3. Apply transformations and customizations

      this.logger.log(`Loading layer: ${layer.id} (${layer.type})`);

      // Placeholder: If we had the model path
      // const modelPath = await this.getModelPath(layer.catalogItemId);
      // await this.loadLayerModel(modelPath, layer);

      // For now, create a placeholder for the layer
      this.createPlaceholderLayer(layer);

    } catch (error) {
      this.logger.error(`Failed to load layer ${layer.id}:`, error);
    }
  }

  /**
   * Load layer model and apply customizations
   */
  private async loadLayerModel(modelPath: string, layer: RenderLayer): Promise<void> {
    const model = await this.renderer.loadGLTFModel(modelPath, {
      name: `layer-${layer.id}`,
      position: layer.transform?.position,
      rotation: layer.transform?.rotation,
      scale: layer.transform?.scale,
    });

    // Apply customizations (color, material, etc.)
    if (layer.customization) {
      this.applyCustomizations(model, layer.customization);
    }

    // Apply opacity and blend mode
    if (layer.opacity !== undefined && layer.opacity < 1) {
      this.applyOpacity(model, layer.opacity);
    }
  }

  /**
   * Create a placeholder for a layer (for testing without actual models)
   */
  private createPlaceholderLayer(layer: RenderLayer): void {
    // Create a simple colored mesh based on layer type
    let geometry: THREE.BufferGeometry;
    const colors = {
      shirt: 0xff6b6b,
      pants: 0x4ecdc4,
      shoes: 0x45b7d1,
      hat: 0xf7dc6f,
      accessory: 0xbb8fce,
    };

    const color = colors[layer.type] || 0x95a5a6;

    switch (layer.type) {
      case 'shirt':
        geometry = new THREE.BoxGeometry(0.6, 0.5, 0.2);
        break;
      case 'pants':
        geometry = new THREE.BoxGeometry(0.5, 0.6, 0.2);
        break;
      case 'shoes':
        geometry = new THREE.BoxGeometry(0.3, 0.2, 0.4);
        break;
      default:
        geometry = new THREE.BoxGeometry(0.3, 0.3, 0.1);
    }

    const material = new THREE.MeshStandardMaterial({
      color: layer.customization?.color || color,
      metalness: 0.2,
      roughness: 0.7,
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = `layer-${layer.id}-placeholder`;

    // Apply transformations
    if (layer.transform?.position) {
      mesh.position.set(
        layer.transform.position.x,
        layer.transform.position.y + 1, // Offset to be on avatar
        layer.transform.position.z
      );
    } else {
      // Default position based on type
      const defaultPositions = {
        shirt: { x: 0, y: 1.3, z: 0 },
        pants: { x: 0, y: 0.7, z: 0 },
        shoes: { x: 0, y: 0.15, z: 0.1 },
        hat: { x: 0, y: 2, z: 0 },
      };
      const pos = defaultPositions[layer.type] || { x: 0, y: 1.5, z: 0 };
      mesh.position.set(pos.x, pos.y, pos.z);
    }

    if (layer.transform?.rotation) {
      mesh.rotation.set(
        layer.transform.rotation.x,
        layer.transform.rotation.y,
        layer.transform.rotation.z
      );
    }

    if (layer.transform?.scale) {
      mesh.scale.set(
        layer.transform.scale.x,
        layer.transform.scale.y,
        layer.transform.scale.z
      );
    }

    mesh.castShadow = true;
    mesh.receiveShadow = true;

    this.renderer.addToScene(mesh);
  }

  /**
   * Apply customizations to a model
   */
  private applyCustomizations(
    model: THREE.Group,
    customization: Record<string, any>
  ): void {
    model.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        const material = child.material as THREE.MeshStandardMaterial;

        // Apply color
        if (customization.color) {
          material.color = new THREE.Color(customization.color);
        }

        // Apply material properties
        if (customization.material) {
          switch (customization.material) {
            case 'metallic':
              material.metalness = 0.8;
              material.roughness = 0.2;
              break;
            case 'fabric':
              material.metalness = 0.1;
              material.roughness = 0.9;
              break;
            case 'leather':
              material.metalness = 0.2;
              material.roughness = 0.6;
              break;
            case 'glossy':
              material.metalness = 0.3;
              material.roughness = 0.3;
              break;
          }
        }

        // Apply pattern (would need texture loading)
        if (customization.pattern) {
          // TODO: Load and apply pattern texture
          this.logger.debug(`Pattern customization not yet implemented: ${customization.pattern}`);
        }
      }
    });
  }

  /**
   * Apply opacity to a model
   */
  private applyOpacity(model: THREE.Group, opacity: number): void {
    model.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        const material = child.material as THREE.MeshStandardMaterial;
        material.transparent = true;
        material.opacity = opacity;
      }
    });
  }

  /**
   * Apply post-processing settings
   */
  private applyPostProcessing(canvasSettings: CanvasSettings): void {
    // Post-processing would typically be done with EffectComposer
    // For now, just log that it's configured
    if (canvasSettings.postProcessing) {
      this.logger.debug('Post-processing settings:', canvasSettings.postProcessing);
    }
  }

  /**
   * Get model path from catalog service
   * This would integrate with your catalog service to get the actual model URL
   */
  private async getModelPath(catalogItemId: string): Promise<string> {
    // TODO: Integrate with catalog service
    // const catalogItem = await this.catalogService.findById(catalogItemId);
    // return catalogItem.modelUrl;
    return `/models/catalog/${catalogItemId}.glb`;
  }

  /**
   * Update render size
   */
  setSize(width: number, height: number): void {
    this.renderer.setSize(width, height);
  }

  /**
   * Dispose of resources
   */
  dispose(): void {
    this.renderer.dispose();
  }
}

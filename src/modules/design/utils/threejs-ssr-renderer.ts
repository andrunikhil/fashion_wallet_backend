import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import * as sharp from 'sharp';
import { Logger } from '@nestjs/common';

/**
 * Three.js Server-Side Rendering Utility
 *
 * Provides server-side 3D rendering capabilities using Three.js
 * Handles scene setup, model loading, lighting, camera, and rendering to buffer
 *
 * PRODUCTION NOTE:
 * For production environments, consider using:
 * - headless-gl with proper system dependencies
 * - OR Puppeteer for browser-based rendering
 * - OR dedicated rendering service/container with GPU support
 */
export class ThreeJSSSRRenderer {
  private readonly logger = new Logger(ThreeJSSSRRenderer.name);

  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer | null = null;
  private gltfLoader: GLTFLoader;

  // Rendering configuration
  private width: number;
  private height: number;
  private antialias: boolean;

  constructor(config: {
    width?: number;
    height?: number;
    antialias?: boolean;
  } = {}) {
    this.width = config.width || 1024;
    this.height = config.height || 1024;
    this.antialias = config.antialias !== false;

    // Initialize scene
    this.scene = new THREE.Scene();

    // Initialize camera
    this.camera = new THREE.PerspectiveCamera(
      45, // FOV
      this.width / this.height, // Aspect ratio
      0.1, // Near plane
      1000 // Far plane
    );

    // Initialize GLTF loader
    this.gltfLoader = new GLTFLoader();

    this.logger.log('ThreeJSSSRRenderer initialized');
  }

  /**
   * Initialize WebGL renderer
   * This requires a GL context - in server environments this needs headless-gl
   */
  private initializeRenderer(): void {
    try {
      // In production with headless-gl:
      // const gl = require('gl');
      // const canvas = { width: this.width, height: this.height };
      // const context = gl(this.width, this.height, { preserveDrawingBuffer: true });

      this.renderer = new THREE.WebGLRenderer({
        antialias: this.antialias,
        alpha: true,
        preserveDrawingBuffer: true,
        // context: context, // Uncomment when using headless-gl
      });

      this.renderer.setSize(this.width, this.height);
      this.renderer.setClearColor(0x000000, 0); // Transparent background

      // Enable shadows for better quality
      this.renderer.shadowMap.enabled = true;
      this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

      // Set output encoding for better color accuracy
      this.renderer.outputColorSpace = THREE.SRGBColorSpace;

      // Note: physicallyCorrectLights was deprecated in Three.js r155
      // New versions use correct lighting by default (useLegacyLights = false)

      this.logger.log('WebGL renderer initialized');
    } catch (error) {
      this.logger.error('Failed to initialize WebGL renderer:', error);
      throw new Error('WebGL renderer initialization failed. Ensure headless-gl is properly installed.');
    }
  }

  /**
   * Setup scene with background
   */
  setupScene(options: {
    background?: string | THREE.Color | THREE.Texture;
    fog?: { color: string; near: number; far: number };
    environment?: THREE.Texture;
  } = {}): void {
    // Set background
    if (options.background) {
      if (typeof options.background === 'string') {
        this.scene.background = new THREE.Color(options.background);
      } else {
        this.scene.background = options.background;
      }
    }

    // Set fog
    if (options.fog) {
      this.scene.fog = new THREE.Fog(
        new THREE.Color(options.fog.color),
        options.fog.near,
        options.fog.far
      );
    }

    // Set environment map for reflections
    if (options.environment) {
      this.scene.environment = options.environment;
    }

    this.logger.log('Scene setup completed');
  }

  /**
   * Setup camera with position and target
   */
  setupCamera(options: {
    position?: { x: number; y: number; z: number };
    lookAt?: { x: number; y: number; z: number };
    fov?: number;
    near?: number;
    far?: number;
  } = {}): void {
    // Set camera position
    if (options.position) {
      this.camera.position.set(
        options.position.x,
        options.position.y,
        options.position.z
      );
    } else {
      // Default camera position
      this.camera.position.set(0, 1.6, 3);
    }

    // Set camera target
    if (options.lookAt) {
      this.camera.lookAt(
        options.lookAt.x,
        options.lookAt.y,
        options.lookAt.z
      );
    } else {
      this.camera.lookAt(0, 1, 0);
    }

    // Update camera parameters
    if (options.fov) this.camera.fov = options.fov;
    if (options.near) this.camera.near = options.near;
    if (options.far) this.camera.far = options.far;

    this.camera.updateProjectionMatrix();

    this.logger.log('Camera setup completed');
  }

  /**
   * Setup lighting with multiple light sources
   */
  setupLighting(preset: 'studio' | 'outdoor' | 'soft' | 'dramatic' = 'studio'): void {
    // Clear existing lights
    this.scene.children = this.scene.children.filter(
      child => !(child instanceof THREE.Light)
    );

    switch (preset) {
      case 'studio':
        this.setupStudioLighting();
        break;
      case 'outdoor':
        this.setupOutdoorLighting();
        break;
      case 'soft':
        this.setupSoftLighting();
        break;
      case 'dramatic':
        this.setupDramaticLighting();
        break;
    }

    this.logger.log(`Lighting setup completed: ${preset}`);
  }

  /**
   * Studio lighting setup - 3-point lighting
   */
  private setupStudioLighting(): void {
    // Key light (main light)
    const keyLight = new THREE.DirectionalLight(0xffffff, 1.5);
    keyLight.position.set(5, 10, 7);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.width = 2048;
    keyLight.shadow.mapSize.height = 2048;
    keyLight.shadow.camera.near = 0.5;
    keyLight.shadow.camera.far = 50;
    this.scene.add(keyLight);

    // Fill light (softer, opposite side)
    const fillLight = new THREE.DirectionalLight(0xffffff, 0.5);
    fillLight.position.set(-5, 5, 5);
    this.scene.add(fillLight);

    // Back light (rim light)
    const backLight = new THREE.DirectionalLight(0xffffff, 0.8);
    backLight.position.set(0, 5, -5);
    this.scene.add(backLight);

    // Ambient light (overall illumination)
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.3);
    this.scene.add(ambientLight);
  }

  /**
   * Outdoor lighting setup - sun simulation
   */
  private setupOutdoorLighting(): void {
    // Sun light
    const sunLight = new THREE.DirectionalLight(0xfff4e6, 2);
    sunLight.position.set(10, 20, 10);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 4096;
    sunLight.shadow.mapSize.height = 4096;
    this.scene.add(sunLight);

    // Sky ambient
    const skyLight = new THREE.HemisphereLight(0x87ceeb, 0x545454, 0.8);
    this.scene.add(skyLight);

    // Soft fill from ground
    const groundLight = new THREE.AmbientLight(0xffffff, 0.2);
    this.scene.add(groundLight);
  }

  /**
   * Soft lighting setup - even, diffused lighting
   */
  private setupSoftLighting(): void {
    // Multiple soft directional lights
    const lights = [
      { position: [5, 5, 5], intensity: 0.8 },
      { position: [-5, 5, 5], intensity: 0.8 },
      { position: [0, 5, -5], intensity: 0.6 },
      { position: [0, -5, 0], intensity: 0.4 },
    ];

    lights.forEach(({ position, intensity }) => {
      const light = new THREE.DirectionalLight(0xffffff, intensity);
      light.position.set(position[0], position[1], position[2]);
      this.scene.add(light);
    });

    // Strong ambient
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    this.scene.add(ambientLight);
  }

  /**
   * Dramatic lighting setup - high contrast
   */
  private setupDramaticLighting(): void {
    // Strong key light
    const keyLight = new THREE.SpotLight(0xffffff, 3);
    keyLight.position.set(10, 15, 5);
    keyLight.angle = Math.PI / 6;
    keyLight.penumbra = 0.3;
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.width = 2048;
    keyLight.shadow.mapSize.height = 2048;
    this.scene.add(keyLight);

    // Weak rim light
    const rimLight = new THREE.DirectionalLight(0x4488ff, 0.8);
    rimLight.position.set(-5, 5, -5);
    this.scene.add(rimLight);

    // Minimal ambient
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.1);
    this.scene.add(ambientLight);
  }

  /**
   * Load GLTF/GLB model from file path or URL
   */
  async loadGLTFModel(
    path: string,
    options: {
      position?: { x: number; y: number; z: number };
      rotation?: { x: number; y: number; z: number };
      scale?: { x: number; y: number; z: number } | number;
      name?: string;
    } = {}
  ): Promise<THREE.Group> {
    return new Promise((resolve, reject) => {
      this.logger.log(`Loading GLTF model: ${path}`);

      this.gltfLoader.load(
        path,
        (gltf) => {
          const model = gltf.scene;

          // Set name
          if (options.name) {
            model.name = options.name;
          }

          // Set position
          if (options.position) {
            model.position.set(
              options.position.x,
              options.position.y,
              options.position.z
            );
          }

          // Set rotation
          if (options.rotation) {
            model.rotation.set(
              options.rotation.x,
              options.rotation.y,
              options.rotation.z
            );
          }

          // Set scale
          if (options.scale) {
            if (typeof options.scale === 'number') {
              model.scale.set(options.scale, options.scale, options.scale);
            } else {
              model.scale.set(
                options.scale.x,
                options.scale.y,
                options.scale.z
              );
            }
          }

          // Enable shadows
          model.traverse((child) => {
            if (child instanceof THREE.Mesh) {
              child.castShadow = true;
              child.receiveShadow = true;
            }
          });

          // Add to scene
          this.scene.add(model);

          this.logger.log(`GLTF model loaded successfully: ${options.name || path}`);
          resolve(model);
        },
        (progress) => {
          const percent = (progress.loaded / progress.total) * 100;
          this.logger.debug(`Loading progress: ${percent.toFixed(2)}%`);
        },
        (error) => {
          this.logger.error(`Failed to load GLTF model: ${path}`, error);
          reject(error);
        }
      );
    });
  }

  /**
   * Load multiple GLTF models in sequence
   */
  async loadMultipleModels(
    models: Array<{
      path: string;
      position?: { x: number; y: number; z: number };
      rotation?: { x: number; y: number; z: number };
      scale?: { x: number; y: number; z: number } | number;
      name?: string;
    }>
  ): Promise<THREE.Group[]> {
    const loadedModels: THREE.Group[] = [];

    for (const modelConfig of models) {
      try {
        const model = await this.loadGLTFModel(modelConfig.path, modelConfig);
        loadedModels.push(model);
      } catch (error) {
        this.logger.error(`Failed to load model: ${modelConfig.path}`, error);
        throw error;
      }
    }

    return loadedModels;
  }

  /**
   * Add custom object to scene
   */
  addToScene(object: THREE.Object3D): void {
    this.scene.add(object);
  }

  /**
   * Remove object from scene
   */
  removeFromScene(object: THREE.Object3D): void {
    this.scene.remove(object);
  }

  /**
   * Render scene to buffer
   */
  async renderToBuffer(options: {
    format?: 'png' | 'jpeg' | 'webp';
    quality?: number;
    background?: string;
  } = {}): Promise<Buffer> {
    try {
      // Initialize renderer if not already done
      if (!this.renderer) {
        this.initializeRenderer();
      }

      if (!this.renderer) {
        throw new Error('Renderer not initialized');
      }

      // Render the scene
      this.renderer.render(this.scene, this.camera);

      // Get the rendered pixels
      const gl = this.renderer.getContext();
      const pixels = new Uint8Array(this.width * this.height * 4);
      gl.readPixels(
        0, 0,
        this.width, this.height,
        gl.RGBA,
        gl.UNSIGNED_BYTE,
        pixels
      );

      // Flip pixels vertically (WebGL renders upside down)
      const flippedPixels = new Uint8Array(this.width * this.height * 4);
      for (let y = 0; y < this.height; y++) {
        for (let x = 0; x < this.width; x++) {
          const srcIdx = ((this.height - y - 1) * this.width + x) * 4;
          const dstIdx = (y * this.width + x) * 4;
          flippedPixels[dstIdx] = pixels[srcIdx];
          flippedPixels[dstIdx + 1] = pixels[srcIdx + 1];
          flippedPixels[dstIdx + 2] = pixels[srcIdx + 2];
          flippedPixels[dstIdx + 3] = pixels[srcIdx + 3];
        }
      }

      // Convert to image using Sharp
      let sharpInstance = sharp(Buffer.from(flippedPixels), {
        raw: {
          width: this.width,
          height: this.height,
          channels: 4,
        },
      });

      // Apply background if specified and format doesn't support transparency
      if (options.background && (options.format === 'jpeg')) {
        sharpInstance = sharpInstance.flatten({
          background: options.background,
        });
      }

      // Convert to desired format
      const format = options.format || 'png';
      const quality = options.quality || 90;

      switch (format) {
        case 'jpeg':
          sharpInstance = sharpInstance.jpeg({ quality });
          break;
        case 'webp':
          sharpInstance = sharpInstance.webp({ quality });
          break;
        case 'png':
        default:
          sharpInstance = sharpInstance.png({
            quality,
            compressionLevel: 9,
          });
          break;
      }

      const buffer = await sharpInstance.toBuffer();

      this.logger.log(`Rendered to ${format} buffer (${buffer.length} bytes)`);
      return buffer;

    } catch (error) {
      this.logger.error('Failed to render to buffer:', error);
      throw error;
    }
  }

  /**
   * Create a placeholder/fallback render without WebGL
   * Useful for testing and environments without GL support
   */
  async createPlaceholderRender(options: {
    format?: 'png' | 'jpeg' | 'webp';
    quality?: number;
    background?: string;
    text?: string;
  } = {}): Promise<Buffer> {
    this.logger.warn('Creating placeholder render (WebGL not available)');

    const format = options.format || 'png';
    const quality = options.quality || 90;
    const background = options.background || '#e0e0e0';
    const text = options.text || '3D Render Placeholder';

    // Create a gradient placeholder image with text overlay
    const svg = `
      <svg width="${this.width}" height="${this.height}" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:${background};stop-opacity:1" />
            <stop offset="100%" style="stop-color:#f5f5f5;stop-opacity:1" />
          </linearGradient>
        </defs>
        <rect width="${this.width}" height="${this.height}" fill="url(#grad)" />
        <text x="50%" y="50%" font-family="Arial" font-size="24" fill="#666" text-anchor="middle" dominant-baseline="middle">
          ${text}
        </text>
      </svg>
    `;

    let sharpInstance = sharp(Buffer.from(svg));

    switch (format) {
      case 'jpeg':
        sharpInstance = sharpInstance.jpeg({ quality });
        break;
      case 'webp':
        sharpInstance = sharpInstance.webp({ quality });
        break;
      case 'png':
      default:
        sharpInstance = sharpInstance.png({ quality });
        break;
    }

    return await sharpInstance.toBuffer();
  }

  /**
   * Update render size
   */
  setSize(width: number, height: number): void {
    this.width = width;
    this.height = height;

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();

    if (this.renderer) {
      this.renderer.setSize(width, height);
    }
  }

  /**
   * Get scene bounds
   */
  getSceneBounds(): THREE.Box3 {
    return new THREE.Box3().setFromObject(this.scene);
  }

  /**
   * Center camera on scene
   */
  centerCameraOnScene(distance: number = 3): void {
    const bounds = this.getSceneBounds();
    const center = bounds.getCenter(new THREE.Vector3());
    const size = bounds.getSize(new THREE.Vector3());

    const maxDim = Math.max(size.x, size.y, size.z);
    const fov = this.camera.fov * (Math.PI / 180);
    let cameraZ = Math.abs(maxDim / 2 / Math.tan(fov / 2));

    cameraZ *= distance; // Add some margin

    this.camera.position.set(center.x, center.y, center.z + cameraZ);
    this.camera.lookAt(center);
    this.camera.updateProjectionMatrix();
  }

  /**
   * Dispose of resources
   */
  dispose(): void {
    if (this.renderer) {
      this.renderer.dispose();
      this.renderer = null;
    }

    // Dispose of scene objects
    this.scene.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        if (object.geometry) {
          object.geometry.dispose();
        }
        if (object.material) {
          if (Array.isArray(object.material)) {
            object.material.forEach(material => material.dispose());
          } else {
            object.material.dispose();
          }
        }
      }
    });

    this.logger.log('Renderer disposed');
  }
}

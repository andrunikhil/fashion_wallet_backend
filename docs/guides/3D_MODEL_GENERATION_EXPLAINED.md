# 3D Model Generation Explained

## Table of Contents
1. [Overview](#overview)
2. [Pipeline Architecture](#pipeline-architecture)
3. [Step-by-Step Process](#step-by-step-process)
4. [Technical Deep Dive](#technical-deep-dive)
5. [Data Formats](#data-formats)
6. [Optimization Techniques](#optimization-techniques)
7. [Best Practices](#best-practices)
8. [Troubleshooting](#troubleshooting)

---

## Overview

The Fashion Wallet 3D model generation system creates personalized, measurement-accurate avatar models for virtual garment try-on. This guide explains the complete process from photo input to final 3D model output.

### Key Objectives

- **Accuracy**: Generate models with ±2cm measurement precision
- **Performance**: Complete processing in under 60 seconds
- **Quality**: Produce realistic models suitable for garment visualization
- **Efficiency**: Optimize file sizes while maintaining visual quality

### System Components

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐     ┌──────────────┐
│   Photos    │────▶│  ML Models   │────▶│   3D Gen    │────▶│  Optimized   │
│   Upload    │     │  Processing  │     │   Engine    │     │   Model      │
└─────────────┘     └──────────────┘     └─────────────┘     └──────────────┘
```

---

## Pipeline Architecture

### High-Level Flow

```typescript
interface ModelGenerationPipeline {
  input: {
    photos: Photo[];          // 1-3 user photos
    measurements?: Partial<BodyMeasurements>;  // Optional manual input
    customization?: AvatarCustomization;
  };

  processing: {
    step1: 'Photo Validation & Preprocessing';
    step2: 'Background Removal';
    step3: 'Pose Detection & Landmark Extraction';
    step4: 'Measurement Calculation';
    step5: 'Body Type Classification';
    step6: '3D Model Generation';
    step7: 'Texture Generation';
    step8: 'Model Optimization';
  };

  output: {
    model: GLTFModel;         // Base model
    lod: LODModels[];         // Level of detail variants
    textures: Texture[];      // Diffuse, normal maps
    metadata: ModelMetadata;  // Generation info
  };
}
```

### Service Layer Architecture

```
src/modules/avatar/
├── services/
│   ├── ml/                         # Machine Learning Services
│   │   ├── background-removal.service.ts
│   │   ├── pose-detection.service.ts
│   │   └── measurement-extraction.service.ts
│   ├── model/                      # 3D Model Generation
│   │   ├── model-generation.service.ts
│   │   ├── texture-generation.service.ts
│   │   └── model-optimization.service.ts
│   └── processing/
│       └── avatar-processing.service.ts
```

---

## Step-by-Step Process

### Phase 1: Photo Preprocessing

#### 1.1 Photo Validation

```typescript
class PhotoValidator {
  async validate(photo: File): Promise<ValidationResult> {
    // Check file format
    const validFormats = ['image/jpeg', 'image/png', 'image/webp'];
    if (!validFormats.includes(photo.mimetype)) {
      throw new InvalidPhotoFormatError();
    }

    // Check file size (max 10MB)
    if (photo.size > 10 * 1024 * 1024) {
      throw new FileSizeTooLargeError();
    }

    // Check resolution (min 1280x720)
    const dimensions = await this.getDimensions(photo);
    if (dimensions.width < 1280 || dimensions.height < 720) {
      throw new ResolutionTooLowError();
    }

    // Quality checks
    const quality = await this.assessQuality(photo);
    return {
      valid: true,
      quality,
      warnings: quality.warnings
    };
  }

  private async assessQuality(photo: Buffer): Promise<QualityMetrics> {
    return {
      blurScore: await this.detectBlur(photo),        // 0-100
      lightingScore: await this.assessLighting(photo), // 0-100
      subjectVisibility: await this.detectSubject(photo),
      warnings: []
    };
  }
}
```

**Quality Checks:**
- **Blur Detection**: Laplacian variance method
- **Lighting**: Histogram analysis for proper exposure
- **Subject Detection**: Person segmentation confidence
- **Background**: Complexity analysis

#### 1.2 EXIF Data Handling

```typescript
class PhotoPreprocessor {
  async preprocessPhoto(photo: Buffer): Promise<ProcessedPhoto> {
    // Extract and remove EXIF data for privacy
    const exif = await this.extractEXIF(photo);
    const stripped = await this.stripEXIF(photo);

    // Store only essential metadata
    const metadata = {
      width: exif.ImageWidth,
      height: exif.ImageHeight,
      orientation: exif.Orientation,
      // GPS, device info, etc. are discarded
    };

    // Apply orientation correction
    const oriented = await this.correctOrientation(stripped, metadata.orientation);

    return {
      buffer: oriented,
      metadata
    };
  }
}
```

### Phase 2: Background Removal

#### 2.1 Segmentation Models

The system uses advanced ML models to isolate the person from the background:

**Option 1: SAM (Segment Anything Model)**
```typescript
class SAMBackgroundRemoval {
  async removeBackground(image: Buffer): Promise<MaskedImage> {
    // Load SAM model
    const model = await this.loadModel('sam-vit-h');

    // Detect person as foreground
    const mask = await model.segment(image, {
      points: await this.detectPersonCenter(image),
      labels: [1], // Foreground
      multimask: false
    });

    // Apply mask to create alpha channel
    const masked = await this.applyMask(image, mask);

    return {
      image: masked,
      mask: mask,
      confidence: mask.confidence
    };
  }
}
```

**Option 2: U2-Net (Faster alternative)**
```typescript
class U2NetBackgroundRemoval {
  async removeBackground(image: Buffer): Promise<MaskedImage> {
    // Preprocess for U2-Net
    const preprocessed = await this.preprocess(image);

    // Run inference
    const output = await this.model.predict(preprocessed);

    // Post-process mask
    const mask = await this.postprocess(output);

    return {
      image: await this.compositeAlpha(image, mask),
      mask: mask,
      confidence: this.calculateConfidence(mask)
    };
  }

  private preprocess(image: Buffer): Tensor {
    // Resize to 320x320
    // Normalize to [-1, 1]
    // Convert to tensor
  }
}
```

**Output:**
- RGBA image with transparent background
- Alpha mask for further processing
- Confidence score (0-100%)

### Phase 3: Pose Detection & Landmarks

#### 3.1 MediaPipe Pose Implementation

```typescript
class PoseDetectionService {
  async detectPose(maskedImage: Buffer): Promise<PoseResult> {
    // Initialize MediaPipe Pose
    const pose = await this.initMediaPipe();

    // Detect pose landmarks (33 points)
    const results = await pose.process(maskedImage);

    if (!results.poseLandmarks) {
      throw new PoseNotDetectedError();
    }

    // Extract 3D landmarks
    const landmarks = this.extractLandmarks(results);

    // Calculate confidence
    const confidence = this.calculateConfidence(landmarks);

    return {
      landmarks,
      confidence,
      worldLandmarks: results.poseWorldLandmarks
    };
  }

  private extractLandmarks(results: any): BodyLandmarks {
    return {
      // Head & Face
      nose: results.poseLandmarks[0],
      leftEye: results.poseLandmarks[2],
      rightEye: results.poseLandmarks[5],
      leftEar: results.poseLandmarks[7],
      rightEar: results.poseLandmarks[8],

      // Torso
      leftShoulder: results.poseLandmarks[11],
      rightShoulder: results.poseLandmarks[12],
      leftHip: results.poseLandmarks[23],
      rightHip: results.poseLandmarks[24],

      // Arms
      leftElbow: results.poseLandmarks[13],
      rightElbow: results.poseLandmarks[14],
      leftWrist: results.poseLandmarks[15],
      rightWrist: results.poseLandmarks[16],

      // Legs
      leftKnee: results.poseLandmarks[25],
      rightKnee: results.poseLandmarks[26],
      leftAnkle: results.poseLandmarks[27],
      rightAnkle: results.poseLandmarks[28],

      // Additional points
      leftHeel: results.poseLandmarks[29],
      rightHeel: results.poseLandmarks[30],
      leftFootIndex: results.poseLandmarks[31],
      rightFootIndex: results.poseLandmarks[32]
    };
  }
}
```

#### 3.2 Landmark Coordinate System

```
Coordinate System:
- X: Horizontal (0 = left, 1 = right)
- Y: Vertical (0 = top, 1 = bottom)
- Z: Depth (negative = closer to camera)
- Visibility: 0-1 (likelihood landmark is visible)

Example Landmark:
{
  x: 0.5,          // Center horizontally
  y: 0.3,          // Upper third vertically
  z: -0.1,         // Slightly forward
  visibility: 0.95 // 95% confidence
}
```

### Phase 4: Measurement Extraction

#### 4.1 Pixel-to-Real-World Conversion

```typescript
class MeasurementExtractionService {
  /**
   * Calculate the ratio between pixels and real-world measurements
   */
  private calculatePixelRatio(
    landmarks: BodyLandmarks,
    imageMetadata: ImageMetadata
  ): number {
    // Method 1: Use reference height (if provided)
    if (imageMetadata.referenceHeight) {
      const pixelHeight = this.calculatePixelHeight(landmarks);
      return imageMetadata.referenceHeight / pixelHeight;
    }

    // Method 2: Estimate from head size
    // Average head height: 21-24cm
    const headPixels = this.calculateHeadHeight(landmarks);
    const estimatedHeadHeight = 22.5; // cm
    return estimatedHeadHeight / headPixels;
  }

  private calculateHeadHeight(landmarks: BodyLandmarks): number {
    // Distance from crown to chin
    const crownY = landmarks.nose.y - (landmarks.nose.y - landmarks.leftEar.y) * 1.2;
    const chinY = landmarks.nose.y + (landmarks.nose.y - landmarks.leftEar.y) * 0.8;
    return Math.abs(chinY - crownY) * imageHeight;
  }
}
```

#### 4.2 Measurement Calculations

**Height Calculation:**
```typescript
calculateHeight(landmarks: BodyLandmarks, pixelRatio: number): Measurement {
  // Get top of head (estimated)
  const crown = this.estimateCrown(landmarks);

  // Get bottom of feet
  const feet = Math.max(
    landmarks.leftAnkle.y,
    landmarks.rightAnkle.y,
    landmarks.leftHeel.y,
    landmarks.rightHeel.y
  );

  // Calculate pixel distance
  const heightPixels = (feet - crown) * imageHeight;

  // Convert to cm
  const heightCm = heightPixels * pixelRatio;

  // Calculate confidence based on landmark visibility
  const confidence = Math.min(
    landmarks.nose.visibility,
    landmarks.leftAnkle.visibility,
    landmarks.rightAnkle.visibility
  ) * 100;

  return {
    value: Math.round(heightCm * 10) / 10,
    unit: 'cm',
    confidence,
    source: 'auto'
  };
}
```

**Shoulder Width:**
```typescript
calculateShoulderWidth(landmarks: BodyLandmarks, pixelRatio: number): Measurement {
  const leftShoulder = landmarks.leftShoulder;
  const rightShoulder = landmarks.rightShoulder;

  // Calculate 3D distance
  const dx = (rightShoulder.x - leftShoulder.x) * imageWidth;
  const dy = (rightShoulder.y - leftShoulder.y) * imageHeight;
  const dz = (rightShoulder.z - leftShoulder.z) * imageWidth;

  const pixelDistance = Math.sqrt(dx * dx + dy * dy + dz * dz);
  const shoulderWidth = pixelDistance * pixelRatio;

  return {
    value: Math.round(shoulderWidth * 10) / 10,
    unit: 'cm',
    confidence: Math.min(leftShoulder.visibility, rightShoulder.visibility) * 100,
    source: 'auto'
  };
}
```

**Circumference Estimates:**
```typescript
calculateChestCircumference(
  landmarks: BodyLandmarks,
  pixelRatio: number
): Measurement {
  // Get chest width (shoulder to shoulder at chest level)
  const chestLevel = (landmarks.leftShoulder.y + landmarks.leftHip.y) / 2;
  const chestWidth = Math.abs(
    landmarks.rightShoulder.x - landmarks.leftShoulder.x
  ) * imageWidth * pixelRatio;

  // Estimate depth from pose angle
  const depthRatio = this.estimateDepthRatio(landmarks);
  const chestDepth = chestWidth * depthRatio;

  // Calculate circumference (ellipse approximation)
  const circumference = Math.PI * (
    1.5 * (chestWidth + chestDepth) -
    Math.sqrt(chestWidth * chestDepth)
  );

  // Confidence is lower for estimated measurements
  const confidence = 70;

  return {
    value: Math.round(circumference * 10) / 10,
    unit: 'cm',
    confidence,
    source: 'auto'
  };
}
```

#### 4.3 Measurement Validation

```typescript
class MeasurementValidator {
  validate(measurements: BodyMeasurements): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // Range validation
    if (measurements.height.value < 120 || measurements.height.value > 250) {
      errors.push({
        field: 'height',
        message: 'Height must be between 120-250 cm'
      });
    }

    // Proportional validation
    const hipToWaist = measurements.hipCircumference.value /
                       measurements.waistCircumference.value;

    if (hipToWaist < 0.8 || hipToWaist > 1.5) {
      warnings.push({
        field: 'hip-waist-ratio',
        message: 'Hip to waist ratio seems unusual',
        suggestion: 'Please verify measurements'
      });
    }

    // Consistency checks
    if (measurements.shoulderWidth.value > measurements.hipCircumference.value) {
      warnings.push({
        field: 'proportions',
        message: 'Shoulder width exceeds hip circumference',
        suggestion: 'This is normal for athletic builds'
      });
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }
}
```

### Phase 5: Body Type Classification

```typescript
class BodyTypeClassifier {
  classify(measurements: BodyMeasurements): BodyType {
    const { shoulderWidth, waistCircumference, hipCircumference } = measurements;

    const shoulderToWaist = shoulderWidth.value / waistCircumference.value;
    const hipToWaist = hipCircumference.value / waistCircumference.value;
    const shoulderToHip = shoulderWidth.value / hipCircumference.value;

    // Hourglass: Shoulder ≈ Hip, both > Waist
    if (Math.abs(shoulderToHip - 1) < 0.15 && hipToWaist > 1.15) {
      return 'hourglass';
    }

    // Pear: Hip > Shoulder, Waist < Hip
    if (shoulderToHip < 0.9 && hipToWaist > 1.15) {
      return 'pear';
    }

    // Apple: Waist ≈ Hip ≈ Shoulder
    if (hipToWaist < 1.1 && shoulderToHip > 0.9 && shoulderToHip < 1.1) {
      return 'apple';
    }

    // Inverted Triangle: Shoulder > Hip
    if (shoulderToHip > 1.1) {
      return 'inverted_triangle';
    }

    // Rectangle: Waist ≈ Hip, Shoulder ≈ Hip
    return 'rectangle';
  }
}
```

### Phase 6: 3D Model Generation

#### 6.1 Base Template Loading

```typescript
class ModelGenerationService {
  async loadBaseTemplate(bodyType: BodyType): Promise<GLTFModel> {
    // Load appropriate base mesh for body type
    const templatePath = `/assets/templates/base_${bodyType}.gltf`;

    const gltf = await this.gltfLoader.load(templatePath);

    return {
      scene: gltf.scene,
      meshes: this.extractMeshes(gltf),
      skeleton: this.extractSkeleton(gltf),
      metadata: gltf.asset
    };
  }
}
```

**Base Template Specifications:**
```yaml
Template Requirements:
  Topology:
    Type: Quad-based mesh
    Vertices: 5,000 - 8,000
    Faces: 5,000 - 8,000 quads

  UV Mapping:
    Layout: Single UV map
    Resolution: 2048x2048
    Seams: Minimized, placed along body seams

  Skeleton (Optional):
    Bones: 15-20 bones for basic rigging
    Root: Pelvis/Hip center

  Proportions:
    Height: 170cm (scaled during generation)
    Neutral pose: A-pose or T-pose
```

#### 6.2 Parametric Deformation

```typescript
class MeshDeformer {
  /**
   * Apply measurements to deform base mesh
   */
  async applyMeasurements(
    mesh: THREE.Mesh,
    measurements: BodyMeasurements
  ): Promise<THREE.Mesh> {
    const geometry = mesh.geometry;
    const positions = geometry.attributes.position.array;

    // Create deformation groups
    const deformGroups = this.createDeformationGroups(mesh);

    // Apply height scaling
    this.scaleHeight(positions, deformGroups.fullBody, measurements.height);

    // Apply shoulder width
    this.scaleWidth(
      positions,
      deformGroups.shoulders,
      measurements.shoulderWidth
    );

    // Apply chest
    this.scaleCircumference(
      positions,
      deformGroups.chest,
      measurements.chestCircumference
    );

    // Apply waist
    this.scaleCircumference(
      positions,
      deformGroups.waist,
      measurements.waistCircumference
    );

    // Apply hips
    this.scaleCircumference(
      positions,
      deformGroups.hips,
      measurements.hipCircumference
    );

    // Recalculate normals
    geometry.computeVertexNormals();

    return mesh;
  }

  private scaleHeight(
    positions: Float32Array,
    vertexIndices: number[],
    targetHeight: Measurement
  ): void {
    const currentHeight = this.calculateMeshHeight(positions);
    const scale = targetHeight.value / currentHeight;

    for (const index of vertexIndices) {
      const i = index * 3;
      positions[i + 1] *= scale; // Scale Y coordinate
    }
  }

  private scaleCircumference(
    positions: Float32Array,
    region: DeformRegion,
    targetCircumference: Measurement
  ): void {
    // Calculate current circumference at region
    const currentCirc = this.calculateRegionCircumference(positions, region);
    const scale = targetCircumference.value / currentCirc;

    // Scale X and Z coordinates (horizontal plane)
    for (const index of region.vertexIndices) {
      const i = index * 3;

      // Get vertex relative to region center
      const dx = positions[i] - region.center.x;
      const dz = positions[i + 2] - region.center.z;

      // Apply falloff for smooth transition
      const falloff = this.calculateFalloff(
        positions[i + 1],
        region.center.y,
        region.falloffRadius
      );

      // Scale with falloff
      positions[i] = region.center.x + dx * (1 + (scale - 1) * falloff);
      positions[i + 2] = region.center.z + dz * (1 + (scale - 1) * falloff);
    }
  }

  private calculateFalloff(
    y: number,
    centerY: number,
    radius: number
  ): number {
    const distance = Math.abs(y - centerY);
    if (distance >= radius) return 0;

    // Smooth falloff curve (cosine interpolation)
    const t = distance / radius;
    return (Math.cos(t * Math.PI) + 1) / 2;
  }
}
```

#### 6.3 Landmark-Based Refinement

```typescript
class LandmarkRefinement {
  /**
   * Use detected landmarks to fine-tune mesh proportions
   */
  refineWithLandmarks(
    mesh: THREE.Mesh,
    landmarks: BodyLandmarks
  ): THREE.Mesh {
    // Map landmarks to mesh vertices
    const landmarkVertices = this.mapLandmarksToVertices(mesh, landmarks);

    // Adjust vertex positions to match landmarks
    for (const [landmark, vertexIndex] of landmarkVertices) {
      this.adjustVertexPosition(mesh, vertexIndex, landmark);
    }

    // Smooth surrounding vertices
    this.smoothTransitions(mesh, landmarkVertices);

    return mesh;
  }

  private mapLandmarksToVertices(
    mesh: THREE.Mesh,
    landmarks: BodyLandmarks
  ): Map<Landmark, number> {
    const mapping = new Map();

    // Find closest vertices to each landmark
    mapping.set(landmarks.leftShoulder, this.findClosestVertex(mesh, 'leftShoulder'));
    mapping.set(landmarks.rightShoulder, this.findClosestVertex(mesh, 'rightShoulder'));
    // ... more landmarks

    return mapping;
  }
}
```

### Phase 7: Texture Generation

#### 7.1 Procedural Texture Creation

```typescript
class TextureGenerationService {
  async generateTextures(
    mesh: THREE.Mesh,
    customization: AvatarCustomization
  ): Promise<TextureSet> {
    // Create canvas for texture painting
    const canvas = createCanvas(2048, 2048);
    const ctx = canvas.getContext('2d');

    // Base color (skin tone)
    const baseColor = await this.generateBaseColor(customization.appearance.skinTone);
    ctx.fillStyle = baseColor;
    ctx.fillRect(0, 0, 2048, 2048);

    // Add skin texture detail
    await this.addSkinDetail(ctx, customization);

    // Add shading variations
    await this.addAmbientOcclusion(ctx, mesh);

    // Convert to texture
    const diffuseTexture = new THREE.CanvasTexture(canvas);
    diffuseTexture.encoding = THREE.sRGBEncoding;

    // Generate normal map (optional)
    const normalMap = await this.generateNormalMap(mesh);

    return {
      diffuse: diffuseTexture,
      normal: normalMap,
      roughness: this.generateRoughnessMap()
    };
  }

  private async addSkinDetail(
    ctx: CanvasRenderingContext2D,
    customization: AvatarCustomization
  ): Promise<void> {
    // Add subtle noise for skin texture
    const imageData = ctx.getImageData(0, 0, 2048, 2048);
    const data = imageData.data;

    for (let i = 0; i < data.length; i += 4) {
      // Add subtle color variation
      const variation = (Math.random() - 0.5) * 5;
      data[i] += variation;     // R
      data[i + 1] += variation; // G
      data[i + 2] += variation; // B
    }

    ctx.putImageData(imageData, 0, 0);
  }
}
```

### Phase 8: Model Optimization

#### 8.1 LOD Generation

```typescript
class LODGenerator {
  async generateLODs(model: THREE.Mesh): Promise<LODModel[]> {
    const lods: LODModel[] = [];

    // LOD 0: Original (5,000-8,000 triangles)
    lods.push({
      level: 0,
      mesh: model,
      distance: 0,
      triangles: this.countTriangles(model)
    });

    // LOD 1: Medium (2,000-3,000 triangles)
    const lod1 = await this.decimateMesh(model, 0.35);
    lods.push({
      level: 1,
      mesh: lod1,
      distance: 10,
      triangles: this.countTriangles(lod1)
    });

    // LOD 2: Low (500-1,000 triangles)
    const lod2 = await this.decimateMesh(model, 0.12);
    lods.push({
      level: 2,
      mesh: lod2,
      distance: 50,
      triangles: this.countTriangles(lod2)
    });

    return lods;
  }

  private async decimateMesh(
    mesh: THREE.Mesh,
    targetRatio: number
  ): Promise<THREE.Mesh> {
    // Use mesh simplification algorithm (e.g., Quadric Error Metrics)
    const geometry = mesh.geometry.clone();
    const targetCount = Math.floor(
      geometry.attributes.position.count * targetRatio
    );

    // Simplify while preserving silhouette
    const simplified = await this.simplifyGeometry(
      geometry,
      targetCount,
      { preserveBoundary: true, preserveUVSeams: true }
    );

    return new THREE.Mesh(simplified, mesh.material);
  }
}
```

#### 8.2 Compression

```typescript
class ModelCompressor {
  async compressModel(gltf: any): Promise<Buffer> {
    // Apply Draco compression
    const dracoCompressed = await this.applyDracoCompression(gltf, {
      quantizationBits: {
        POSITION: 14,
        NORMAL: 10,
        TEXCOORD: 12,
        COLOR: 8
      }
    });

    // Optimize buffers
    const optimized = await this.optimizeBuffers(dracoCompressed);

    // Convert to GLB format (binary)
    const glb = await this.convertToGLB(optimized);

    return glb;
  }

  private async applyDracoCompression(
    gltf: any,
    options: DracoOptions
  ): Promise<any> {
    // Use gltf-pipeline or draco3d library
    const encoder = new DracoEncoder();

    for (const mesh of gltf.meshes) {
      for (const primitive of mesh.primitives) {
        primitive.extensions = {
          KHR_draco_mesh_compression: encoder.encode(primitive, options)
        };
      }
    }

    return gltf;
  }
}
```

#### 8.3 Texture Optimization

```typescript
class TextureOptimizer {
  async optimizeTextures(textures: Texture[]): Promise<Texture[]> {
    return Promise.all(
      textures.map(async (texture) => {
        // Convert to KTX2/Basis Universal format
        const ktx2 = await this.convertToKTX2(texture, {
          format: 'uastc',
          quality: 128,
          compressionLevel: 2
        });

        return {
          ...texture,
          data: ktx2,
          format: 'ktx2',
          size: ktx2.length
        };
      })
    );
  }

  private async convertToKTX2(
    texture: Texture,
    options: KTX2Options
  ): Promise<Buffer> {
    // Use basis_universal encoder
    // Supports GPU texture compression
    // Reduces texture size by 75-90%
  }
}
```

---

## Data Formats

### Input Data Structures

```typescript
// Photo input
interface PhotoInput {
  type: 'front' | 'side' | 'back';
  file: Buffer;
  metadata: {
    width: number;
    height: number;
    format: string;
    orientation?: number;
    referenceHeight?: number; // Optional calibration
  };
}

// Measurement input (manual)
interface MeasurementInput {
  measurements: {
    height: number;
    shoulderWidth?: number;
    chestCircumference?: number;
    waistCircumference?: number;
    hipCircumference?: number;
    // ... extended measurements
  };
  unit: 'cm' | 'inch';
}
```

### Intermediate Data Structures

```typescript
// Landmarks (MediaPipe output)
interface BodyLandmarks {
  [key: string]: {
    x: number;        // Normalized 0-1
    y: number;        // Normalized 0-1
    z: number;        // Depth (relative)
    visibility: number; // 0-1 confidence
  };
}

// Extracted measurements
interface ExtractedMeasurements {
  measurements: BodyMeasurements;
  confidence: {
    overall: number;  // 0-100
    perMeasurement: { [key: string]: number };
  };
  method: 'photo' | 'manual' | 'hybrid';
}
```

### Output Data Structures

```typescript
// GLTF Model structure
interface GLTFOutput {
  asset: {
    version: '2.0';
    generator: 'Fashion Wallet Avatar Generator';
    copyright?: string;
  };

  scene: number;
  scenes: Scene[];
  nodes: Node[];
  meshes: Mesh[];
  materials: Material[];
  textures: Texture[];
  images: Image[];
  buffers: Buffer[];
  bufferViews: BufferView[];
  accessors: Accessor[];

  extensions?: {
    KHR_draco_mesh_compression?: any;
    KHR_materials_pbrSpecularGlossiness?: any;
  };
}

// Metadata
interface ModelMetadata {
  avatarId: string;
  generatedAt: Date;
  bodyType: BodyType;
  measurements: BodyMeasurements;
  generation: {
    algorithm: 'parametric-deformation-v1';
    version: string;
    processingTime: number;
    modelStats: {
      vertices: number;
      triangles: number;
      fileSize: number;
      lodLevels: number;
    };
  };
}
```

---

## Optimization Techniques

### Performance Optimizations

1. **Mesh Decimation**
   - Quadric error metrics for edge collapse
   - Preserve silhouette and UV seams
   - Target triangle counts: 8K → 3K → 1K

2. **Texture Compression**
   - KTX2 with Basis Universal encoding
   - GPU-friendly compressed formats
   - Reduces size by 75-90%

3. **Buffer Optimization**
   - Merge buffers to reduce file size
   - Quantize vertex attributes
   - Remove unused data

4. **Draco Compression**
   - Compress mesh geometry
   - Configurable quantization bits
   - Reduces mesh size by 60-80%

### Quality Optimizations

1. **Normal Smoothing**
   ```typescript
   geometry.computeVertexNormals();
   // Smooth normals for better lighting
   ```

2. **UV Optimization**
   - Minimize seams
   - Maximize texture space usage
   - Avoid stretching

3. **Topology Cleanup**
   - Remove degenerate triangles
   - Fix non-manifold edges
   - Ensure consistent winding order

---

## Best Practices

### Photo Quality Guidelines

**For Users:**
- Use good lighting (natural or diffused)
- Plain, contrasting background
- Wear fitted clothing
- Stand straight, arms slightly away from body
- Full body visible in frame
- Camera at chest height
- Distance: 2-3 meters from camera

**Technical Requirements:**
- Resolution: 1920x1080 minimum
- Format: JPEG, PNG, or WebP
- File size: < 10MB
- No heavy filters or edits

### Development Guidelines

1. **Error Handling**
   ```typescript
   try {
     const model = await this.generateModel(params);
   } catch (error) {
     if (error instanceof PoseDetectionError) {
       // Suggest retaking photo with better pose
     } else if (error instanceof MeasurementValidationError) {
       // Suggest manual measurement correction
     } else {
       // Generic error handling
     }
   }
   ```

2. **Progress Tracking**
   ```typescript
   async processAvatar(avatarId: string): Promise<void> {
     await this.updateProgress(avatarId, 0, 'Starting');
     await this.updateProgress(avatarId, 20, 'Removing background');
     await this.updateProgress(avatarId, 40, 'Detecting pose');
     // ... etc
   }
   ```

3. **Validation**
   - Validate at every step
   - Provide clear error messages
   - Offer suggestions for fixes
   - Never silently fail

### Testing Recommendations

```typescript
describe('Model Generation', () => {
  it('should handle various body types', async () => {
    const bodyTypes = ['pear', 'apple', 'hourglass', 'rectangle', 'inverted_triangle'];
    for (const bodyType of bodyTypes) {
      const model = await generateTestModel(bodyType);
      expect(model).toBeValid();
    }
  });

  it('should generate models within size limits', async () => {
    const model = await generateTestModel('rectangle');
    expect(model.fileSize).toBeLessThan(5 * 1024 * 1024); // 5MB
  });

  it('should maintain measurement accuracy', async () => {
    const targetMeasurements = createTestMeasurements();
    const model = await generateModel(targetMeasurements);
    const actualMeasurements = measureModel(model);

    expect(actualMeasurements.height).toBeCloseTo(targetMeasurements.height, 2);
  });
});
```

---

## Troubleshooting

### Common Issues

#### Issue: Low confidence scores

**Symptoms:**
- Measurements marked with < 70% confidence
- Warning messages about landmark visibility

**Causes:**
- Poor photo quality
- Obstructed body parts
- Unusual pose
- Bad lighting

**Solutions:**
```typescript
if (confidence < 70) {
  return {
    status: 'needs_review',
    suggestions: [
      'Retake photos with better lighting',
      'Ensure full body is visible',
      'Stand in neutral pose',
      'Use plain background'
    ]
  };
}
```

#### Issue: Model deformation artifacts

**Symptoms:**
- Unnatural bulges or pinches
- Asymmetric results
- Stretched textures

**Causes:**
- Extreme measurements
- Incorrect landmark detection
- Deformation falloff too steep

**Solutions:**
```typescript
// Add smoothing pass after deformation
smoothMeshDeformations(mesh, {
  iterations: 3,
  strength: 0.5,
  preserveVolume: true
});

// Validate deformation results
const validation = validateMeshQuality(mesh);
if (!validation.passed) {
  // Retry with adjusted parameters
}
```

#### Issue: Large file sizes

**Symptoms:**
- Model > 5MB after compression
- Slow loading times
- High bandwidth usage

**Solutions:**
```typescript
// Increase compression
await compressModel(gltf, {
  dracoQuantization: {
    POSITION: 12,    // Reduce from 14
    TEXCOORD: 10     // Reduce from 12
  },
  textureCompression: {
    quality: 100     // Reduce from 128
  }
});

// Generate more aggressive LODs
await generateLODs(model, {
  levels: [1.0, 0.3, 0.08]  // More aggressive reduction
});
```

### Debugging Tools

```typescript
class ModelDebugger {
  // Visualize landmarks on photo
  async visualizeLandmarks(photo: Buffer, landmarks: BodyLandmarks): Promise<Buffer> {
    // Draw circles at landmark positions
    // Draw connections between related landmarks
    // Annotate with confidence scores
  }

  // Measure actual model dimensions
  measureModel(mesh: THREE.Mesh): BodyMeasurements {
    // Calculate actual measurements from generated mesh
    // Compare with target measurements
    // Report discrepancies
  }

  // Export debug information
  exportDebugData(avatar: Avatar): DebugPackage {
    return {
      originalPhotos: avatar.photos,
      processedPhotos: avatar.processedPhotos,
      landmarks: avatar.landmarks,
      measurements: avatar.measurements,
      modelStats: this.analyzeModel(avatar.model),
      logs: avatar.processingLogs
    };
  }
}
```

### Performance Monitoring

```typescript
// Track processing times
class PerformanceMonitor {
  async trackProcessing(avatarId: string): Promise<Report> {
    const metrics = {
      backgroundRemoval: 0,
      poseDetection: 0,
      measurementExtraction: 0,
      modelGeneration: 0,
      optimization: 0,
      total: 0
    };

    // Monitor and log each phase
    return metrics;
  }
}
```

---

## Appendix

### References

- [MediaPipe Pose Documentation](https://google.github.io/mediapipe/solutions/pose.html)
- [GLTF 2.0 Specification](https://www.khronos.org/gltf/)
- [Draco 3D Compression](https://google.github.io/draco/)
- [Three.js Documentation](https://threejs.org/docs/)

### Related Documentation

- [Avatar Service Feature Specification](../specs/spec-feature-01-avatar-service.md)
- [3D Model Utilities](../../src/common/utils/media/model3d/README.md)
- [Testing Best Practices](../TESTING-BEST-PRACTICES.md)

### Glossary

- **GLTF**: GL Transmission Format - 3D model format
- **LOD**: Level of Detail - multiple quality versions of a model
- **Draco**: Compression library for 3D meshes
- **UV Mapping**: 2D representation of 3D surface for texturing
- **Landmark**: Key point on body detected by ML model
- **Parametric Deformation**: Modifying mesh based on parameters (measurements)
- **Quantization**: Reducing precision to save space

---

**Last Updated**: November 2025
**Version**: 1.0
**Author**: Fashion Wallet Development Team

/**
 * 3D Model Utility
 * 3D model processing operations
 *
 * Note: This is a basic implementation. Full GLTF/GLB processing requires
 * the gltf-pipeline library which should be installed separately:
 * npm install gltf-pipeline
 */

import * as fs from 'fs';
import {
  Model3DMetadata,
  BoundingBox,
  DracoCompressionOptions,
  LODGenerationOptions,
} from '../../../types/media.types';

export class Model3DUtil {
  /**
   * Validate GLTF/GLB file
   * @param input - Model buffer or file path
   * @returns True if valid
   */
  static async validate(input: Buffer | string): Promise<boolean> {
    try {
      const data = typeof input === 'string'
        ? await fs.promises.readFile(input)
        : input;

      // Check GLB magic number
      if (this.isGLB(data)) {
        return this.validateGLB(data);
      }

      // Check if valid JSON for GLTF
      if (this.isGLTF(data)) {
        return this.validateGLTF(data);
      }

      return false;
    } catch (error) {
      throw new Error(`Failed to validate 3D model: ${error.message}`);
    }
  }

  /**
   * Get model metadata
   * @param input - Model buffer or file path
   * @returns Model metadata
   */
  static async getMetadata(
    input: Buffer | string,
  ): Promise<Model3DMetadata> {
    try {
      const data = typeof input === 'string'
        ? await fs.promises.readFile(input)
        : input;

      let gltf: any;

      if (this.isGLB(data)) {
        gltf = this.parseGLB(data);
      } else {
        gltf = JSON.parse(data.toString());
      }

      const metadata: Model3DMetadata = {
        format: this.isGLB(data) ? 'glb' : 'gltf',
        meshCount: gltf.meshes?.length || 0,
        materialCount: gltf.materials?.length || 0,
        textureCount: gltf.textures?.length || 0,
        animations: gltf.animations?.length || 0,
        size: data.length,
      };

      // Calculate vertex and face counts if accessors are available
      if (gltf.accessors && gltf.meshes) {
        let totalVertices = 0;
        let totalFaces = 0;

        for (const mesh of gltf.meshes) {
          for (const primitive of mesh.primitives || []) {
            if (primitive.attributes?.POSITION !== undefined) {
              const accessor = gltf.accessors[primitive.attributes.POSITION];
              totalVertices += accessor.count || 0;
            }
            if (primitive.indices !== undefined) {
              const accessor = gltf.accessors[primitive.indices];
              totalFaces += (accessor.count || 0) / 3;
            }
          }
        }

        metadata.vertexCount = totalVertices;
        metadata.faceCount = totalFaces;
      }

      // Calculate bounding box
      metadata.boundingBox = this.calculateBoundingBox(gltf);

      return metadata;
    } catch (error) {
      throw new Error(`Failed to get model metadata: ${error.message}`);
    }
  }

  /**
   * Compress model using Draco (requires gltf-pipeline)
   * @param input - Input model path
   * @param output - Output model path
   * @param options - Compression options
   * @returns Output path
   */
  static async compressDraco(
    input: string,
    output: string,
    options: DracoCompressionOptions = {},
  ): Promise<string> {
    throw new Error(
      'Draco compression requires gltf-pipeline library. ' +
      'Install with: npm install gltf-pipeline',
    );
    // Implementation would use gltf-pipeline's processGltf function
  }

  /**
   * Generate LOD levels (requires additional libraries)
   * @param input - Input model path
   * @param outputDir - Output directory
   * @param options - LOD generation options
   * @returns Array of LOD file paths
   */
  static async generateLODs(
    input: string,
    outputDir: string,
    options: LODGenerationOptions,
  ): Promise<string[]> {
    throw new Error(
      'LOD generation requires additional mesh simplification libraries',
    );
    // Implementation would use mesh simplification algorithms
  }

  /**
   * Convert between GLTF and GLB formats
   * @param input - Input model path
   * @param output - Output model path
   * @returns Output path
   */
  static async convert(input: string, output: string): Promise<string> {
    try {
      const data = await fs.promises.readFile(input);
      const isInputGLB = this.isGLB(data);
      const isOutputGLB = output.endsWith('.glb');

      if (isInputGLB && !isOutputGLB) {
        // GLB to GLTF
        const gltf = this.parseGLB(data);
        await fs.promises.writeFile(output, JSON.stringify(gltf, null, 2));
      } else if (!isInputGLB && isOutputGLB) {
        // GLTF to GLB
        const gltf = JSON.parse(data.toString());
        const glb = this.createGLB(gltf);
        await fs.promises.writeFile(output, glb);
      } else {
        // Same format, just copy
        await fs.promises.copyFile(input, output);
      }

      return output;
    } catch (error) {
      throw new Error(`Failed to convert model: ${error.message}`);
    }
  }

  // ============================================================================
  // Helper Methods
  // ============================================================================

  private static isGLB(data: Buffer): boolean {
    // GLB magic number is 0x46546C67 ("glTF")
    return (
      data.length >= 4 &&
      data.readUInt32LE(0) === 0x46546c67
    );
  }

  private static isGLTF(data: Buffer): boolean {
    try {
      const json = JSON.parse(data.toString());
      return json.asset && json.asset.version;
    } catch {
      return false;
    }
  }

  private static validateGLB(data: Buffer): boolean {
    if (data.length < 12) return false;

    const magic = data.readUInt32LE(0);
    const version = data.readUInt32LE(4);
    const length = data.readUInt32LE(8);

    return (
      magic === 0x46546c67 && // "glTF"
      version === 2 &&
      length === data.length
    );
  }

  private static validateGLTF(data: Buffer): boolean {
    try {
      const gltf = JSON.parse(data.toString());
      return (
        gltf.asset &&
        gltf.asset.version &&
        gltf.asset.version === '2.0'
      );
    } catch {
      return false;
    }
  }

  private static parseGLB(data: Buffer): any {
    // Skip header (12 bytes)
    let offset = 12;

    // Read JSON chunk
    const jsonChunkLength = data.readUInt32LE(offset);
    offset += 4;
    const jsonChunkType = data.readUInt32LE(offset);
    offset += 4;

    if (jsonChunkType !== 0x4e4f534a) {
      throw new Error('Invalid GLB: JSON chunk not found');
    }

    const jsonData = data.slice(offset, offset + jsonChunkLength);
    const gltf = JSON.parse(jsonData.toString());

    return gltf;
  }

  private static createGLB(gltf: any): Buffer {
    const jsonString = JSON.stringify(gltf);
    const jsonBuffer = Buffer.from(jsonString);

    // Align to 4-byte boundary
    const jsonPadding = (4 - (jsonBuffer.length % 4)) % 4;
    const jsonChunkLength = jsonBuffer.length + jsonPadding;

    // GLB header (12 bytes) + JSON chunk header (8 bytes) + JSON data
    const totalLength = 12 + 8 + jsonChunkLength;

    const glb = Buffer.alloc(totalLength);

    // Write GLB header
    glb.writeUInt32LE(0x46546c67, 0); // magic
    glb.writeUInt32LE(2, 4); // version
    glb.writeUInt32LE(totalLength, 8); // length

    // Write JSON chunk header
    glb.writeUInt32LE(jsonChunkLength, 12); // chunk length
    glb.writeUInt32LE(0x4e4f534a, 16); // chunk type (JSON)

    // Write JSON data
    jsonBuffer.copy(glb, 20);

    // Padding with spaces
    for (let i = 0; i < jsonPadding; i++) {
      glb.writeUInt8(0x20, 20 + jsonBuffer.length + i);
    }

    return glb;
  }

  private static calculateBoundingBox(gltf: any): BoundingBox | undefined {
    if (!gltf.meshes || !gltf.accessors) {
      return undefined;
    }

    let minX = Infinity,
      minY = Infinity,
      minZ = Infinity;
    let maxX = -Infinity,
      maxY = -Infinity,
      maxZ = -Infinity;

    for (const mesh of gltf.meshes) {
      for (const primitive of mesh.primitives || []) {
        if (primitive.attributes?.POSITION !== undefined) {
          const accessor = gltf.accessors[primitive.attributes.POSITION];
          if (accessor.min && accessor.max) {
            minX = Math.min(minX, accessor.min[0]);
            minY = Math.min(minY, accessor.min[1]);
            minZ = Math.min(minZ, accessor.min[2]);
            maxX = Math.max(maxX, accessor.max[0]);
            maxY = Math.max(maxY, accessor.max[1]);
            maxZ = Math.max(maxZ, accessor.max[2]);
          }
        }
      }
    }

    if (minX === Infinity) {
      return undefined;
    }

    return {
      min: { x: minX, y: minY, z: minZ },
      max: { x: maxX, y: maxY, z: maxZ },
      center: {
        x: (minX + maxX) / 2,
        y: (minY + maxY) / 2,
        z: (minZ + maxZ) / 2,
      },
      size: {
        x: maxX - minX,
        y: maxY - minY,
        z: maxZ - minZ,
      },
    };
  }
}

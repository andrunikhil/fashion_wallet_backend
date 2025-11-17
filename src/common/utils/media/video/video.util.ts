/**
 * Video Utility
 * Video processing operations using FFmpeg
 */

import * as path from 'path';
import * as fs from 'fs';
import ffmpeg from 'fluent-ffmpeg';
import {
  VideoMetadata,
  VideoConversionOptions,
  FrameExtractionOptions,
  VideoThumbnailOptions,
  ImageFormat,
} from '../../../types/media.types';

export class VideoUtil {
  /**
   * Get video metadata
   * @param input - Video file path or buffer
   * @returns Video metadata
   */
  static async getMetadata(
    input: string | Buffer,
  ): Promise<VideoMetadata> {
    return new Promise((resolve, reject) => {
      try {
        let inputPath: string;
        let tempFile = false;

        // If buffer, write to temp file
        if (Buffer.isBuffer(input)) {
          inputPath = path.join(
            '/tmp',
            `video_${Date.now()}_${Math.random().toString(36).substring(7)}.tmp`,
          );
          fs.writeFileSync(inputPath, input);
          tempFile = true;
        } else {
          inputPath = input;
        }

        ffmpeg.ffprobe(inputPath, (err, metadata) => {
          // Clean up temp file
          if (tempFile) {
            try {
              fs.unlinkSync(inputPath);
            } catch (e) {
              // Ignore cleanup errors
            }
          }

          if (err) {
            return reject(new Error(`Failed to get video metadata: ${err.message}`));
          }

          const videoStream = metadata.streams.find(
            (s) => s.codec_type === 'video',
          );

          if (!videoStream) {
            return reject(new Error('No video stream found'));
          }

          resolve({
            format: metadata.format.format_name,
            duration: metadata.format.duration,
            width: videoStream.width,
            height: videoStream.height,
            fps: this.parseFps(videoStream.r_frame_rate),
            bitrate: metadata.format.bit_rate,
            codec: videoStream.codec_name,
            size: metadata.format.size,
          });
        });
      } catch (error) {
        reject(new Error(`Failed to process video: ${error.message}`));
      }
    });
  }

  /**
   * Convert video format
   * @param input - Input video path
   * @param output - Output video path
   * @param options - Conversion options
   * @returns Output file path
   */
  static async convert(
    input: string,
    output: string,
    options: VideoConversionOptions,
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      try {
        let command = ffmpeg(input);

        // Set format
        if (options.format) {
          command = command.format(options.format);
        }

        // Set codec
        if (options.codec) {
          command = command.videoCodec(options.codec);
        }

        // Set bitrate
        if (options.bitrate) {
          command = command.videoBitrate(options.bitrate);
        }

        // Set FPS
        if (options.fps) {
          command = command.fps(options.fps);
        }

        // Set dimensions
        if (options.width && options.height) {
          command = command.size(`${options.width}x${options.height}`);
        } else if (options.width) {
          command = command.size(`${options.width}x?`);
        } else if (options.height) {
          command = command.size(`?x${options.height}`);
        }

        // Set quality
        if (options.quality) {
          command = command.outputOptions([`-crf ${options.quality}`]);
        }

        command
          .on('end', () => resolve(output))
          .on('error', (err) =>
            reject(new Error(`Failed to convert video: ${err.message}`)),
          )
          .save(output);
      } catch (error) {
        reject(new Error(`Failed to setup video conversion: ${error.message}`));
      }
    });
  }

  /**
   * Extract frames from video
   * @param input - Input video path
   * @param outputDir - Output directory for frames
   * @param options - Frame extraction options
   * @returns Array of frame file paths
   */
  static async extractFrames(
    input: string,
    outputDir: string,
    options: FrameExtractionOptions = {},
  ): Promise<string[]> {
    return new Promise((resolve, reject) => {
      try {
        // Ensure output directory exists
        if (!fs.existsSync(outputDir)) {
          fs.mkdirSync(outputDir, { recursive: true });
        }

        const outputPattern = path.join(outputDir, 'frame-%04d.png');
        let command = ffmpeg(input);

        // Extract single frame at timestamp
        if (options.timestamp !== undefined) {
          command = command.seekInput(options.timestamp);
          command = command.frames(1);
        }
        // Extract specific number of frames
        else if (options.count) {
          command = command.frames(options.count);
        }
        // Extract frames at interval
        else if (options.interval) {
          command = command.outputOptions([
            `-vf fps=1/${options.interval}`,
          ]);
        }

        // Set dimensions
        if (options.width && options.height) {
          command = command.size(`${options.width}x${options.height}`);
        }

        command
          .on('end', () => {
            // Read extracted frames
            const frames = fs
              .readdirSync(outputDir)
              .filter((f) => f.startsWith('frame-'))
              .map((f) => path.join(outputDir, f))
              .sort();

            resolve(frames);
          })
          .on('error', (err) =>
            reject(new Error(`Failed to extract frames: ${err.message}`)),
          )
          .save(outputPattern);
      } catch (error) {
        reject(new Error(`Failed to setup frame extraction: ${error.message}`));
      }
    });
  }

  /**
   * Generate video thumbnail
   * @param input - Input video path or buffer
   * @param output - Output image path
   * @param options - Thumbnail options
   * @returns Output file path
   */
  static async generateThumbnail(
    input: string | Buffer,
    output: string,
    options: VideoThumbnailOptions = {},
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      try {
        let inputPath: string;
        let tempFile = false;

        // If buffer, write to temp file
        if (Buffer.isBuffer(input)) {
          inputPath = path.join(
            '/tmp',
            `video_${Date.now()}_${Math.random().toString(36).substring(7)}.tmp`,
          );
          fs.writeFileSync(inputPath, input);
          tempFile = true;
        } else {
          inputPath = input;
        }

        let command = ffmpeg(inputPath);

        // Set timestamp (default to 1 second)
        const timestamp = options.timestamp ?? 1;
        command = command.seekInput(timestamp);

        // Set dimensions
        if (options.width && options.height) {
          command = command.size(`${options.width}x${options.height}`);
        } else if (options.width) {
          command = command.size(`${options.width}x?`);
        } else if (options.height) {
          command = command.size(`?x${options.height}`);
        }

        command
          .frames(1)
          .on('end', () => {
            // Clean up temp file
            if (tempFile) {
              try {
                fs.unlinkSync(inputPath);
              } catch (e) {
                // Ignore cleanup errors
              }
            }
            resolve(output);
          })
          .on('error', (err) => {
            // Clean up temp file
            if (tempFile) {
              try {
                fs.unlinkSync(inputPath);
              } catch (e) {
                // Ignore cleanup errors
              }
            }
            reject(new Error(`Failed to generate thumbnail: ${err.message}`));
          })
          .save(output);
      } catch (error) {
        reject(new Error(`Failed to setup thumbnail generation: ${error.message}`));
      }
    });
  }

  /**
   * Compress video
   * @param input - Input video path
   * @param output - Output video path
   * @param quality - Quality (0-51, lower is better, 23 is default)
   * @returns Output file path
   */
  static async compress(
    input: string,
    output: string,
    quality: number = 23,
  ): Promise<string> {
    return this.convert(input, output, {
      format: 'mp4',
      codec: 'libx264',
      quality,
    });
  }

  /**
   * Create 360° turntable video from frame sequence
   * @param framesDir - Directory containing frame images
   * @param output - Output video path
   * @param fps - Frames per second
   * @returns Output file path
   */
  static async createTurntableVideo(
    framesDir: string,
    output: string,
    fps: number = 30,
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      try {
        const framePattern = path.join(framesDir, 'frame-%04d.png');

        ffmpeg()
          .input(framePattern)
          .inputFPS(fps)
          .videoCodec('libx264')
          .outputOptions([
            '-pix_fmt yuv420p',
            '-crf 23',
          ])
          .on('end', () => resolve(output))
          .on('error', (err) =>
            reject(new Error(`Failed to create turntable video: ${err.message}`)),
          )
          .save(output);
      } catch (error) {
        reject(new Error(`Failed to setup turntable video creation: ${error.message}`));
      }
    });
  }

  /**
   * Get video duration
   * @param input - Video file path or buffer
   * @returns Duration in seconds
   */
  static async getDuration(input: string | Buffer): Promise<number> {
    const metadata = await this.getMetadata(input);
    return metadata.duration || 0;
  }

  /**
   * Get video dimensions
   * @param input - Video file path or buffer
   * @returns Width and height
   */
  static async getDimensions(
    input: string | Buffer,
  ): Promise<{ width: number; height: number }> {
    const metadata = await this.getMetadata(input);
    return {
      width: metadata.width || 0,
      height: metadata.height || 0,
    };
  }

  // ============================================================================
  // Helper Methods
  // ============================================================================

  private static parseFps(fpsString?: string): number | undefined {
    if (!fpsString) return undefined;

    // Parse fraction (e.g., "30000/1001")
    if (fpsString.includes('/')) {
      const [num, den] = fpsString.split('/').map(Number);
      return num / den;
    }

    return parseFloat(fpsString);
  }
}

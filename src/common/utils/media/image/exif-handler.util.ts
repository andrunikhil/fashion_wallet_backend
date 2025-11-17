import sharp from 'sharp';
import ExifReader from 'exifreader';

/**
 * EXIF data interface
 */
export interface ExifData {
  make?: string;
  model?: string;
  dateTime?: string;
  orientation?: number;
  software?: string;
  exposureTime?: string;
  fNumber?: string;
  iso?: number;
  focalLength?: string;
  flash?: string;
  whiteBalance?: string;
  latitude?: number;
  longitude?: number;
  altitude?: number;
  copyright?: string;
  artist?: string;
  description?: string;
  [key: string]: any;
}

/**
 * EXIF Handler Utility
 * Handles EXIF metadata extraction, removal, and manipulation
 */
export class ExifHandler {
  /**
   * Extract EXIF data from image
   * @param image - Image buffer
   * @returns EXIF data
   */
  static async extract(image: Buffer): Promise<ExifData> {
    try {
      const tags = ExifReader.load(image);
      const exifData: ExifData = {};

      // Extract common EXIF fields
      if (tags.Make) exifData.make = tags.Make.description;
      if (tags.Model) exifData.model = tags.Model.description;
      if (tags.DateTime) exifData.dateTime = tags.DateTime.description;
      if (tags.Orientation) exifData.orientation = tags.Orientation.value;
      if (tags.Software) exifData.software = tags.Software.description;
      if (tags.ExposureTime) exifData.exposureTime = tags.ExposureTime.description;
      if (tags.FNumber) exifData.fNumber = tags.FNumber.description;
      if (tags.ISOSpeedRatings) exifData.iso = tags.ISOSpeedRatings.value;
      if (tags.FocalLength) exifData.focalLength = tags.FocalLength.description;
      if (tags.Flash) exifData.flash = tags.Flash.description;
      if (tags.WhiteBalance) exifData.whiteBalance = tags.WhiteBalance.description;
      if (tags.Copyright) exifData.copyright = tags.Copyright.description;
      if (tags.Artist) exifData.artist = tags.Artist.description;
      if (tags.ImageDescription) exifData.description = tags.ImageDescription.description;

      // Extract GPS data if available
      if (tags.GPSLatitude && tags.GPSLongitude) {
        exifData.latitude = this.parseGPSCoordinate(tags.GPSLatitude.description);
        exifData.longitude = this.parseGPSCoordinate(tags.GPSLongitude.description);
      }
      if (tags.GPSAltitude) {
        exifData.altitude = parseFloat(tags.GPSAltitude.description);
      }

      return exifData;
    } catch (error) {
      // Image might not have EXIF data or it's corrupted
      return {};
    }
  }

  /**
   * Remove all EXIF data from image
   * @param image - Image buffer
   * @returns Image buffer without EXIF
   */
  static async remove(image: Buffer): Promise<Buffer> {
    try {
      return await sharp(image)
        .withMetadata({
          exif: {},
          icc: undefined,
          iptc: undefined,
          xmp: undefined,
        })
        .toBuffer();
    } catch (error) {
      throw new Error(
        `Failed to remove EXIF data: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Preserve specific EXIF fields while removing others
   * @param image - Image buffer
   * @param fields - Array of field names to preserve
   * @returns Image buffer with selected EXIF
   */
  static async preserve(image: Buffer, fields: string[]): Promise<Buffer> {
    try {
      // Extract current EXIF
      const currentExif = await this.extract(image);

      // Filter to only preserve specified fields
      const preservedExif: any = {};
      for (const field of fields) {
        if (currentExif[field] !== undefined) {
          preservedExif[field] = currentExif[field];
        }
      }

      // Apply preserved EXIF
      return await sharp(image)
        .withMetadata({
          exif: preservedExif,
        })
        .toBuffer();
    } catch (error) {
      throw new Error(
        `Failed to preserve EXIF fields: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Correct image orientation based on EXIF
   * @param image - Image buffer
   * @returns Oriented image buffer
   */
  static async correctOrientation(image: Buffer): Promise<Buffer> {
    try {
      // Sharp automatically handles orientation when using .rotate()
      return await sharp(image)
        .rotate() // Applies rotation based on EXIF orientation
        .toBuffer();
    } catch (error) {
      throw new Error(
        `Failed to correct orientation: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Get image orientation from EXIF
   * @param image - Image buffer
   * @returns Orientation value (1-8)
   */
  static async getOrientation(image: Buffer): Promise<number> {
    try {
      const metadata = await sharp(image).metadata();
      return metadata.orientation || 1;
    } catch (error) {
      return 1; // Default orientation
    }
  }

  /**
   * Strip GPS data for privacy
   * @param image - Image buffer
   * @returns Image buffer without GPS data
   */
  static async stripGPSData(image: Buffer): Promise<Buffer> {
    try {
      const exifData = await this.extract(image);

      // Remove GPS fields
      delete exifData.latitude;
      delete exifData.longitude;
      delete exifData.altitude;

      return await sharp(image)
        .withMetadata({
          exif: exifData,
        })
        .toBuffer();
    } catch (error) {
      throw new Error(
        `Failed to strip GPS data: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Add or update copyright information
   * @param image - Image buffer
   * @param copyright - Copyright text
   * @param artist - Artist name (optional)
   * @returns Image buffer with copyright
   */
  static async addCopyright(
    image: Buffer,
    copyright: string,
    artist?: string,
  ): Promise<Buffer> {
    try {
      const exifData = await this.extract(image);
      exifData.copyright = copyright;
      if (artist) {
        exifData.artist = artist;
      }

      return await sharp(image)
        .withMetadata({
          exif: exifData,
        })
        .toBuffer();
    } catch (error) {
      throw new Error(
        `Failed to add copyright: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Check if image has EXIF data
   * @param image - Image buffer
   * @returns True if EXIF data exists
   */
  static async hasExif(image: Buffer): Promise<boolean> {
    try {
      const exifData = await this.extract(image);
      return Object.keys(exifData).length > 0;
    } catch {
      return false;
    }
  }

  /**
   * Parse GPS coordinate from EXIF format
   * @param coordinate - GPS coordinate string
   * @returns Decimal degree value
   */
  private static parseGPSCoordinate(coordinate: string): number {
    // GPS coordinates in EXIF are in format: "40° 26' 46.302" N"
    const matches = coordinate.match(/(\d+)°\s*(\d+)'\s*([\d.]+)"/);
    if (!matches) {
      return 0;
    }

    const degrees = parseFloat(matches[1]);
    const minutes = parseFloat(matches[2]);
    const seconds = parseFloat(matches[3]);

    let decimal = degrees + minutes / 60 + seconds / 3600;

    // Check for hemisphere
    if (coordinate.includes('S') || coordinate.includes('W')) {
      decimal = -decimal;
    }

    return decimal;
  }

  /**
   * Get camera information from EXIF
   * @param image - Image buffer
   * @returns Camera info object
   */
  static async getCameraInfo(image: Buffer): Promise<{
    make?: string;
    model?: string;
    software?: string;
  }> {
    try {
      const exifData = await this.extract(image);
      return {
        make: exifData.make,
        model: exifData.model,
        software: exifData.software,
      };
    } catch {
      return {};
    }
  }

  /**
   * Get photo settings from EXIF
   * @param image - Image buffer
   * @returns Photo settings object
   */
  static async getPhotoSettings(image: Buffer): Promise<{
    exposureTime?: string;
    fNumber?: string;
    iso?: number;
    focalLength?: string;
    flash?: string;
    whiteBalance?: string;
  }> {
    try {
      const exifData = await this.extract(image);
      return {
        exposureTime: exifData.exposureTime,
        fNumber: exifData.fNumber,
        iso: exifData.iso,
        focalLength: exifData.focalLength,
        flash: exifData.flash,
        whiteBalance: exifData.whiteBalance,
      };
    } catch {
      return {};
    }
  }
}

import { MimeDetector } from '../mime-detector.util';

describe('MimeDetector', () => {
  describe('getMimeTypeByExtension', () => {
    it('should get MIME type for common image formats', () => {
      expect(MimeDetector.getMimeTypeByExtension('image.jpg')).toBe('image/jpeg');
      expect(MimeDetector.getMimeTypeByExtension('image.png')).toBe('image/png');
      expect(MimeDetector.getMimeTypeByExtension('image.webp')).toBe('image/webp');
      expect(MimeDetector.getMimeTypeByExtension('image.gif')).toBe('image/gif');
    });

    it('should get MIME type for video formats', () => {
      expect(MimeDetector.getMimeTypeByExtension('video.mp4')).toBe('video/mp4');
      expect(MimeDetector.getMimeTypeByExtension('video.webm')).toBe('video/webm');
    });

    it('should get MIME type for 3D model formats', () => {
      expect(MimeDetector.getMimeTypeByExtension('model.gltf')).toBe('model/gltf+json');
      expect(MimeDetector.getMimeTypeByExtension('model.glb')).toBe('model/gltf-binary');
    });

    it('should return null for unknown extension', () => {
      expect(MimeDetector.getMimeTypeByExtension('file.unknown')).toBeNull();
    });

    it('should be case insensitive', () => {
      expect(MimeDetector.getMimeTypeByExtension('IMAGE.JPG')).toBe('image/jpeg');
      expect(MimeDetector.getMimeTypeByExtension('VIDEO.MP4')).toBe('video/mp4');
    });
  });

  describe('getExtensionByMimeType', () => {
    it('should get extension for common MIME types', () => {
      expect(MimeDetector.getExtensionByMimeType('image/jpeg')).toBe('jpg');
      expect(MimeDetector.getExtensionByMimeType('image/png')).toBe('png');
      expect(MimeDetector.getExtensionByMimeType('video/mp4')).toBe('mp4');
    });

    it('should get extension for 3D model MIME types', () => {
      expect(MimeDetector.getExtensionByMimeType('model/gltf-binary')).toBe('glb');
      expect(MimeDetector.getExtensionByMimeType('model/gltf+json')).toBe('gltf');
    });

    it('should return null for unknown MIME type', () => {
      expect(MimeDetector.getExtensionByMimeType('application/unknown')).toBeNull();
    });
  });

  describe('isImage', () => {
    it('should identify image MIME types', () => {
      expect(MimeDetector.isImage('image/jpeg')).toBe(true);
      expect(MimeDetector.isImage('image/png')).toBe(true);
      expect(MimeDetector.isImage('image/webp')).toBe(true);
    });

    it('should reject non-image MIME types', () => {
      expect(MimeDetector.isImage('video/mp4')).toBe(false);
      expect(MimeDetector.isImage('application/json')).toBe(false);
    });
  });

  describe('isVideo', () => {
    it('should identify video MIME types', () => {
      expect(MimeDetector.isVideo('video/mp4')).toBe(true);
      expect(MimeDetector.isVideo('video/webm')).toBe(true);
    });

    it('should reject non-video MIME types', () => {
      expect(MimeDetector.isVideo('image/jpeg')).toBe(false);
      expect(MimeDetector.isVideo('application/json')).toBe(false);
    });
  });

  describe('is3DModel', () => {
    it('should identify 3D model MIME types', () => {
      expect(MimeDetector.is3DModel('model/gltf-binary')).toBe(true);
      expect(MimeDetector.is3DModel('model/gltf+json')).toBe(true);
      expect(MimeDetector.is3DModel('model/obj')).toBe(true);
    });

    it('should reject non-model MIME types', () => {
      expect(MimeDetector.is3DModel('image/jpeg')).toBe(false);
      expect(MimeDetector.is3DModel('video/mp4')).toBe(false);
    });
  });

  describe('registerCustomMimeType', () => {
    it('should register custom MIME type', () => {
      MimeDetector.registerCustomMimeType('custom', {
        mimeType: 'application/x-custom',
        extensions: ['custom'],
      });

      expect(MimeDetector.getMimeTypeByExtension('file.custom')).toBe('application/x-custom');
    });
  });

  describe('hexToRgb', () => {
    it('should convert HEX to RGB', () => {
      const color = MimeDetector.hexToRgb('#FF0000');
      expect(color.r).toBe(255);
      expect(color.g).toBe(0);
      expect(color.b).toBe(0);
    });

    it('should handle lowercase HEX', () => {
      const color = MimeDetector.hexToRgb('#ff0000');
      expect(color.r).toBe(255);
      expect(color.g).toBe(0);
      expect(color.b).toBe(0);
    });

    it('should throw error for invalid HEX', () => {
      expect(() => MimeDetector.hexToRgb('invalid')).toThrow();
    });
  });
});

# Three.js Server-Side Rendering (SSR) for Fashion Wallet

This directory contains the server-side rendering implementation for 3D fashion designs using Three.js.

## Overview

The SSR system renders 3D fashion designs on the server by:
1. Loading avatar 3D models (GLTF/GLB format)
2. Layering clothing items as 3D models
3. Applying transformations, materials, and customizations
4. Setting up proper lighting and camera
5. Rendering the scene to a buffer
6. Encoding the output with Sharp for high-quality images

## Architecture

### Core Components

1. **ThreeJSSSRRenderer** (`threejs-ssr-renderer.ts`)
   - Low-level Three.js rendering engine
   - Handles scene setup, camera, lighting
   - GLTF/GLB model loading
   - Rendering to buffer with Sharp encoding

2. **FashionRenderHelper** (`fashion-render-helper.ts`)
   - High-level fashion-specific rendering
   - Avatar and clothing layer management
   - Customization application (colors, materials, patterns)
   - Canvas settings interpretation

3. **RenderWorker** (`../workers/render.worker.ts`)
   - Bull queue processor
   - Orchestrates rendering jobs
   - Progress tracking and error handling
   - S3 upload integration (placeholder)

## Features

### Scene Setup
- Configurable background (solid color, transparent, texture)
- Optional fog effects
- Environment mapping for reflections

### Camera
- Perspective camera with configurable:
  - Field of view (FOV)
  - Position and look-at target
  - Near/far clipping planes
- Auto-centering on scene bounds

### Lighting Presets

1. **Studio** (default)
   - 3-point lighting setup (key, fill, back)
   - Professional product photography look
   - Soft shadows

2. **Outdoor**
   - Simulated sunlight
   - Hemisphere lighting for sky/ground
   - Natural outdoor appearance

3. **Soft**
   - Multiple diffused directional lights
   - Even, shadowless illumination
   - Best for detailed inspection

4. **Dramatic**
   - High-contrast spot lighting
   - Strong shadows
   - Artistic presentation

### Model Loading
- Supports GLTF and GLB formats
- Automatic shadow configuration
- Transform application (position, rotation, scale)
- Progress tracking

### Customizations
- **Colors**: Apply custom colors to materials
- **Materials**: Metallic, fabric, leather, glossy
- **Opacity**: Transparency and blend modes
- **Patterns**: Texture mapping (planned)

### Image Encoding
- Formats: PNG, JPEG, WebP
- Configurable quality (1-100)
- Automatic background flattening for JPEG
- High compression for PNG

## Usage

### Basic Example

```typescript
import { ThreeJSSSRRenderer } from './utils/threejs-ssr-renderer';

// Initialize renderer
const renderer = new ThreeJSSSRRenderer({
  width: 1024,
  height: 1024,
  antialias: true,
});

// Setup scene
renderer.setupScene({
  background: '#f0f0f0',
});

// Setup camera
renderer.setupCamera({
  position: { x: 0, y: 1.6, z: 3 },
  lookAt: { x: 0, y: 1, z: 0 },
  fov: 45,
});

// Setup lighting
renderer.setupLighting('studio');

// Load avatar model
await renderer.loadGLTFModel('/path/to/avatar.glb', {
  name: 'avatar',
  position: { x: 0, y: 0, z: 0 },
});

// Load clothing items
await renderer.loadGLTFModel('/path/to/shirt.glb', {
  name: 'shirt',
  position: { x: 0, y: 1.3, z: 0 },
});

// Render to buffer
const buffer = await renderer.renderToBuffer({
  format: 'png',
  quality: 90,
});

// Cleanup
renderer.dispose();
```

### Fashion-Specific Example

```typescript
import { FashionRenderHelper } from './utils/fashion-render-helper';

const renderHelper = new FashionRenderHelper({
  width: 2048,
  height: 2048,
  antialias: true,
});

const layers = [
  {
    id: 'layer-1',
    type: 'shirt',
    orderIndex: 1,
    catalogItemId: 'shirt-123',
    transform: {
      position: { x: 0, y: 1.3, z: 0 },
      rotation: { x: 0, y: 0, z: 0 },
      scale: { x: 1, y: 1, z: 1 },
    },
    customization: {
      color: '#ff0000',
      material: 'fabric',
    },
    isVisible: true,
    opacity: 1,
  },
  // ... more layers
];

const canvasSettings = {
  camera: {
    position: { x: 0, y: 1.6, z: 3 },
    fov: 45,
  },
  lighting: {
    preset: 'studio',
  },
  background: {
    color: '#ffffff',
    transparent: false,
  },
};

const buffer = await renderHelper.renderDesign(
  '/models/avatars/default.glb',
  layers,
  canvasSettings,
  {
    format: 'png',
    quality: 95,
  }
);

renderHelper.dispose();
```

## Production Setup

### System Dependencies

For actual 3D rendering (not placeholder), you need headless-gl with system dependencies:

#### Ubuntu/Debian
```bash
sudo apt-get install -y \
  libxi-dev \
  libxext-dev \
  libx11-dev \
  mesa-common-dev \
  libgl1-mesa-dev \
  libglew-dev
```

#### CentOS/RHEL
```bash
sudo yum install -y \
  libXi-devel \
  libXext-devel \
  libX11-devel \
  mesa-libGL-devel \
  glew-devel
```

#### macOS
```bash
brew install glew
```

### Install headless-gl

After system dependencies are installed:
```bash
npm install gl
```

### Enable Real Rendering

In `render.worker.ts`, change:
```typescript
usePlaceholder: true,  // Current setting
```
to:
```typescript
usePlaceholder: false,  // Enable real rendering
```

### Docker Configuration

Example Dockerfile for rendering service:

```dockerfile
FROM node:18

# Install system dependencies for headless-gl
RUN apt-get update && apt-get install -y \
  libxi-dev \
  libxext-dev \
  libx11-dev \
  mesa-common-dev \
  libgl1-mesa-dev \
  libglew-dev \
  xvfb \
  && rm -rf /var/lib/apt/lists/*

# Set up virtual display
ENV DISPLAY=:99

# Install application
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .

# Start Xvfb and application
CMD Xvfb :99 -screen 0 1024x768x24 > /dev/null 2>&1 & npm start
```

### GPU-Accelerated Rendering

For best performance, use containers with GPU access:

```yaml
# docker-compose.yml
services:
  render-worker:
    image: your-render-service
    runtime: nvidia
    environment:
      - NVIDIA_VISIBLE_DEVICES=all
    deploy:
      resources:
        reservations:
          devices:
            - driver: nvidia
              count: 1
              capabilities: [gpu]
```

## Performance Considerations

### Optimization Tips

1. **Caching**: Use render cache to avoid re-rendering unchanged designs
2. **Queue Management**: Prioritize renders based on user tier
3. **Model Optimization**:
   - Use Draco compression for GLTF files
   - Limit polygon count (< 100k per model)
   - Optimize texture sizes
4. **Progressive Rendering**: Generate thumbnail → preview → high-res
5. **Worker Scaling**: Run multiple render workers for parallelization

### Quality Presets

| Preset | Width | Height | Quality | Antialias | Est. Time |
|--------|-------|--------|---------|-----------|-----------|
| thumbnail | 512 | 512 | medium | false | 2-5s |
| preview | 1024 | 1024 | high | true | 5-15s |
| highres | 4096 | 4096 | ultra | true | 30-60s |

### Memory Usage

Approximate memory per render:
- Thumbnail: 50-100 MB
- Preview: 200-500 MB
- High-res: 1-2 GB

Ensure workers have sufficient memory allocation.

## Alternatives to headless-gl

If headless-gl is problematic, consider:

### 1. Puppeteer (Browser-based)
```typescript
// Render in headless Chrome
const browser = await puppeteer.launch({ headless: true });
const page = await browser.newPage();
await page.setViewport({ width: 1024, height: 1024 });
await page.goto('http://localhost:3000/render/design-id');
const screenshot = await page.screenshot({ type: 'png' });
await browser.close();
```

### 2. Dedicated Rendering Service
- Deploy a separate service with GPU support
- Use render farms (e.g., AWS Batch with GPU instances)
- Queue renders via API calls

### 3. Client-Side Rendering
- Render on client browser
- Upload screenshots to server
- Use for non-critical renders only

## Troubleshooting

### "WebGL context could not be created"
- Ensure headless-gl is installed correctly
- Check system dependencies are present
- Verify Xvfb is running (in Docker)
- Set `usePlaceholder: true` as temporary workaround

### "Module 'gl' not found"
- Run `npm install gl`
- Check system dependencies are installed
- Try rebuilding: `npm rebuild gl`

### Poor render quality
- Increase `quality` parameter (90-100)
- Enable `antialias: true`
- Use higher resolution (width/height)
- Check model quality and textures

### Slow rendering
- Reduce polygon count in models
- Use smaller dimensions
- Disable antialiasing for thumbnails
- Optimize textures (compress, reduce size)
- Scale workers horizontally

### Out of memory
- Reduce render dimensions
- Limit concurrent renders
- Increase worker memory allocation
- Implement render queuing

## API Reference

See inline TypeDoc comments in:
- `threejs-ssr-renderer.ts`
- `fashion-render-helper.ts`

## Future Enhancements

- [ ] Pattern/texture support
- [ ] Animation rendering (video export)
- [ ] Real-time preview websocket
- [ ] Advanced material systems (PBR)
- [ ] Environment map library
- [ ] Render farm integration
- [ ] WebGPU support
- [ ] Progressive enhancement
- [ ] Render presets management UI

## License

Internal use only - Fashion Wallet Platform

# Implementation Plan: Media & File Processing Utilities (utils-01)

## Document Overview

**Version**: 1.0
**Last Updated**: November 2025
**Document Type**: Implementation Plan
**Status**: Draft
**Related Spec**: spec-utils-01
**Related Arch**: arch-utils-01

---

## 1. Executive Summary

This document outlines the detailed implementation plan for Media & File Processing Utilities (utils-01) for the Fashion Wallet backend. These utilities are critical infrastructure components that power the avatar processing, catalog management, and design rendering features of the application.

**Total Timeline**: 3-4 weeks
**Team Size**: 2-3 developers
**Priority**: High (required for MVP)

---

## 2. Implementation Phases Overview

```
Phase 1: Foundation (Week 1)
├── Image processing utilities
├── File operation utilities
└── Testing framework setup

Phase 2: Advanced Media (Week 2)
├── Video processing utilities
├── 3D model processing utilities
└── Storage integration

Phase 3: Optimization & Analysis (Week 3)
├── Image optimization
├── Media analysis utilities
└── Performance optimization

Phase 4: Integration & Testing (Week 4)
├── Full integration testing
├── Performance benchmarking
├── Documentation completion
└── Production readiness
```

---

## 3. Phase 1: Foundation (Week 1)

### 3.1 Objectives
- Implement core image processing utilities
- Set up file operation utilities
- Establish testing infrastructure
- Validate basic workflows

### 3.2 Days 1-2: Image Processing Core

#### Tasks
```yaml
Image Utility Class:
  - Setup Sharp library integration
  - Implement resize function
  - Implement crop function
  - Implement rotate/flip functions
  - Add format detection
  - Error handling

Image Metadata:
  - Extract EXIF data
  - Get dimensions and format
  - Calculate file size
  - Validate image structure
```

**Implementation Checklist**:
- [ ] Install and configure Sharp library
- [ ] Create `src/common/utils/media/image/image.util.ts`
- [ ] Implement `ImageUtil` class with core methods
- [ ] Add comprehensive error handling
- [ ] Write unit tests for each method
- [ ] Test with various image formats (JPEG, PNG, WebP, AVIF)
- [ ] Validate performance benchmarks

**Deliverables**:
- Working `ImageUtil` class
- Unit tests with >90% coverage
- Performance benchmarks documented

**Team**: Backend Developer (1)

#### Code Structure
```typescript
// src/common/utils/media/image/image.util.ts
export class ImageUtil {
  static async resize(input: Buffer, options: ResizeOptions): Promise<Buffer>
  static async crop(input: Buffer, options: CropOptions): Promise<Buffer>
  static async rotate(input: Buffer, angle: number): Promise<Buffer>
  static async flip(input: Buffer, direction: FlipDirection): Promise<Buffer>
  static async getMetadata(input: Buffer): Promise<ImageMetadata>
  static async validate(input: Buffer, options: ValidationOptions): Promise<ValidationResult>
}
```

### 3.3 Days 3-4: Image Format Conversion

#### Tasks
```yaml
Format Converter:
  - Implement JPEG conversion
  - Implement PNG conversion
  - Implement WebP conversion
  - Implement AVIF conversion
  - Add quality settings
  - Optimize for web delivery

Modern Formats:
  - Generate WebP variants
  - Generate AVIF variants
  - Auto-format selection
  - Size comparison
```

**Implementation Checklist**:
- [ ] Create `src/common/utils/media/image/image-converter.util.ts`
- [ ] Implement format conversion methods
- [ ] Add quality optimization
- [ ] Test conversion quality vs size tradeoffs
- [ ] Implement auto-format selection logic
- [ ] Write comprehensive tests

**Deliverables**:
- `ImageConverter` class
- Format conversion working for all supported types
- Quality benchmarks

**Team**: Backend Developer (1)

### 3.4 Days 5-7: File Operations & Testing

#### Tasks
```yaml
File Utilities:
  - File validation
  - MIME type detection
  - Unique filename generation
  - File hash calculation
  - Stream operations

Testing Infrastructure:
  - Setup Jest configuration
  - Create test fixtures
  - Mock external dependencies
  - Setup CI integration
```

**Implementation Checklist**:
- [ ] Create `src/common/utils/file/file.util.ts`
- [ ] Implement file validation
- [ ] Add MIME type detection
- [ ] Create filename generators
- [ ] Setup testing framework
- [ ] Create test image fixtures
- [ ] Write integration tests

**Deliverables**:
- `FileUtil` class complete
- Testing infrastructure operational
- Test fixtures created

**Team**: Backend Developer (1-2)

### 3.5 Phase 1 Milestones

**Success Criteria**:
- [ ] Image resize works for all common formats
- [ ] Format conversion produces valid output
- [ ] File validation catches invalid inputs
- [ ] All unit tests passing (>90% coverage)
- [ ] Performance benchmarks met:
  - Image resize 4K: <100ms
  - Format conversion: <200ms
  - File validation: <10ms

**Risks**:
- Sharp library compatibility issues
- Memory usage for large images
- Performance on low-end hardware

**Mitigation**:
- Test on multiple platforms
- Implement streaming for large files
- Add memory usage monitoring

---

## 4. Phase 2: Advanced Media (Week 2)

### 4.1 Objectives
- Implement video processing utilities
- Add 3D model processing
- Integrate S3 storage
- Build thumbnail generation

### 4.2 Days 8-10: Video Processing

#### Tasks
```yaml
Video Utilities:
  - FFmpeg integration
  - Video metadata extraction
  - Frame extraction
  - Thumbnail generation
  - Format conversion
  - Compression

360° Video:
  - Turntable video generation
  - Frame sequence processing
  - Quality optimization
```

**Implementation Checklist**:
- [ ] Install and configure FFmpeg
- [ ] Create `src/common/utils/media/video/video.util.ts`
- [ ] Implement metadata extraction
- [ ] Add frame extraction
- [ ] Implement video conversion
- [ ] Add compression presets
- [ ] Test 360° video generation
- [ ] Write comprehensive tests

**Deliverables**:
- `VideoUtil` class operational
- Video processing pipeline working
- 360° video generation functional

**Team**: Backend Developer (1)

**Dependencies**:
- FFmpeg installed on system
- Sample video files for testing

### 4.3 Days 11-12: 3D Model Processing

#### Tasks
```yaml
Model Utilities:
  - GLTF/GLB validation
  - Metadata extraction
  - Draco compression
  - LOD generation
  - Texture optimization

Model Operations:
  - Format conversion
  - Bounding box calculation
  - Vertex/face counting
```

**Implementation Checklist**:
- [ ] Install gltf-pipeline library
- [ ] Create `src/common/utils/media/model3d/model3d.util.ts`
- [ ] Implement GLTF validation
- [ ] Add metadata extraction
- [ ] Implement Draco compression
- [ ] Add LOD generation
- [ ] Test with various 3D models
- [ ] Write tests with sample models

**Deliverables**:
- `Model3DUtil` class complete
- GLTF validation working
- Draco compression functional
- LOD generation tested

**Team**: Backend Developer (1)

**Dependencies**:
- gltf-pipeline library
- Sample GLTF/GLB models
- Draco encoder

### 4.4 Days 13-14: Storage Integration

#### Tasks
```yaml
S3 Integration:
  - AWS SDK setup
  - Upload functionality
  - Download with signed URLs
  - Batch operations
  - Error handling

Storage Operations:
  - File upload to S3
  - Buffer upload
  - Signed URL generation
  - File deletion
  - Copy operations
  - Stream support
```

**Implementation Checklist**:
- [ ] Configure AWS SDK
- [ ] Create `src/common/utils/storage/s3.util.ts`
- [ ] Implement upload methods
- [ ] Add signed URL generation
- [ ] Implement batch operations
- [ ] Add streaming support
- [ ] Test with test bucket
- [ ] Write integration tests

**Deliverables**:
- `S3Util` class complete
- Upload/download working
- Signed URLs functional
- Batch operations tested

**Team**: Backend Developer (1)

**Dependencies**:
- AWS account configured
- S3 bucket created
- IAM credentials setup

### 4.5 Phase 2 Milestones

**Success Criteria**:
- [ ] Video metadata extraction working
- [ ] Video thumbnail generation <5 seconds
- [ ] 3D model compression >50% size reduction
- [ ] GLTF validation catches invalid models
- [ ] S3 upload/download functional
- [ ] Signed URLs work correctly
- [ ] All tests passing

**Risks**:
- FFmpeg compatibility issues
- GLTF library limitations
- AWS authentication problems

**Mitigation**:
- Test FFmpeg on target platform
- Evaluate alternative 3D libraries if needed
- Setup proper IAM roles early

---

## 5. Phase 3: Optimization & Analysis (Week 3)

### 5.1 Objectives
- Implement image optimization
- Add thumbnail generation
- Build media analysis tools
- Optimize performance

### 5.2 Days 15-16: Image Optimization

#### Tasks
```yaml
Optimization:
  - Web optimization
  - Progressive JPEG generation
  - Compression algorithms
  - Metadata stripping
  - Size targeting

Responsive Images:
  - Multiple size generation
  - srcset generation
  - Format selection
```

**Implementation Checklist**:
- [ ] Create `src/common/utils/media/image/image-optimizer.util.ts`
- [ ] Implement web optimization
- [ ] Add progressive JPEG generation
- [ ] Implement size-based compression
- [ ] Add responsive image generation
- [ ] Test optimization ratios
- [ ] Benchmark performance

**Deliverables**:
- `ImageOptimizer` class complete
- 30%+ average file size reduction
- Quality maintained above 85%

**Team**: Backend Developer (1)

### 5.3 Days 17-18: Thumbnail Generation

#### Tasks
```yaml
Thumbnail Generator:
  - Smart cropping
  - Preset sizes
  - Attention-based cropping
  - Sprite sheet generation
  - srcset generation

Features:
  - Multiple formats
  - Quality options
  - Watermarking support
```

**Implementation Checklist**:
- [ ] Create `src/common/utils/media/image/thumbnail-generator.util.ts`
- [ ] Implement smart cropping
- [ ] Add preset size generation
- [ ] Implement sprite sheets
- [ ] Add srcset support
- [ ] Test various crop strategies
- [ ] Write comprehensive tests

**Deliverables**:
- `ThumbnailGenerator` class operational
- Smart cropping working
- Sprite sheet generation functional

**Team**: Backend Developer (1)

### 5.4 Days 19-20: Media Analysis

#### Tasks
```yaml
Image Analysis:
  - Color extraction
  - Perceptual hashing
  - Similarity detection
  - Quality metrics

Advanced Features:
  - Face detection integration
  - Object detection preparation
  - Content analysis
```

**Implementation Checklist**:
- [ ] Create `src/common/utils/media/image/image-analyzer.util.ts`
- [ ] Implement dominant color extraction
- [ ] Add perceptual hashing
- [ ] Implement similarity comparison
- [ ] Add quality analysis
- [ ] Test accuracy
- [ ] Write tests

**Deliverables**:
- `ImageAnalyzer` class complete
- Color extraction accurate
- Perceptual hashing functional

**Team**: Backend Developer (1)

### 5.5 Days 21: Performance Optimization

#### Tasks
```yaml
Performance:
  - Memory optimization
  - Streaming implementation
  - Batch processing
  - Concurrency limits
  - Caching strategies

Monitoring:
  - Performance metrics
  - Error tracking
  - Resource usage
```

**Implementation Checklist**:
- [ ] Profile memory usage
- [ ] Optimize hot paths
- [ ] Add streaming for large files
- [ ] Implement batch processing
- [ ] Add concurrency controls
- [ ] Setup performance monitoring
- [ ] Run benchmarks

**Deliverables**:
- Performance optimized
- Memory usage reduced
- Benchmarks documented

**Team**: Backend Developer (1-2)

### 5.6 Phase 3 Milestones

**Success Criteria**:
- [ ] Image optimization saves 30%+ on average
- [ ] Thumbnail generation <50ms
- [ ] Color extraction accurate
- [ ] Perceptual hashing working
- [ ] Memory usage optimized
- [ ] Performance benchmarks met
- [ ] All tests passing

**Risks**:
- Performance bottlenecks
- Memory leaks
- Accuracy issues

**Mitigation**:
- Continuous profiling
- Memory leak detection
- Validation with real data

---

## 6. Phase 4: Integration & Testing (Week 4)

### 6.1 Objectives
- Complete integration testing
- Performance benchmarking
- Documentation
- Production readiness

### 6.2 Days 22-23: Integration Testing

#### Tasks
```yaml
Integration Tests:
  - End-to-end workflows
  - Avatar processing pipeline
  - Design export pipeline
  - Catalog upload pipeline

Scenarios:
  - Image upload → process → optimize → upload S3
  - Video process → thumbnail → upload
  - 3D model → validate → compress → upload
```

**Implementation Checklist**:
- [ ] Create integration test suite
- [ ] Test avatar photo processing flow
- [ ] Test design export flow
- [ ] Test catalog upload flow
- [ ] Test error scenarios
- [ ] Test concurrent operations
- [ ] Validate all pipelines

**Deliverables**:
- Integration test suite complete
- All workflows validated
- Error handling verified

**Team**: Backend Developer (2), QA Engineer (1)

### 6.3 Days 24-25: Performance Benchmarking

#### Tasks
```yaml
Benchmarks:
  - Image processing speed
  - Video processing speed
  - 3D model compression
  - Upload/download speed
  - Memory usage
  - Concurrent operations

Metrics:
  - Throughput
  - Latency
  - Resource usage
  - Error rates
```

**Implementation Checklist**:
- [ ] Create benchmark suite
- [ ] Run performance tests
- [ ] Measure resource usage
- [ ] Test under load
- [ ] Document results
- [ ] Identify bottlenecks
- [ ] Optimize critical paths

**Deliverables**:
- Performance benchmarks documented
- Bottlenecks identified
- Optimization recommendations

**Team**: Backend Developer (1-2)

### 6.4 Days 26-27: Documentation & Polish

#### Tasks
```yaml
Documentation:
  - API documentation
  - Usage examples
  - Integration guides
  - Troubleshooting guide

Code Quality:
  - Code review
  - Refactoring
  - Error message improvement
  - Logging enhancement
```

**Implementation Checklist**:
- [ ] Write API documentation
- [ ] Create usage examples
- [ ] Write integration guide
- [ ] Add inline documentation
- [ ] Code review all utilities
- [ ] Refactor as needed
- [ ] Improve error messages
- [ ] Enhance logging

**Deliverables**:
- Complete API documentation
- Usage examples written
- Code review completed

**Team**: Backend Developer (2), Technical Writer (0.5)

### 6.5 Day 28: Production Readiness

#### Tasks
```yaml
Production Prep:
  - Environment configuration
  - Dependency audit
  - Security review
  - Performance validation

Deployment:
  - Package validation
  - Integration verification
  - Monitoring setup
```

**Implementation Checklist**:
- [ ] Configure production environment
- [ ] Audit all dependencies
- [ ] Security review
- [ ] Setup monitoring
- [ ] Validate deployment
- [ ] Create deployment guide
- [ ] Production smoke tests

**Deliverables**:
- Production ready
- Deployment guide
- Monitoring configured

**Team**: DevOps Engineer (1), Backend Developer (1)

### 6.6 Phase 4 Milestones

**Success Criteria**:
- [ ] All integration tests passing
- [ ] Performance benchmarks met
- [ ] Documentation complete
- [ ] Security review passed
- [ ] Production deployment successful
- [ ] Monitoring operational

---

## 7. Technical Requirements

### 7.1 Dependencies

```yaml
Core Libraries:
  - sharp: ^0.32.0 (image processing)
  - fluent-ffmpeg: ^2.1.2 (video processing)
  - ffmpeg-static: ^5.1.0 (FFmpeg binary)
  - ffprobe-static: ^3.1.0 (FFprobe binary)
  - gltf-pipeline: ^4.0.0 (3D model processing)
  - file-type: ^18.0.0 (MIME detection)
  - archiver: ^6.0.0 (ZIP creation)
  - unzipper: ^0.10.11 (ZIP extraction)
  - aws-sdk: ^2.1400.0 (S3 integration)

Testing:
  - jest: ^29.0.0
  - supertest: ^6.3.0
  - @types/jest: ^29.0.0

Development:
  - typescript: ^5.0.0
  - eslint: ^8.40.0
  - prettier: ^2.8.0
```

### 7.2 System Requirements

```yaml
Software:
  - Node.js: >=18.0.0
  - FFmpeg: >=5.0
  - ImageMagick: >=7.0 (optional)

Resources:
  - Memory: 2GB minimum
  - Disk: 10GB for temp files
  - CPU: Multi-core recommended

External Services:
  - AWS S3: Configured bucket
  - CDN: Optional but recommended
```

---

## 8. Testing Strategy

### 8.1 Testing Levels

#### Unit Tests
```yaml
Coverage Target: >90%

Focus Areas:
  - Image manipulation functions
  - Format conversions
  - File validations
  - Hash calculations
  - Error handling
  - Edge cases
```

#### Integration Tests
```yaml
Coverage Target: >80%

Scenarios:
  - Full image processing pipeline
  - Video processing workflow
  - 3D model optimization flow
  - S3 upload/download
  - Error recovery
```

#### Performance Tests
```yaml
Benchmarks:
  - Image resize (4K): <100ms
  - Image conversion: <200ms
  - Thumbnail generation: <50ms
  - Video thumbnail: <5s
  - 3D compression: <10s for typical model
  - S3 upload: >10MB/s
```

### 8.2 Test Data

```yaml
Image Fixtures:
  - Various formats: JPEG, PNG, WebP, AVIF, TIFF
  - Various sizes: 100x100 to 8K
  - Edge cases: Corrupted, empty, very large

Video Fixtures:
  - Formats: MP4, WebM, MOV
  - Durations: 1s to 60s
  - Resolutions: 480p to 4K

3D Model Fixtures:
  - Formats: GLTF, GLB
  - Complexity: Low poly to high poly
  - With/without textures
```

---

## 9. Success Metrics & KPIs

### 9.1 Technical Metrics

```yaml
Performance:
  - API response time p95 < 200ms
  - Image processing < 100ms
  - Video processing at real-time speed
  - 3D compression > 50% size reduction

Quality:
  - Code coverage > 90%
  - Zero critical bugs
  - No memory leaks
  - Error rate < 0.1%

Reliability:
  - 99.9% uptime
  - Graceful error handling
  - Retry logic working
```

### 9.2 Business Metrics

```yaml
Efficiency:
  - 30%+ file size reduction on average
  - <1s processing time for typical images
  - Batch processing support
  - Cost optimization on S3 storage

User Experience:
  - Fast upload feedback
  - Progress tracking
  - Clear error messages
```

---

## 10. Risk Management

### 10.1 Technical Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Memory leaks in image processing | Medium | High | Profiling, streaming, limits |
| FFmpeg compatibility issues | Medium | Medium | Test on target platform early |
| S3 rate limiting | Low | Medium | Implement retry with backoff |
| Large file processing timeout | Medium | Medium | Streaming, chunking |
| 3D library limitations | Medium | High | Evaluate alternatives early |

### 10.2 Resource Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Developer availability | Low | High | Cross-training, documentation |
| Infrastructure costs | Medium | Medium | Monitor usage, optimize |
| Timeline delays | Medium | Medium | Buffer time, prioritize |

---

## 11. Dependencies & Blockers

### 11.1 External Dependencies

```yaml
Infrastructure:
  - AWS account setup
  - S3 bucket configured
  - IAM roles created

Software:
  - FFmpeg installed
  - Node.js environment
  - Development tools

Access:
  - AWS credentials
  - Test S3 bucket
  - CDN configuration (optional)
```

### 11.2 Internal Dependencies

```yaml
Prerequisites:
  - Core utilities (utils-00) complete
  - Database infrastructure ready
  - API framework setup

Parallel Work:
  - Avatar service development
  - Catalog service development
  - Design service development
```

---

## 12. Team & Responsibilities

### 12.1 Core Team

```yaml
Backend Developer 1:
  - Image processing utilities
  - File operations
  - Testing infrastructure

Backend Developer 2:
  - Video processing
  - 3D model processing
  - S3 integration

DevOps Engineer:
  - Infrastructure setup
  - FFmpeg installation
  - AWS configuration
  - Monitoring setup

QA Engineer (Part-time):
  - Test planning
  - Integration testing
  - Performance testing
```

### 12.2 Stakeholders

```yaml
Tech Lead:
  - Architecture review
  - Code review
  - Technical decisions

Product Manager:
  - Requirements clarification
  - Priority decisions
  - Progress tracking

Security Team:
  - Security review
  - Compliance verification
```

---

## 13. Communication Plan

### 13.1 Weekly Rituals

```yaml
Monday:
  - Week planning
  - Task breakdown
  - Blocker identification

Wednesday:
  - Mid-week sync
  - Progress check
  - Issue resolution

Friday:
  - Demo day
  - Week retrospective
  - Next week planning
```

### 13.2 Status Reporting

```yaml
Daily:
  - Standup (15 min)
  - Slack updates

Weekly:
  - Progress report
  - Metrics dashboard
  - Risk assessment

Milestone:
  - Phase completion demo
  - Documentation review
  - Stakeholder sign-off
```

---

## 14. Exit Criteria

### 14.1 Phase Completion

Each phase must meet:
- [ ] All planned features complete
- [ ] Tests passing (>90% coverage)
- [ ] Code reviewed
- [ ] Documentation updated
- [ ] Performance benchmarks met
- [ ] No critical bugs

### 14.2 Project Completion

Final sign-off requires:
- [ ] All phases complete
- [ ] Integration tests passing
- [ ] Performance validated
- [ ] Security review passed
- [ ] Documentation complete
- [ ] Production deployment successful
- [ ] Monitoring operational
- [ ] Team trained

---

## 15. Post-Implementation

### 15.1 Maintenance Plan

```yaml
Ongoing:
  - Monitor performance
  - Track errors
  - Update dependencies
  - Optimize as needed

Monthly:
  - Performance review
  - Usage analysis
  - Cost optimization
  - Feature requests

Quarterly:
  - Major updates
  - Dependency upgrades
  - Security patches
```

### 15.2 Future Enhancements

```yaml
Phase 2 Features:
  - AI-based image enhancement
  - Advanced video editing
  - Real-time streaming
  - Advanced 3D operations

Optimizations:
  - GPU acceleration
  - Distributed processing
  - Advanced caching
  - CDN optimization
```

---

## Document Metadata

**Version**: 1.0
**Author**: Fashion Wallet Engineering Team
**Status**: Draft
**Review Cycle**: Weekly during implementation
**Next Review**: December 2025
**Dependencies**: spec-utils-01, arch-utils-01

---

**End of Media & File Processing Utilities Implementation Plan**

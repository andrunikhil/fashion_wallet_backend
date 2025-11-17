/**
 * Mock S3 service for testing file storage operations
 * Provides in-memory file storage simulation
 *
 * @example
 * ```typescript
 * const s3Mock = new S3Mock();
 *
 * // Upload file
 * await s3Mock.upload({
 *   Bucket: 'test-bucket',
 *   Key: 'test.txt',
 *   Body: Buffer.from('test content')
 * }).promise();
 *
 * // Get file
 * const result = await s3Mock.getObject({
 *   Bucket: 'test-bucket',
 *   Key: 'test.txt'
 * }).promise();
 * ```
 */
export class S3Mock {
  private storage: Map<string, Map<string, Buffer>> = new Map();

  /**
   * Upload a file to mock S3
   */
  upload = jest.fn((params: {
    Bucket: string;
    Key: string;
    Body: Buffer | string;
    ContentType?: string;
    ACL?: string;
  }) => {
    const { Bucket, Key, Body } = params;

    if (!this.storage.has(Bucket)) {
      this.storage.set(Bucket, new Map());
    }

    const bucket = this.storage.get(Bucket)!;
    const buffer = typeof Body === 'string' ? Buffer.from(Body) : Body;
    bucket.set(Key, buffer);

    return {
      promise: jest.fn().mockResolvedValue({
        Location: `https://${Bucket}.s3.amazonaws.com/${Key}`,
        ETag: '"mock-etag"',
        Bucket,
        Key
      })
    };
  });

  /**
   * Get a file from mock S3
   */
  getObject = jest.fn((params: {
    Bucket: string;
    Key: string;
  }) => {
    const { Bucket, Key } = params;

    return {
      promise: jest.fn().mockImplementation(async () => {
        const bucket = this.storage.get(Bucket);
        if (!bucket || !bucket.has(Key)) {
          throw new Error('NoSuchKey: The specified key does not exist.');
        }

        return {
          Body: bucket.get(Key),
          ContentType: 'application/octet-stream',
          ContentLength: bucket.get(Key)!.length,
          ETag: '"mock-etag"',
          LastModified: new Date()
        };
      })
    };
  });

  /**
   * Delete a file from mock S3
   */
  deleteObject = jest.fn((params: {
    Bucket: string;
    Key: string;
  }) => {
    const { Bucket, Key } = params;

    return {
      promise: jest.fn().mockImplementation(async () => {
        const bucket = this.storage.get(Bucket);
        if (bucket) {
          bucket.delete(Key);
        }

        return {
          DeleteMarker: false,
          VersionId: 'mock-version-id'
        };
      })
    };
  });

  /**
   * List objects in a bucket
   */
  listObjectsV2 = jest.fn((params: {
    Bucket: string;
    Prefix?: string;
    MaxKeys?: number;
  }) => {
    const { Bucket, Prefix = '', MaxKeys = 1000 } = params;

    return {
      promise: jest.fn().mockImplementation(async () => {
        const bucket = this.storage.get(Bucket);
        if (!bucket) {
          return {
            Contents: [],
            KeyCount: 0,
            IsTruncated: false
          };
        }

        const keys = Array.from(bucket.keys())
          .filter(key => key.startsWith(Prefix))
          .slice(0, MaxKeys);

        return {
          Contents: keys.map(key => ({
            Key: key,
            LastModified: new Date(),
            ETag: '"mock-etag"',
            Size: bucket.get(key)!.length,
            StorageClass: 'STANDARD'
          })),
          KeyCount: keys.length,
          IsTruncated: keys.length === MaxKeys
        };
      })
    };
  });

  /**
   * Check if an object exists
   */
  headObject = jest.fn((params: {
    Bucket: string;
    Key: string;
  }) => {
    const { Bucket, Key } = params;

    return {
      promise: jest.fn().mockImplementation(async () => {
        const bucket = this.storage.get(Bucket);
        if (!bucket || !bucket.has(Key)) {
          throw new Error('NotFound: The specified key does not exist.');
        }

        return {
          ContentType: 'application/octet-stream',
          ContentLength: bucket.get(Key)!.length,
          ETag: '"mock-etag"',
          LastModified: new Date()
        };
      })
    };
  });

  /**
   * Copy an object within S3
   */
  copyObject = jest.fn((params: {
    Bucket: string;
    CopySource: string;
    Key: string;
  }) => {
    const { Bucket, CopySource, Key } = params;

    return {
      promise: jest.fn().mockImplementation(async () => {
        // Parse copy source: /source-bucket/source-key
        const [, sourceBucket, sourceKey] = CopySource.match(/^\/([^/]+)\/(.+)$/) || [];

        if (!sourceBucket || !sourceKey) {
          throw new Error('Invalid CopySource format');
        }

        const srcBucket = this.storage.get(sourceBucket);
        if (!srcBucket || !srcBucket.has(sourceKey)) {
          throw new Error('NoSuchKey: The specified source key does not exist.');
        }

        if (!this.storage.has(Bucket)) {
          this.storage.set(Bucket, new Map());
        }

        const destBucket = this.storage.get(Bucket)!;
        destBucket.set(Key, srcBucket.get(sourceKey)!);

        return {
          CopyObjectResult: {
            ETag: '"mock-etag"',
            LastModified: new Date()
          }
        };
      })
    };
  });

  /**
   * Clear all storage
   */
  clear(): void {
    this.storage.clear();
  }

  /**
   * Get all files in a bucket (for testing purposes)
   */
  getBucketContents(bucket: string): string[] {
    const bucketData = this.storage.get(bucket);
    return bucketData ? Array.from(bucketData.keys()) : [];
  }
}

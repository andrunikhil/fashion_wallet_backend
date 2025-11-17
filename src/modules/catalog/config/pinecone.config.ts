import { registerAs } from '@nestjs/config';

export const pineconeConfig = registerAs('pinecone', () => ({
  apiKey: process.env.PINECONE_API_KEY || '',
  environment: process.env.PINECONE_ENVIRONMENT || 'us-west1-gcp',
  indexName: process.env.PINECONE_INDEX_NAME || 'catalog-visual-search',
  dimension: 2048, // ResNet50 output dimension
  metric: 'cosine' as const,
  podType: process.env.PINECONE_POD_TYPE || 'p1.x1',
}));

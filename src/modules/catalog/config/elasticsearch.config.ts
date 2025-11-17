import { registerAs } from '@nestjs/config';

export const elasticsearchConfig = registerAs('elasticsearch', () => ({
  node: process.env.ELASTICSEARCH_URL || 'http://localhost:9200',
  auth: {
    username: process.env.ELASTICSEARCH_USERNAME || 'elastic',
    password: process.env.ELASTICSEARCH_PASSWORD || '',
  },
  maxRetries: 3,
  requestTimeout: 30000,
  sniffOnStart: true,
}));

export const catalogIndexMapping = {
  settings: {
    number_of_shards: 3,
    number_of_replicas: 2,
    analysis: {
      analyzer: {
        catalog_analyzer: {
          type: 'custom',
          tokenizer: 'standard',
          filter: [
            'lowercase',
            'asciifolding',
            'catalog_synonym',
            'edge_ngram_filter',
          ],
        },
      },
      filter: {
        edge_ngram_filter: {
          type: 'edge_ngram',
          min_gram: 2,
          max_gram: 10,
        },
        catalog_synonym: {
          type: 'synonym',
          synonyms: [
            'tshirt, t-shirt, tee',
            'jean, denim',
            'shirt, blouse',
            'dress, gown',
            'jacket, coat',
            'pants, trousers',
            'skirt, miniskirt, maxiskirt',
          ],
        },
      },
    },
  },
  mappings: {
    properties: {
      id: { type: 'keyword' },
      type: { type: 'keyword' },
      name: {
        type: 'text',
        analyzer: 'catalog_analyzer',
        fields: {
          keyword: { type: 'keyword' },
          suggest: { type: 'completion' },
        },
      },
      description: {
        type: 'text',
        analyzer: 'catalog_analyzer',
      },
      category: { type: 'keyword' },
      subcategory: { type: 'keyword' },
      tags: { type: 'keyword' },
      colors: {
        type: 'nested',
        properties: {
          name: { type: 'keyword' },
          hex: { type: 'keyword' },
        },
      },
      occasions: { type: 'keyword' },
      seasons: { type: 'keyword' },
      styles: { type: 'keyword' },
      brand_partner: { type: 'keyword' },
      is_active: { type: 'boolean' },
      is_featured: { type: 'boolean' },
      popularity_score: { type: 'float' },
      created_at: { type: 'date' },
      updated_at: { type: 'date' },
      price_range: { type: 'integer_range' },
    },
  },
};

import { MongooseModuleOptions } from '@nestjs/mongoose';

export const getMongoConfig = (): MongooseModuleOptions => ({
  uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/fashion_wallet',
  maxPoolSize: 100,
  minPoolSize: 10,
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
  family: 4,
  retryWrites: true,
  retryReads: true,
  autoIndex: process.env.NODE_ENV !== 'production', // Auto-create indexes in development
});

export const getProductionMongoConfig = (): MongooseModuleOptions => ({
  ...getMongoConfig(),
  autoIndex: false,
  ssl: process.env.MONGODB_SSL === 'true',
  readPreference: 'secondaryPreferred',
  w: 'majority',
  wtimeoutMS: 5000,
});

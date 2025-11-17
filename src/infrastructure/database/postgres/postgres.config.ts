import { TypeOrmModuleOptions } from '@nestjs/typeorm';

export const getPostgresConfig = (): TypeOrmModuleOptions => ({
  type: 'postgres',
  host: process.env.POSTGRES_HOST || 'localhost',
  port: parseInt(process.env.POSTGRES_PORT || '5432'),
  username: process.env.POSTGRES_USER || 'postgres',
  password: process.env.POSTGRES_PASSWORD || 'postgres',
  database: process.env.POSTGRES_DB || 'fashion_wallet',
  synchronize: false, // Always use migrations in production
  logging: process.env.NODE_ENV === 'development',
  entities: [__dirname + '/../../**/*.entity{.ts,.js}'],
  migrations: [__dirname + '/../migrations/postgres/*{.ts,.js}'],
  migrationsRun: false, // Run migrations manually
  extra: {
    max: 100, // Maximum pool size
    min: 10, // Minimum pool size
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
  },
});

export const getProductionPostgresConfig = (): TypeOrmModuleOptions => ({
  ...getPostgresConfig(),
  synchronize: false,
  logging: ['error', 'warn'],
  extra: {
    max: 100,
    min: 10,
    idle: 10000,
    acquire: 30000,
    evict: 1000,
    connectionTimeoutMillis: 5000,
    idleTimeoutMillis: 30000,
    maxUses: 7500,
    ssl: process.env.POSTGRES_SSL === 'true' ? {
      rejectUnauthorized: true,
    } : false,
  },
});

import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
import { join } from 'path';

// Load environment variables
dotenv.config();

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.POSTGRES_HOST || 'localhost',
  port: parseInt(process.env.POSTGRES_PORT || '5432'),
  username: process.env.POSTGRES_USER || 'postgres',
  password: process.env.POSTGRES_PASSWORD || 'postgres',
  database: process.env.POSTGRES_DB || 'fashion_wallet',
  synchronize: false,
  logging: process.env.NODE_ENV === 'development',
  entities: [join(__dirname, '../entities/**/*.entity{.ts,.js}')],
  migrations: [join(__dirname, '../migrations/postgres/*{.ts,.js}')],
  migrationsTableName: 'migrations',
});

import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitializeSchemas1699876543000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Enable required PostgreSQL extensions
    await queryRunner.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');
    await queryRunner.query('CREATE EXTENSION IF NOT EXISTS "pgcrypto"');
    await queryRunner.query('CREATE EXTENSION IF NOT EXISTS "pg_trgm"');

    // Create schemas
    await queryRunner.query('CREATE SCHEMA IF NOT EXISTS shared');
    await queryRunner.query('CREATE SCHEMA IF NOT EXISTS avatar');
    await queryRunner.query('CREATE SCHEMA IF NOT EXISTS catalog');
    await queryRunner.query('CREATE SCHEMA IF NOT EXISTS design');
    await queryRunner.query('CREATE SCHEMA IF NOT EXISTS audit');

    // Add comments
    await queryRunner.query(`COMMENT ON SCHEMA shared IS 'Shared resources like users, roles, etc.'`);
    await queryRunner.query(`COMMENT ON SCHEMA avatar IS 'Avatar-related tables'`);
    await queryRunner.query(`COMMENT ON SCHEMA catalog IS 'Catalog items (silhouettes, fabrics, patterns)'`);
    await queryRunner.query(`COMMENT ON SCHEMA design IS 'Design-related tables'`);
    await queryRunner.query(`COMMENT ON SCHEMA audit IS 'Audit logging tables'`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop schemas (CASCADE will drop all tables in the schema)
    await queryRunner.query('DROP SCHEMA IF EXISTS audit CASCADE');
    await queryRunner.query('DROP SCHEMA IF EXISTS design CASCADE');
    await queryRunner.query('DROP SCHEMA IF EXISTS catalog CASCADE');
    await queryRunner.query('DROP SCHEMA IF EXISTS avatar CASCADE');
    await queryRunner.query('DROP SCHEMA IF EXISTS shared CASCADE');
  }
}

import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateExtensions1700000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Enable UUID extension for uuid_generate_v4()
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);

    // Enable pg_trgm for text search optimization (useful for name searches)
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "pg_trgm"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Note: We don't drop extensions as they might be used by other parts of the application
    // await queryRunner.query(`DROP EXTENSION IF EXISTS "pg_trgm"`);
    // await queryRunner.query(`DROP EXTENSION IF EXISTS "uuid-ossp"`);
  }
}

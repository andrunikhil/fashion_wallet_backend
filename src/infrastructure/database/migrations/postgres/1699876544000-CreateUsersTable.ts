import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateUsersTable1699876544000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create users table
    await queryRunner.query(`
      CREATE TABLE shared.users (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        first_name VARCHAR(100) NOT NULL,
        last_name VARCHAR(100) NOT NULL,
        role VARCHAR(50) NOT NULL DEFAULT 'user',
        is_active BOOLEAN DEFAULT true,
        email_verified BOOLEAN DEFAULT false,
        created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
        deleted_at TIMESTAMPTZ NULL,
        created_by UUID,
        updated_by UUID,
        CONSTRAINT fk_users_created_by FOREIGN KEY (created_by) REFERENCES shared.users(id),
        CONSTRAINT fk_users_updated_by FOREIGN KEY (updated_by) REFERENCES shared.users(id)
      )
    `);

    // Create indexes
    await queryRunner.query(`
      CREATE INDEX idx_users_email
      ON shared.users(email)
      WHERE deleted_at IS NULL
    `);

    await queryRunner.query(`
      CREATE INDEX idx_users_role
      ON shared.users(role)
      WHERE deleted_at IS NULL
    `);

    await queryRunner.query(`
      CREATE INDEX idx_users_active
      ON shared.users(is_active)
      WHERE deleted_at IS NULL
    `);

    // Add trigger for updated_at
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = NOW();
        RETURN NEW;
      END;
      $$ language 'plpgsql';
    `);

    await queryRunner.query(`
      CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON shared.users
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    `);

    // Add comment
    await queryRunner.query(`
      COMMENT ON TABLE shared.users IS 'Core user accounts and authentication'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS shared.users CASCADE');
    await queryRunner.query('DROP FUNCTION IF EXISTS update_updated_at_column CASCADE');
  }
}

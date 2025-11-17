import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateAuditLogsTable1699876545000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create audit_logs table
    await queryRunner.query(`
      CREATE TABLE audit.audit_logs (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID,
        entity_type VARCHAR(100) NOT NULL,
        entity_id UUID NOT NULL,
        action VARCHAR(20) NOT NULL CHECK (action IN ('CREATE', 'UPDATE', 'DELETE', 'READ')),
        old_values JSONB,
        new_values JSONB,
        metadata TEXT,
        ip_address VARCHAR(45),
        user_agent TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
        CONSTRAINT fk_audit_logs_user FOREIGN KEY (user_id) REFERENCES shared.users(id) ON DELETE SET NULL
      )
    `);

    // Create indexes for common queries
    await queryRunner.query(`
      CREATE INDEX idx_audit_logs_user_created
      ON audit.audit_logs(user_id, created_at DESC)
    `);

    await queryRunner.query(`
      CREATE INDEX idx_audit_logs_entity
      ON audit.audit_logs(entity_type, entity_id)
    `);

    await queryRunner.query(`
      CREATE INDEX idx_audit_logs_action_created
      ON audit.audit_logs(action, created_at DESC)
    `);

    await queryRunner.query(`
      CREATE INDEX idx_audit_logs_created
      ON audit.audit_logs(created_at DESC)
    `);

    // Add comment
    await queryRunner.query(`
      COMMENT ON TABLE audit.audit_logs IS 'Audit trail for all database operations'
    `);

    // Create a function to automatically clean old audit logs (optional - keep 1 year)
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION audit.cleanup_old_audit_logs()
      RETURNS void AS $$
      BEGIN
        DELETE FROM audit.audit_logs
        WHERE created_at < NOW() - INTERVAL '1 year';
      END;
      $$ LANGUAGE plpgsql;
    `);

    // Add comment to function
    await queryRunner.query(`
      COMMENT ON FUNCTION audit.cleanup_old_audit_logs() IS 'Removes audit logs older than 1 year'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP FUNCTION IF EXISTS audit.cleanup_old_audit_logs CASCADE');
    await queryRunner.query('DROP TABLE IF EXISTS audit.audit_logs CASCADE');
  }
}

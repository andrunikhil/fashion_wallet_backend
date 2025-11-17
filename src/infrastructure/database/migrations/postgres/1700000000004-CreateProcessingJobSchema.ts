import { MigrationInterface, QueryRunner, Table, TableIndex, TableForeignKey } from 'typeorm';

export class CreateProcessingJobSchema1700000000004 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create enum types
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE avatar.processing_job_type AS ENUM ('photo-processing', 'model-generation', 'model-regeneration', 'measurement-update');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE avatar.processing_job_status AS ENUM ('pending', 'queued', 'processing', 'completed', 'failed', 'cancelled', 'retrying');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    // Create processing_jobs table
    await queryRunner.createTable(
      new Table({
        schema: 'avatar',
        name: 'processing_jobs',
        columns: [
          {
            name: 'id',
            type: 'varchar',
            length: '255',
            isPrimary: true,
            isNullable: false,
          },
          {
            name: 'avatar_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'user_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'job_type',
            type: 'avatar.processing_job_type',
            isNullable: false,
          },
          {
            name: 'status',
            type: 'avatar.processing_job_status',
            default: "'pending'",
            isNullable: false,
          },
          {
            name: 'priority',
            type: 'int',
            default: 5,
            isNullable: false,
          },
          {
            name: 'progress',
            type: 'int',
            default: 0,
            isNullable: false,
          },
          {
            name: 'current_step',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'total_steps',
            type: 'int',
            isNullable: true,
          },
          {
            name: 'input_data',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'result_data',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'error_message',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'error_stack',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'error_code',
            type: 'varchar',
            length: '100',
            isNullable: true,
          },
          {
            name: 'attempt_number',
            type: 'int',
            default: 1,
            isNullable: false,
          },
          {
            name: 'max_attempts',
            type: 'int',
            default: 3,
            isNullable: false,
          },
          {
            name: 'last_attempt_at',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'started_at',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'completed_at',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'failed_at',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'cancelled_at',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'processing_duration_ms',
            type: 'int',
            isNullable: true,
          },
          {
            name: 'queue_name',
            type: 'varchar',
            length: '100',
            default: "'avatar-processing'",
            isNullable: false,
          },
          {
            name: 'worker_id',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'metadata',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'keep_on_complete',
            type: 'boolean',
            default: false,
            isNullable: false,
          },
          {
            name: 'remove_on_complete_after',
            type: 'int',
            isNullable: true,
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'now()',
            isNullable: false,
          },
          {
            name: 'updated_at',
            type: 'timestamp',
            default: 'now()',
            isNullable: false,
          },
        ],
      }),
      true,
    );

    // Create indexes
    await queryRunner.createIndex(
      'avatar.processing_jobs',
      new TableIndex({
        name: 'IDX_processing_jobs_avatar_id',
        columnNames: ['avatar_id'],
      }),
    );

    await queryRunner.createIndex(
      'avatar.processing_jobs',
      new TableIndex({
        name: 'IDX_processing_jobs_user_id',
        columnNames: ['user_id'],
      }),
    );

    await queryRunner.createIndex(
      'avatar.processing_jobs',
      new TableIndex({
        name: 'IDX_processing_jobs_avatar_id_status',
        columnNames: ['avatar_id', 'status'],
      }),
    );

    await queryRunner.createIndex(
      'avatar.processing_jobs',
      new TableIndex({
        name: 'IDX_processing_jobs_status_created_at',
        columnNames: ['status', 'created_at'],
      }),
    );

    await queryRunner.createIndex(
      'avatar.processing_jobs',
      new TableIndex({
        name: 'IDX_processing_jobs_job_type',
        columnNames: ['job_type'],
      }),
    );

    // Create foreign key
    await queryRunner.createForeignKey(
      'avatar.processing_jobs',
      new TableForeignKey({
        name: 'FK_processing_jobs_avatar_id',
        columnNames: ['avatar_id'],
        referencedTableName: 'avatars',
        referencedSchema: 'avatar',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      }),
    );

    // Add comment to table
    await queryRunner.query(`
      COMMENT ON TABLE avatar.processing_jobs IS 'Background processing jobs for avatar generation and updates';
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop foreign key
    await queryRunner.dropForeignKey('avatar.processing_jobs', 'FK_processing_jobs_avatar_id');

    // Drop indexes
    await queryRunner.dropIndex('avatar.processing_jobs', 'IDX_processing_jobs_job_type');
    await queryRunner.dropIndex('avatar.processing_jobs', 'IDX_processing_jobs_status_created_at');
    await queryRunner.dropIndex('avatar.processing_jobs', 'IDX_processing_jobs_avatar_id_status');
    await queryRunner.dropIndex('avatar.processing_jobs', 'IDX_processing_jobs_user_id');
    await queryRunner.dropIndex('avatar.processing_jobs', 'IDX_processing_jobs_avatar_id');

    // Drop table
    await queryRunner.dropTable('avatar.processing_jobs', true);

    // Drop enum types
    await queryRunner.query(`DROP TYPE IF EXISTS avatar.processing_job_status`);
    await queryRunner.query(`DROP TYPE IF EXISTS avatar.processing_job_type`);
  }
}

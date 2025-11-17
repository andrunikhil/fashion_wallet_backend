import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class CreateAvatarSchema1700000000001 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create avatar schema if it doesn't exist
    await queryRunner.query(`CREATE SCHEMA IF NOT EXISTS avatar`);

    // Create enum types
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE avatar.avatar_status AS ENUM ('processing', 'ready', 'error', 'pending');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE avatar.avatar_source AS ENUM ('photo-based', 'manual', 'imported');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE avatar.body_type AS ENUM ('rectangle', 'triangle', 'inverted-triangle', 'hourglass', 'oval');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE avatar.gender_type AS ENUM ('male', 'female', 'unisex');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    // Create avatars table
    await queryRunner.createTable(
      new Table({
        schema: 'avatar',
        name: 'avatars',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'user_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'name',
            type: 'varchar',
            length: '255',
            isNullable: false,
          },
          {
            name: 'status',
            type: 'avatar.avatar_status',
            default: "'pending'",
            isNullable: false,
          },
          {
            name: 'source',
            type: 'avatar.avatar_source',
            default: "'photo-based'",
            isNullable: false,
          },
          {
            name: 'body_type',
            type: 'avatar.body_type',
            isNullable: true,
          },
          {
            name: 'gender',
            type: 'avatar.gender_type',
            default: "'unisex'",
            isNullable: false,
          },
          {
            name: 'model_url',
            type: 'varchar',
            length: '512',
            isNullable: true,
          },
          {
            name: 'model_format',
            type: 'varchar',
            length: '20',
            isNullable: true,
          },
          {
            name: 'model_size_bytes',
            type: 'bigint',
            isNullable: true,
          },
          {
            name: 'thumbnail_url',
            type: 'varchar',
            length: '512',
            isNullable: true,
          },
          {
            name: 'processing_progress',
            type: 'int',
            default: 0,
            isNullable: false,
          },
          {
            name: 'processing_message',
            type: 'varchar',
            length: '500',
            isNullable: true,
          },
          {
            name: 'error_message',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'confidence_score',
            type: 'decimal',
            precision: 5,
            scale: 2,
            isNullable: true,
          },
          {
            name: 'customization',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'metadata',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'is_default',
            type: 'boolean',
            default: false,
            isNullable: false,
          },
          {
            name: 'is_public',
            type: 'boolean',
            default: false,
            isNullable: false,
          },
          {
            name: 'view_count',
            type: 'int',
            default: 0,
            isNullable: false,
          },
          {
            name: 'last_viewed_at',
            type: 'timestamp',
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
          {
            name: 'deleted_at',
            type: 'timestamp',
            isNullable: true,
          },
        ],
      }),
      true,
    );

    // Create indexes
    await queryRunner.createIndex(
      'avatar.avatars',
      new TableIndex({
        name: 'IDX_avatars_user_id',
        columnNames: ['user_id'],
      }),
    );

    await queryRunner.createIndex(
      'avatar.avatars',
      new TableIndex({
        name: 'IDX_avatars_user_id_deleted_at',
        columnNames: ['user_id', 'deleted_at'],
      }),
    );

    await queryRunner.createIndex(
      'avatar.avatars',
      new TableIndex({
        name: 'IDX_avatars_status',
        columnNames: ['status'],
      }),
    );

    // Add comment to table
    await queryRunner.query(`
      COMMENT ON TABLE avatar.avatars IS 'User avatar records with 3D model information';
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes
    await queryRunner.dropIndex('avatar.avatars', 'IDX_avatars_status');
    await queryRunner.dropIndex('avatar.avatars', 'IDX_avatars_user_id_deleted_at');
    await queryRunner.dropIndex('avatar.avatars', 'IDX_avatars_user_id');

    // Drop table
    await queryRunner.dropTable('avatar.avatars', true);

    // Drop enum types
    await queryRunner.query(`DROP TYPE IF EXISTS avatar.gender_type`);
    await queryRunner.query(`DROP TYPE IF EXISTS avatar.body_type`);
    await queryRunner.query(`DROP TYPE IF EXISTS avatar.avatar_source`);
    await queryRunner.query(`DROP TYPE IF EXISTS avatar.avatar_status`);

    // Note: We don't drop the schema in case other tables exist
    // await queryRunner.query(`DROP SCHEMA IF EXISTS avatar CASCADE`);
  }
}

import { MigrationInterface, QueryRunner, Table, TableIndex, TableForeignKey } from 'typeorm';

export class CreatePhotoSchema1700000000003 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create enum types
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE avatar.photo_type AS ENUM ('front', 'side', 'back', 'angled', 'custom');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE avatar.photo_status AS ENUM ('uploaded', 'validated', 'processing', 'processed', 'failed');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    // Create photos table
    await queryRunner.createTable(
      new Table({
        schema: 'avatar',
        name: 'photos',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'avatar_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'type',
            type: 'avatar.photo_type',
            isNullable: false,
          },
          {
            name: 'status',
            type: 'avatar.photo_status',
            default: "'uploaded'",
            isNullable: false,
          },
          {
            name: 'original_url',
            type: 'varchar',
            length: '512',
            isNullable: false,
          },
          {
            name: 'original_s3_key',
            type: 'varchar',
            length: '512',
            isNullable: false,
          },
          {
            name: 'processed_url',
            type: 'varchar',
            length: '512',
            isNullable: true,
          },
          {
            name: 'processed_s3_key',
            type: 'varchar',
            length: '512',
            isNullable: true,
          },
          {
            name: 'thumbnail_url',
            type: 'varchar',
            length: '512',
            isNullable: true,
          },
          {
            name: 'original_filename',
            type: 'varchar',
            length: '255',
            isNullable: false,
          },
          {
            name: 'file_size_bytes',
            type: 'bigint',
            isNullable: false,
          },
          {
            name: 'mime_type',
            type: 'varchar',
            length: '100',
            isNullable: false,
          },
          {
            name: 'width',
            type: 'int',
            isNullable: true,
          },
          {
            name: 'height',
            type: 'int',
            isNullable: true,
          },
          {
            name: 'has_background_removed',
            type: 'boolean',
            default: false,
            isNullable: false,
          },
          {
            name: 'background_mask_url',
            type: 'varchar',
            length: '512',
            isNullable: true,
          },
          {
            name: 'quality_score',
            type: 'decimal',
            precision: 5,
            scale: 2,
            isNullable: true,
          },
          {
            name: 'pose_detected',
            type: 'boolean',
            default: false,
            isNullable: false,
          },
          {
            name: 'landmarks_detected',
            type: 'boolean',
            default: false,
            isNullable: false,
          },
          {
            name: 'exif_data',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'validation',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'metadata',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'error_message',
            type: 'text',
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
      'avatar.photos',
      new TableIndex({
        name: 'IDX_photos_avatar_id',
        columnNames: ['avatar_id'],
      }),
    );

    await queryRunner.createIndex(
      'avatar.photos',
      new TableIndex({
        name: 'IDX_photos_avatar_id_type',
        columnNames: ['avatar_id', 'type'],
      }),
    );

    await queryRunner.createIndex(
      'avatar.photos',
      new TableIndex({
        name: 'IDX_photos_status',
        columnNames: ['status'],
      }),
    );

    // Create foreign key
    await queryRunner.createForeignKey(
      'avatar.photos',
      new TableForeignKey({
        name: 'FK_photos_avatar_id',
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
      COMMENT ON TABLE avatar.photos IS 'User photos used for avatar generation with processing metadata';
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop foreign key
    await queryRunner.dropForeignKey('avatar.photos', 'FK_photos_avatar_id');

    // Drop indexes
    await queryRunner.dropIndex('avatar.photos', 'IDX_photos_status');
    await queryRunner.dropIndex('avatar.photos', 'IDX_photos_avatar_id_type');
    await queryRunner.dropIndex('avatar.photos', 'IDX_photos_avatar_id');

    // Drop table
    await queryRunner.dropTable('avatar.photos', true);

    // Drop enum types
    await queryRunner.query(`DROP TYPE IF EXISTS avatar.photo_status`);
    await queryRunner.query(`DROP TYPE IF EXISTS avatar.photo_type`);
  }
}

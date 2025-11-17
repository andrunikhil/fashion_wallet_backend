import { MigrationInterface, QueryRunner, Table, TableIndex, TableForeignKey } from 'typeorm';

export class CreateMeasurementSchema1700000000002 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create enum types
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE avatar.measurement_unit AS ENUM ('metric', 'imperial');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE avatar.measurement_source AS ENUM ('auto', 'manual', 'imported');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    // Create measurements table
    await queryRunner.createTable(
      new Table({
        schema: 'avatar',
        name: 'measurements',
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
            isUnique: true,
          },
          {
            name: 'height',
            type: 'decimal',
            precision: 6,
            scale: 2,
            isNullable: false,
          },
          {
            name: 'weight',
            type: 'decimal',
            precision: 6,
            scale: 2,
            isNullable: true,
          },
          {
            name: 'shoulder_width',
            type: 'decimal',
            precision: 6,
            scale: 2,
            isNullable: true,
          },
          {
            name: 'chest_circumference',
            type: 'decimal',
            precision: 6,
            scale: 2,
            isNullable: true,
          },
          {
            name: 'bust_circumference',
            type: 'decimal',
            precision: 6,
            scale: 2,
            isNullable: true,
          },
          {
            name: 'under_bust_circumference',
            type: 'decimal',
            precision: 6,
            scale: 2,
            isNullable: true,
          },
          {
            name: 'waist_circumference',
            type: 'decimal',
            precision: 6,
            scale: 2,
            isNullable: true,
          },
          {
            name: 'natural_waist_circumference',
            type: 'decimal',
            precision: 6,
            scale: 2,
            isNullable: true,
          },
          {
            name: 'hip_circumference',
            type: 'decimal',
            precision: 6,
            scale: 2,
            isNullable: true,
          },
          {
            name: 'high_hip_circumference',
            type: 'decimal',
            precision: 6,
            scale: 2,
            isNullable: true,
          },
          {
            name: 'arm_length',
            type: 'decimal',
            precision: 6,
            scale: 2,
            isNullable: true,
          },
          {
            name: 'bicep_circumference',
            type: 'decimal',
            precision: 6,
            scale: 2,
            isNullable: true,
          },
          {
            name: 'wrist_circumference',
            type: 'decimal',
            precision: 6,
            scale: 2,
            isNullable: true,
          },
          {
            name: 'inseam_length',
            type: 'decimal',
            precision: 6,
            scale: 2,
            isNullable: true,
          },
          {
            name: 'outseam_length',
            type: 'decimal',
            precision: 6,
            scale: 2,
            isNullable: true,
          },
          {
            name: 'thigh_circumference',
            type: 'decimal',
            precision: 6,
            scale: 2,
            isNullable: true,
          },
          {
            name: 'knee_circumference',
            type: 'decimal',
            precision: 6,
            scale: 2,
            isNullable: true,
          },
          {
            name: 'calf_circumference',
            type: 'decimal',
            precision: 6,
            scale: 2,
            isNullable: true,
          },
          {
            name: 'ankle_circumference',
            type: 'decimal',
            precision: 6,
            scale: 2,
            isNullable: true,
          },
          {
            name: 'neck_circumference',
            type: 'decimal',
            precision: 6,
            scale: 2,
            isNullable: true,
          },
          {
            name: 'torso_length',
            type: 'decimal',
            precision: 6,
            scale: 2,
            isNullable: true,
          },
          {
            name: 'back_length',
            type: 'decimal',
            precision: 6,
            scale: 2,
            isNullable: true,
          },
          {
            name: 'foot_length',
            type: 'decimal',
            precision: 6,
            scale: 2,
            isNullable: true,
          },
          {
            name: 'foot_width',
            type: 'decimal',
            precision: 6,
            scale: 2,
            isNullable: true,
          },
          {
            name: 'unit',
            type: 'avatar.measurement_unit',
            default: "'metric'",
            isNullable: false,
          },
          {
            name: 'source',
            type: 'avatar.measurement_source',
            default: "'auto'",
            isNullable: false,
          },
          {
            name: 'confidence_score',
            type: 'decimal',
            precision: 5,
            scale: 4,
            isNullable: true,
          },
          {
            name: 'metadata',
            type: 'jsonb',
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
      'avatar.measurements',
      new TableIndex({
        name: 'IDX_measurements_avatar_id',
        columnNames: ['avatar_id'],
      }),
    );

    // Create foreign key
    await queryRunner.createForeignKey(
      'avatar.measurements',
      new TableForeignKey({
        name: 'FK_measurements_avatar_id',
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
      COMMENT ON TABLE avatar.measurements IS 'Body measurements for avatars extracted from photos or manually entered';
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop foreign key
    await queryRunner.dropForeignKey('avatar.measurements', 'FK_measurements_avatar_id');

    // Drop indexes
    await queryRunner.dropIndex('avatar.measurements', 'IDX_measurements_avatar_id');

    // Drop table
    await queryRunner.dropTable('avatar.measurements', true);

    // Drop enum types
    await queryRunner.query(`DROP TYPE IF EXISTS avatar.measurement_source`);
    await queryRunner.query(`DROP TYPE IF EXISTS avatar.measurement_unit`);
  }
}

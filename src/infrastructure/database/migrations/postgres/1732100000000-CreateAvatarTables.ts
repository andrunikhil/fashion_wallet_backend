import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateAvatarTables1732100000000 implements MigrationInterface {
  name = 'CreateAvatarTables1732100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create avatar schema
    await queryRunner.query(`CREATE SCHEMA IF NOT EXISTS "avatar"`);

    // Create enum types
    await queryRunner.query(`
      CREATE TYPE "avatar"."avatar_status_enum" AS ENUM (
        'processing',
        'ready',
        'error',
        'pending'
      )
    `);

    await queryRunner.query(`
      CREATE TYPE "avatar"."avatar_source_enum" AS ENUM (
        'photo-based',
        'manual',
        'imported'
      )
    `);

    await queryRunner.query(`
      CREATE TYPE "avatar"."body_type_enum" AS ENUM (
        'rectangle',
        'triangle',
        'inverted-triangle',
        'hourglass',
        'oval'
      )
    `);

    await queryRunner.query(`
      CREATE TYPE "avatar"."gender_enum" AS ENUM (
        'male',
        'female',
        'unisex'
      )
    `);

    await queryRunner.query(`
      CREATE TYPE "avatar"."measurement_unit_enum" AS ENUM (
        'metric',
        'imperial'
      )
    `);

    await queryRunner.query(`
      CREATE TYPE "avatar"."measurement_source_enum" AS ENUM (
        'auto',
        'manual',
        'imported'
      )
    `);

    await queryRunner.query(`
      CREATE TYPE "avatar"."photo_type_enum" AS ENUM (
        'front',
        'side',
        'back',
        'angled',
        'custom'
      )
    `);

    await queryRunner.query(`
      CREATE TYPE "avatar"."photo_status_enum" AS ENUM (
        'uploaded',
        'validated',
        'processing',
        'processed',
        'failed'
      )
    `);

    await queryRunner.query(`
      CREATE TYPE "avatar"."job_type_enum" AS ENUM (
        'photo-processing',
        'model-generation',
        'model-regeneration',
        'measurement-update'
      )
    `);

    await queryRunner.query(`
      CREATE TYPE "avatar"."job_status_enum" AS ENUM (
        'pending',
        'queued',
        'processing',
        'completed',
        'failed',
        'cancelled',
        'retrying'
      )
    `);

    // Create avatars table
    await queryRunner.query(`
      CREATE TABLE "avatar"."avatars" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "user_id" uuid NOT NULL,
        "name" varchar(255) NOT NULL,
        "status" "avatar"."avatar_status_enum" NOT NULL DEFAULT 'pending',
        "source" "avatar"."avatar_source_enum" NOT NULL DEFAULT 'photo-based',
        "body_type" "avatar"."body_type_enum" NULL,
        "gender" "avatar"."gender_enum" NOT NULL DEFAULT 'unisex',
        "model_url" varchar(512) NULL,
        "model_format" varchar(20) NULL,
        "model_size_bytes" bigint NULL,
        "thumbnail_url" varchar(512) NULL,
        "processing_progress" int NOT NULL DEFAULT 0,
        "processing_message" varchar(500) NULL,
        "error_message" text NULL,
        "confidence_score" decimal(5,2) NULL,
        "customization" jsonb NULL,
        "metadata" jsonb NULL,
        "is_default" boolean NOT NULL DEFAULT false,
        "is_public" boolean NOT NULL DEFAULT false,
        "view_count" int NOT NULL DEFAULT 0,
        "last_viewed_at" timestamp NULL,
        "created_at" timestamp NOT NULL DEFAULT now(),
        "updated_at" timestamp NOT NULL DEFAULT now(),
        "deleted_at" timestamp NULL
      )
    `);

    // Create measurements table
    await queryRunner.query(`
      CREATE TABLE "avatar"."measurements" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "avatar_id" uuid NOT NULL UNIQUE,
        "height" decimal(6,2) NOT NULL,
        "weight" decimal(6,2) NULL,
        "shoulder_width" decimal(6,2) NULL,
        "chest_circumference" decimal(6,2) NULL,
        "bust_circumference" decimal(6,2) NULL,
        "under_bust_circumference" decimal(6,2) NULL,
        "waist_circumference" decimal(6,2) NULL,
        "natural_waist_circumference" decimal(6,2) NULL,
        "hip_circumference" decimal(6,2) NULL,
        "high_hip_circumference" decimal(6,2) NULL,
        "arm_length" decimal(6,2) NULL,
        "bicep_circumference" decimal(6,2) NULL,
        "wrist_circumference" decimal(6,2) NULL,
        "inseam_length" decimal(6,2) NULL,
        "outseam_length" decimal(6,2) NULL,
        "thigh_circumference" decimal(6,2) NULL,
        "knee_circumference" decimal(6,2) NULL,
        "calf_circumference" decimal(6,2) NULL,
        "ankle_circumference" decimal(6,2) NULL,
        "neck_circumference" decimal(6,2) NULL,
        "torso_length" decimal(6,2) NULL,
        "back_length" decimal(6,2) NULL,
        "foot_length" decimal(6,2) NULL,
        "foot_width" decimal(6,2) NULL,
        "unit" "avatar"."measurement_unit_enum" NOT NULL DEFAULT 'metric',
        "source" "avatar"."measurement_source_enum" NOT NULL DEFAULT 'auto',
        "confidence_score" decimal(5,4) NULL,
        "metadata" jsonb NULL,
        "created_at" timestamp NOT NULL DEFAULT now(),
        "updated_at" timestamp NOT NULL DEFAULT now(),
        CONSTRAINT "fk_measurements_avatar" FOREIGN KEY ("avatar_id") REFERENCES "avatar"."avatars"("id") ON DELETE CASCADE
      )
    `);

    // Create photos table
    await queryRunner.query(`
      CREATE TABLE "avatar"."photos" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "avatar_id" uuid NOT NULL,
        "type" "avatar"."photo_type_enum" NOT NULL,
        "status" "avatar"."photo_status_enum" NOT NULL DEFAULT 'uploaded',
        "original_url" varchar(512) NOT NULL,
        "original_s3_key" varchar(512) NOT NULL,
        "processed_url" varchar(512) NULL,
        "processed_s3_key" varchar(512) NULL,
        "thumbnail_url" varchar(512) NULL,
        "original_filename" varchar(255) NOT NULL,
        "file_size_bytes" bigint NOT NULL,
        "mime_type" varchar(100) NOT NULL,
        "width" int NULL,
        "height" int NULL,
        "has_background_removed" boolean NOT NULL DEFAULT false,
        "background_mask_url" varchar(512) NULL,
        "quality_score" decimal(5,2) NULL,
        "pose_detected" boolean NOT NULL DEFAULT false,
        "landmarks_detected" boolean NOT NULL DEFAULT false,
        "exif_data" jsonb NULL,
        "validation" jsonb NULL,
        "metadata" jsonb NULL,
        "error_message" text NULL,
        "created_at" timestamp NOT NULL DEFAULT now(),
        "updated_at" timestamp NOT NULL DEFAULT now(),
        CONSTRAINT "fk_photos_avatar" FOREIGN KEY ("avatar_id") REFERENCES "avatar"."avatars"("id") ON DELETE CASCADE
      )
    `);

    // Create processing_jobs table
    await queryRunner.query(`
      CREATE TABLE "avatar"."processing_jobs" (
        "id" varchar(255) PRIMARY KEY,
        "avatar_id" uuid NOT NULL,
        "user_id" uuid NOT NULL,
        "job_type" "avatar"."job_type_enum" NOT NULL,
        "status" "avatar"."job_status_enum" NOT NULL DEFAULT 'pending',
        "priority" int NOT NULL DEFAULT 5,
        "progress" int NOT NULL DEFAULT 0,
        "current_step" varchar(255) NULL,
        "total_steps" int NULL,
        "input_data" jsonb NULL,
        "result_data" jsonb NULL,
        "error_message" text NULL,
        "error_stack" text NULL,
        "error_code" varchar(100) NULL,
        "attempt_number" int NOT NULL DEFAULT 1,
        "max_attempts" int NOT NULL DEFAULT 3,
        "last_attempt_at" timestamp NULL,
        "started_at" timestamp NULL,
        "completed_at" timestamp NULL,
        "failed_at" timestamp NULL,
        "cancelled_at" timestamp NULL,
        "processing_duration_ms" int NULL,
        "queue_name" varchar(100) NOT NULL DEFAULT 'avatar-processing',
        "worker_id" varchar(255) NULL,
        "metadata" jsonb NULL,
        "keep_on_complete" boolean NOT NULL DEFAULT false,
        "remove_on_complete_after" int NULL,
        "created_at" timestamp NOT NULL DEFAULT now(),
        "updated_at" timestamp NOT NULL DEFAULT now(),
        CONSTRAINT "fk_processing_jobs_avatar" FOREIGN KEY ("avatar_id") REFERENCES "avatar"."avatars"("id") ON DELETE CASCADE
      )
    `);

    // Create indexes for avatars table
    await queryRunner.query(`CREATE INDEX "idx_avatars_user_id" ON "avatar"."avatars" ("user_id")`);
    await queryRunner.query(`CREATE INDEX "idx_avatars_status" ON "avatar"."avatars" ("status")`);
    await queryRunner.query(`CREATE INDEX "idx_avatars_user_deleted" ON "avatar"."avatars" ("user_id", "deleted_at")`);
    await queryRunner.query(`CREATE INDEX "idx_avatars_created_at" ON "avatar"."avatars" ("created_at")`);

    // Create indexes for measurements table
    await queryRunner.query(`CREATE INDEX "idx_measurements_avatar_id" ON "avatar"."measurements" ("avatar_id")`);

    // Create indexes for photos table
    await queryRunner.query(`CREATE INDEX "idx_photos_avatar_id" ON "avatar"."photos" ("avatar_id")`);
    await queryRunner.query(`CREATE INDEX "idx_photos_avatar_type" ON "avatar"."photos" ("avatar_id", "type")`);
    await queryRunner.query(`CREATE INDEX "idx_photos_status" ON "avatar"."photos" ("status")`);

    // Create indexes for processing_jobs table
    await queryRunner.query(`CREATE INDEX "idx_processing_jobs_avatar_id" ON "avatar"."processing_jobs" ("avatar_id")`);
    await queryRunner.query(`CREATE INDEX "idx_processing_jobs_user_id" ON "avatar"."processing_jobs" ("user_id")`);
    await queryRunner.query(`CREATE INDEX "idx_processing_jobs_status" ON "avatar"."processing_jobs" ("status")`);
    await queryRunner.query(`CREATE INDEX "idx_processing_jobs_avatar_status" ON "avatar"."processing_jobs" ("avatar_id", "status")`);
    await queryRunner.query(`CREATE INDEX "idx_processing_jobs_status_created" ON "avatar"."processing_jobs" ("status", "created_at")`);
    await queryRunner.query(`CREATE INDEX "idx_processing_jobs_job_type" ON "avatar"."processing_jobs" ("job_type")`);

    // Add comments for documentation
    await queryRunner.query(`COMMENT ON TABLE "avatar"."avatars" IS 'Stores user avatar metadata and processing status'`);
    await queryRunner.query(`COMMENT ON TABLE "avatar"."measurements" IS 'Stores detailed body measurements for each avatar'`);
    await queryRunner.query(`COMMENT ON TABLE "avatar"."photos" IS 'Stores uploaded photos used for avatar generation'`);
    await queryRunner.query(`COMMENT ON TABLE "avatar"."processing_jobs" IS 'Tracks avatar processing jobs in the queue'`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop tables in reverse order (due to foreign keys)
    await queryRunner.query(`DROP TABLE IF EXISTS "avatar"."processing_jobs"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "avatar"."photos"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "avatar"."measurements"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "avatar"."avatars"`);

    // Drop enum types
    await queryRunner.query(`DROP TYPE IF EXISTS "avatar"."job_status_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "avatar"."job_type_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "avatar"."photo_status_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "avatar"."photo_type_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "avatar"."measurement_source_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "avatar"."measurement_unit_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "avatar"."gender_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "avatar"."body_type_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "avatar"."avatar_source_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "avatar"."avatar_status_enum"`);

    // Drop schema
    await queryRunner.query(`DROP SCHEMA IF EXISTS "avatar" CASCADE`);
  }
}

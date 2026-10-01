import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreatorPhase5Extensions1700000000008 implements MigrationInterface {
  name = 'CreatorPhase5Extensions1700000000008';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ─── 1. Fix schema drift on creators table ──────────────────────────────
    await queryRunner.query(`
      ALTER TABLE "creators"
      ADD COLUMN IF NOT EXISTS "is_featured" BOOLEAN NOT NULL DEFAULT false,
      ADD COLUMN IF NOT EXISTS "featured_order" INTEGER NOT NULL DEFAULT 0
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_creators_is_featured" ON "creators" ("is_featured")
    `);

    // ─── 2. Add pricing fields to creator_stream_settings ────────────────────
    await queryRunner.query(`
      ALTER TABLE "creator_stream_settings"
      ADD COLUMN IF NOT EXISTS "chat_price_per_message_coins" INTEGER NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS "default_stream_entry_fee_coins" INTEGER NOT NULL DEFAULT 0
    `);

    // ─── 3. Create creator_video_packages table ─────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "creator_video_packages" (
        "id"               UUID NOT NULL DEFAULT uuid_generate_v4(),
        "created_at"       TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at"       TIMESTAMP NOT NULL DEFAULT now(),
        "deleted_at"       TIMESTAMP,
        "creator_id"       UUID NOT NULL,
        "duration_minutes" INTEGER NOT NULL,
        "price_coins"      INTEGER NOT NULL DEFAULT 0,
        "is_active"        BOOLEAN NOT NULL DEFAULT true,
        "sort_order"       INTEGER NOT NULL DEFAULT 0,
        CONSTRAINT "PK_creator_video_packages" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_creator_video_packages_creator_duration" UNIQUE ("creator_id", "duration_minutes"),
        CONSTRAINT "FK_creator_video_packages_creator_id" FOREIGN KEY ("creator_id") REFERENCES "creators"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_creator_video_packages_creator_id" ON "creator_video_packages" ("creator_id")
    `);

    // ─── 4. Create creator_photos table ──────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "creator_photos" (
        "id"            UUID NOT NULL DEFAULT uuid_generate_v4(),
        "created_at"    TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at"    TIMESTAMP NOT NULL DEFAULT now(),
        "deleted_at"    TIMESTAMP,
        "creator_id"    UUID NOT NULL,
        "image_url"     TEXT NOT NULL,
        "thumbnail_url" TEXT,
        "sort_order"    INTEGER NOT NULL DEFAULT 0,
        "is_free"       BOOLEAN NOT NULL DEFAULT true,
        "price_coins"   INTEGER NOT NULL DEFAULT 0,
        CONSTRAINT "PK_creator_photos" PRIMARY KEY ("id"),
        CONSTRAINT "FK_creator_photos_creator_id" FOREIGN KEY ("creator_id") REFERENCES "creators"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_creator_photos_creator_id" ON "creator_photos" ("creator_id")
    `);

    // ─── 5. Create user_photo_unlocks table ─────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "user_photo_unlocks" (
        "id"          UUID NOT NULL DEFAULT uuid_generate_v4(),
        "created_at"  TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at"  TIMESTAMP NOT NULL DEFAULT now(),
        "deleted_at"  TIMESTAMP,
        "user_id"     UUID NOT NULL,
        "photo_id"    UUID NOT NULL,
        "unlocked_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_user_photo_unlocks" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_user_photo_unlocks_user_photo" UNIQUE ("user_id", "photo_id"),
        CONSTRAINT "FK_user_photo_unlocks_user_id" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_user_photo_unlocks_photo_id" FOREIGN KEY ("photo_id") REFERENCES "creator_photos"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_user_photo_unlocks_user_id" ON "user_photo_unlocks" ("user_id")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_user_photo_unlocks_photo_id" ON "user_photo_unlocks" ("photo_id")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP TABLE IF EXISTS "user_photo_unlocks" CASCADE`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "creator_photos" CASCADE`);
    await queryRunner.query(
      `DROP TABLE IF EXISTS "creator_video_packages" CASCADE`,
    );
    await queryRunner.query(`
      ALTER TABLE "creator_stream_settings"
      DROP COLUMN IF EXISTS "default_stream_entry_fee_coins",
      DROP COLUMN IF EXISTS "chat_price_per_message_coins"
    `);
    await queryRunner.query(`
      ALTER TABLE "creators"
      DROP COLUMN IF EXISTS "featured_order",
      DROP COLUMN IF EXISTS "is_featured"
    `);
  }
}

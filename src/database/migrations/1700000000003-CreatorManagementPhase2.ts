import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreatorManagementPhase2_1700000000003 implements MigrationInterface {
  name = 'CreatorManagementPhase2_1700000000003';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ─── 1. categories ────────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE "categories" (
        "id"          UUID NOT NULL DEFAULT uuid_generate_v4(),
        "created_at"  TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at"  TIMESTAMP NOT NULL DEFAULT now(),
        "deleted_at"  TIMESTAMP,
        "name"        VARCHAR(50) NOT NULL,
        "slug"        VARCHAR(60) NOT NULL,
        "description" TEXT,
        "icon_url"    TEXT,
        "sort_order"  INTEGER NOT NULL DEFAULT 0,
        "is_active"   BOOLEAN NOT NULL DEFAULT true,
        CONSTRAINT "PK_categories" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_categories_name" ON "categories" ("name") WHERE deleted_at IS NULL`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_categories_slug" ON "categories" ("slug") WHERE deleted_at IS NULL`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_categories_is_active" ON "categories" ("is_active")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_categories_sort_order" ON "categories" ("sort_order")`,
    );

    // ─── 2. creators ──────────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TYPE "public"."creator_account_status_enum" AS ENUM (
        'ACTIVE', 'SUSPENDED', 'BANNED', 'DEACTIVATED'
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "creators" (
        "id"                  UUID NOT NULL DEFAULT uuid_generate_v4(),
        "created_at"          TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at"          TIMESTAMP NOT NULL DEFAULT now(),
        "deleted_at"          TIMESTAMP,
        "user_id"             UUID NOT NULL,
        "status"              "public"."creator_account_status_enum" NOT NULL DEFAULT 'ACTIVE',
        "display_name"        VARCHAR(100) NOT NULL,
        "slug"                VARCHAR(120) NOT NULL,
        "bio"                 TEXT,
        "avatar_url"          TEXT,
        "cover_image_url"     TEXT,
        "category_id"         UUID,
        "languages"           TEXT NOT NULL DEFAULT 'en',
        "social_links"        JSONB,
        "is_verified"         BOOLEAN NOT NULL DEFAULT false,
        "stream_key_hash"     VARCHAR(64),
        "stream_key_encrypted" TEXT,
        "phone_number"        VARCHAR(20),
        "phone_verified"      BOOLEAN NOT NULL DEFAULT false,
        "moderation_flags"    JSONB,
        "approved_at"         TIMESTAMP,
        "last_stream_at"      TIMESTAMP,
        "total_streams"       INTEGER NOT NULL DEFAULT 0,
        "total_followers"     INTEGER NOT NULL DEFAULT 0,
        "total_earnings"      NUMERIC(12,2) NOT NULL DEFAULT 0,
        CONSTRAINT "PK_creators" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_creators_user_id" UNIQUE ("user_id"),
        CONSTRAINT "UQ_creators_display_name" UNIQUE ("display_name"),
        CONSTRAINT "UQ_creators_slug" UNIQUE ("slug"),
        CONSTRAINT "FK_creators_user_id" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_creators_category_id" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE SET NULL
      )
    `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_creators_user_id" ON "creators" ("user_id")`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_creators_display_name" ON "creators" ("display_name") WHERE deleted_at IS NULL`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_creators_slug" ON "creators" ("slug") WHERE deleted_at IS NULL`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_creators_status" ON "creators" ("status")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_creators_category_id" ON "creators" ("category_id")`,
    );

    // ─── 3. creator_applications ──────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TYPE "public"."creator_application_status_enum" AS ENUM (
        'DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'MORE_INFO_REQUIRED',
        'APPROVED', 'REJECTED', 'EXPIRED', 'WITHDRAWN'
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "creator_applications" (
        "id"                UUID NOT NULL DEFAULT uuid_generate_v4(),
        "created_at"        TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at"        TIMESTAMP NOT NULL DEFAULT now(),
        "deleted_at"        TIMESTAMP,
        "user_id"           UUID NOT NULL,
        "status"            "public"."creator_application_status_enum" NOT NULL DEFAULT 'DRAFT',
        "terms_accepted_at" TIMESTAMP,
        "submitted_data"    JSONB,
        "requested_info"    JSONB,
        "reviewer_id"       UUID,
        "reviewed_at"       TIMESTAMP,
        "review_comment"    TEXT,
        "decision_snapshot" JSONB,
        "submitted_at"      TIMESTAMP,
        "expires_at"        TIMESTAMP,
        "is_active"         BOOLEAN NOT NULL DEFAULT true,
        CONSTRAINT "PK_creator_applications" PRIMARY KEY ("id"),
        CONSTRAINT "FK_creator_applications_user_id" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_creator_applications_user_id" ON "creator_applications" ("user_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_creator_applications_status" ON "creator_applications" ("status")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_creator_applications_reviewer_id" ON "creator_applications" ("reviewer_id")`,
    );

    // ─── 4. creator_verifications ─────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TYPE "public"."creator_verification_type_enum" AS ENUM (
        'PHONE', 'GOVERNMENT_ID'
      )
    `);
    await queryRunner.query(`
      CREATE TYPE "public"."creator_verification_status_enum" AS ENUM (
        'NONE', 'PENDING', 'VERIFIED', 'REJECTED', 'EXPIRED'
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "creator_verifications" (
        "id"               UUID NOT NULL DEFAULT uuid_generate_v4(),
        "created_at"       TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at"       TIMESTAMP NOT NULL DEFAULT now(),
        "deleted_at"       TIMESTAMP,
        "creator_id"       UUID NOT NULL,
        "type"             "public"."creator_verification_type_enum" NOT NULL,
        "status"           "public"."creator_verification_status_enum" NOT NULL DEFAULT 'NONE',
        "document_id"      UUID,
        "phone_number"     VARCHAR(20),
        "submitted_at"     TIMESTAMP,
        "verified_at"      TIMESTAMP,
        "rejected_at"      TIMESTAMP,
        "rejection_reason" TEXT,
        "expires_at"       TIMESTAMP,
        "reviewed_by"      UUID,
        CONSTRAINT "PK_creator_verifications" PRIMARY KEY ("id"),
        CONSTRAINT "FK_creator_verifications_creator_id" FOREIGN KEY ("creator_id") REFERENCES "creators"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_creator_verifications_creator_id" ON "creator_verifications" ("creator_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_creator_verifications_status" ON "creator_verifications" ("status")`,
    );

    // ─── 5. creator_documents ─────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TYPE "public"."creator_document_type_enum" AS ENUM (
        'GOVERNMENT_ID', 'PORTRAIT', 'PROOF_OF_ADDRESS'
      )
    `);
    await queryRunner.query(`
      CREATE TYPE "public"."creator_document_status_enum" AS ENUM (
        'SUBMITTED', 'VALIDATED', 'REJECTED', 'EXPIRED'
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "creator_documents" (
        "id"               UUID NOT NULL DEFAULT uuid_generate_v4(),
        "created_at"       TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at"       TIMESTAMP NOT NULL DEFAULT now(),
        "deleted_at"       TIMESTAMP,
        "creator_id"       UUID NOT NULL,
        "type"             "public"."creator_document_type_enum" NOT NULL,
        "status"           "public"."creator_document_status_enum" NOT NULL DEFAULT 'SUBMITTED',
        "file_url"         TEXT NOT NULL,
        "file_metadata"    JSONB,
        "validated_by"     UUID,
        "validated_at"     TIMESTAMP,
        "rejection_reason" TEXT,
        "expires_at"       TIMESTAMP,
        CONSTRAINT "PK_creator_documents" PRIMARY KEY ("id"),
        CONSTRAINT "FK_creator_documents_creator_id" FOREIGN KEY ("creator_id") REFERENCES "creators"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_creator_documents_creator_id" ON "creator_documents" ("creator_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_creator_documents_status" ON "creator_documents" ("status")`,
    );

    // ─── 6. creator_stream_settings ───────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE "creator_stream_settings" (
        "id"                    UUID NOT NULL DEFAULT uuid_generate_v4(),
        "created_at"            TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at"            TIMESTAMP NOT NULL DEFAULT now(),
        "deleted_at"            TIMESTAMP,
        "creator_id"            UUID NOT NULL,
        "default_title"         VARCHAR(200),
        "default_category_id"   UUID,
        "default_language"      VARCHAR(10) NOT NULL DEFAULT 'en',
        "is_chat_enabled"       BOOLEAN NOT NULL DEFAULT true,
        "is_gift_enabled"       BOOLEAN NOT NULL DEFAULT true,
        "is_recording_enabled"  BOOLEAN NOT NULL DEFAULT true,
        "is_adult_content"      BOOLEAN NOT NULL DEFAULT false,
        "max_viewer_quality"    VARCHAR(10) NOT NULL DEFAULT '1080p',
        CONSTRAINT "PK_creator_stream_settings" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_creator_stream_settings_creator_id" UNIQUE ("creator_id"),
        CONSTRAINT "FK_creator_stream_settings_creator_id" FOREIGN KEY ("creator_id") REFERENCES "creators"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_creator_stream_settings_creator_id" ON "creator_stream_settings" ("creator_id")`,
    );

    // ─── 7. creator_payout_settings ───────────────────────────────────────────
    await queryRunner.query(`
      CREATE TYPE "public"."creator_payout_method_enum" AS ENUM (
        'BANK_TRANSFER', 'PAYPAL'
      )
    `);
    await queryRunner.query(`
      CREATE TYPE "public"."creator_payout_eligibility_enum" AS ENUM (
        'NOT_ELIGIBLE', 'ELIGIBLE', 'REQUIRES_VERIFICATION'
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "creator_payout_settings" (
        "id"                  UUID NOT NULL DEFAULT uuid_generate_v4(),
        "created_at"          TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at"          TIMESTAMP NOT NULL DEFAULT now(),
        "deleted_at"          TIMESTAMP,
        "creator_id"          UUID NOT NULL,
        "method"              "public"."creator_payout_method_enum",
        "paypal_email"        VARCHAR(500),
        "bank_country"        VARCHAR(2),
        "bank_account_last4"  VARCHAR(4),
        "payout_eligibility"  "public"."creator_payout_eligibility_enum" NOT NULL DEFAULT 'NOT_ELIGIBLE',
        "updated_by_admin"    BOOLEAN NOT NULL DEFAULT false,
        CONSTRAINT "PK_creator_payout_settings" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_creator_payout_settings_creator_id" UNIQUE ("creator_id"),
        CONSTRAINT "FK_creator_payout_settings_creator_id" FOREIGN KEY ("creator_id") REFERENCES "creators"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_creator_payout_settings_creator_id" ON "creator_payout_settings" ("creator_id")`,
    );

    // ─── 8. creator_notes ────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE "creator_notes" (
        "id"          UUID NOT NULL DEFAULT uuid_generate_v4(),
        "created_at"  TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at"  TIMESTAMP NOT NULL DEFAULT now(),
        "deleted_at"  TIMESTAMP,
        "creator_id"  UUID NOT NULL,
        "author_id"   UUID,
        "body"        TEXT NOT NULL,
        "is_internal" BOOLEAN NOT NULL DEFAULT true,
        CONSTRAINT "PK_creator_notes" PRIMARY KEY ("id"),
        CONSTRAINT "FK_creator_notes_creator_id" FOREIGN KEY ("creator_id") REFERENCES "creators"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_creator_notes_creator_id" ON "creator_notes" ("creator_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_creator_notes_author_id" ON "creator_notes" ("author_id")`,
    );

    // ─── 9. Permissions ───────────────────────────────────────────────────────
    // New permission keys are seeded by PermissionSeeder on startup (idempotent)
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "creator_notes" CASCADE`);
    await queryRunner.query(
      `DROP TABLE IF EXISTS "creator_payout_settings" CASCADE`,
    );
    await queryRunner.query(
      `DROP TABLE IF EXISTS "creator_stream_settings" CASCADE`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "creator_documents" CASCADE`);
    await queryRunner.query(
      `DROP TABLE IF EXISTS "creator_verifications" CASCADE`,
    );
    await queryRunner.query(
      `DROP TABLE IF EXISTS "creator_applications" CASCADE`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "creators" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "categories" CASCADE`);

    await queryRunner.query(
      `DROP TYPE IF EXISTS "public"."creator_payout_eligibility_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE IF EXISTS "public"."creator_payout_method_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE IF EXISTS "public"."creator_document_status_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE IF EXISTS "public"."creator_document_type_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE IF EXISTS "public"."creator_verification_status_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE IF EXISTS "public"."creator_verification_type_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE IF EXISTS "public"."creator_application_status_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE IF EXISTS "public"."creator_account_status_enum"`,
    );
  }
}

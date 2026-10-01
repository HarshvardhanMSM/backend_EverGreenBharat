import { MigrationInterface, QueryRunner } from 'typeorm';

export class UserProfilePhase21700000000007 implements MigrationInterface {
  name = 'UserProfilePhase21700000000007';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "onboarding_status" VARCHAR(30) NOT NULL DEFAULT 'ACCOUNT_CREATED'`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "preferred_content_languages" JSONB NOT NULL DEFAULT '[]'::jsonb`,
    );

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "user_interests" (
        "id"          uuid NOT NULL DEFAULT gen_random_uuid(),
        "created_at"  TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at"  TIMESTAMP NOT NULL DEFAULT now(),
        "deleted_at"  TIMESTAMP,
        "user_id"     uuid NOT NULL,
        "category_id" uuid NOT NULL,
        "weight"      INTEGER NOT NULL DEFAULT 1,
        CONSTRAINT "PK_user_interests" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_user_interests_user_category" UNIQUE ("user_id", "category_id"),
        CONSTRAINT "FK_user_interests_user" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE,
        CONSTRAINT "FK_user_interests_category" FOREIGN KEY ("category_id") REFERENCES "categories" ("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_user_interests_user_id" ON "user_interests" ("user_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_user_interests_category_id" ON "user_interests" ("category_id")`,
    );

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "moderation_events" (
        "id"          uuid NOT NULL DEFAULT gen_random_uuid(),
        "created_at"  TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at"  TIMESTAMP NOT NULL DEFAULT now(),
        "deleted_at"  TIMESTAMP,
        "admin_id"    uuid,
        "user_id"     uuid NOT NULL,
        "action"      VARCHAR(40) NOT NULL,
        "reason"      TEXT,
        CONSTRAINT "PK_moderation_events" PRIMARY KEY ("id"),
        CONSTRAINT "FK_moderation_events_admin" FOREIGN KEY ("admin_id") REFERENCES "admins" ("id") ON DELETE SET NULL,
        CONSTRAINT "FK_moderation_events_user" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_moderation_events_user_id" ON "moderation_events" ("user_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_moderation_events_admin_id" ON "moderation_events" ("admin_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_moderation_events_action" ON "moderation_events" ("action")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "moderation_events" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "user_interests" CASCADE`);
    await queryRunner.query(
      `ALTER TABLE "users" DROP COLUMN IF EXISTS "preferred_content_languages"`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" DROP COLUMN IF EXISTS "onboarding_status"`,
    );
  }
}

import { MigrationInterface, QueryRunner } from 'typeorm';

export class UserAuthOtpPhase11700000000006 implements MigrationInterface {
  name = 'UserAuthOtpPhase11700000000006';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "phone" VARCHAR(20)`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "IDX_users_phone" ON "users" ("phone") WHERE "phone" IS NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "is_phone_verified" BOOLEAN NOT NULL DEFAULT false`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "google_id" VARCHAR(128)`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "IDX_users_google_id" ON "users" ("google_id") WHERE "google_id" IS NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "auth_provider" VARCHAR(20) NOT NULL DEFAULT 'LOCAL'`,
    );

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "otp_codes" (
        "id"            uuid NOT NULL DEFAULT gen_random_uuid(),
        "created_at"    TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at"    TIMESTAMP NOT NULL DEFAULT now(),
        "deleted_at"    TIMESTAMP,
        "purpose"       VARCHAR(30) NOT NULL,
        "channel"       VARCHAR(10) NOT NULL,
        "destination"   VARCHAR(255) NOT NULL,
        "user_id"       uuid,
        "code_hash"     VARCHAR(64) NOT NULL,
        "expires_at"    TIMESTAMP NOT NULL,
        "attempts"      INTEGER NOT NULL DEFAULT 0,
        "max_attempts"  INTEGER NOT NULL DEFAULT 5,
        "is_used"       BOOLEAN NOT NULL DEFAULT false,
        "used_at"       TIMESTAMP,
        CONSTRAINT "PK_otp_codes" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_otp_codes_purpose_channel_destination" ON "otp_codes" ("purpose", "channel", "destination")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_otp_codes_user_id" ON "otp_codes" ("user_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_otp_codes_created_at" ON "otp_codes" ("created_at")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "otp_codes" CASCADE`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_users_google_id"`);
    await queryRunner.query(
      `ALTER TABLE "users" DROP COLUMN IF EXISTS "auth_provider"`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" DROP COLUMN IF EXISTS "google_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" DROP COLUMN IF EXISTS "is_phone_verified"`,
    );
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_users_phone"`);
    await queryRunner.query(
      `ALTER TABLE "users" DROP COLUMN IF EXISTS "phone"`,
    );
  }
}

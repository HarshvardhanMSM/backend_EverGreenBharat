import { MigrationInterface, QueryRunner } from 'typeorm';

export class AdminFoundationPhase1170000000002 implements MigrationInterface {
  name = 'AdminFoundationPhase1170000000002';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Create admins status enum if not exists
    await queryRunner.query(
      `DO $$ BEGIN
        CREATE TYPE "admins_status_enum" AS ENUM('ACTIVE', 'SUSPENDED', 'INACTIVE');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;`,
    );

    // 2. Add columns to admins table
    await queryRunner.query(
      `ALTER TABLE "admins" ADD COLUMN IF NOT EXISTS "notes" text`,
    );
    await queryRunner.query(
      `ALTER TABLE "admins" ADD COLUMN IF NOT EXISTS "status" "admins_status_enum" NOT NULL DEFAULT 'ACTIVE'`,
    );
    await queryRunner.query(
      `ALTER TABLE "admins" ADD COLUMN IF NOT EXISTS "created_by_id" uuid`,
    );
    await queryRunner.query(
      `ALTER TABLE "admins" ADD COLUMN IF NOT EXISTS "updated_by_id" uuid`,
    );
    await queryRunner.query(
      `ALTER TABLE "admins" ADD COLUMN IF NOT EXISTS "last_login_ip" character varying(45)`,
    );

    // 3. Add columns to audit_logs table
    await queryRunner.query(
      `ALTER TABLE "audit_logs" ADD COLUMN IF NOT EXISTS "correlation_id" character varying(100)`,
    );
    await queryRunner.query(
      `ALTER TABLE "audit_logs" ADD COLUMN IF NOT EXISTS "request_id" character varying(100)`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_audit_correlationId" ON "audit_logs" ("correlation_id")`,
    );

    // 4. Create login_history status enum
    await queryRunner.query(
      `DO $$ BEGIN
        CREATE TYPE "login_history_status_enum" AS ENUM('SUCCESS', 'FAILED');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;`,
    );

    // 5. Create login_history table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "login_history" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMP,
        "user_id" uuid,
        "admin_id" uuid,
        "email" character varying(150) NOT NULL,
        "status" "login_history_status_enum" NOT NULL,
        "failure_reason" character varying(255),
        "ip_address" character varying(45) NOT NULL,
        "user_agent" text,
        "browser" character varying(100),
        "device" character varying(100),
        "os" character varying(100),
        CONSTRAINT "PK_login_history" PRIMARY KEY ("id")
      );
    `);

    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_login_history_admin_id" ON "login_history" ("admin_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_login_history_user_id" ON "login_history" ("user_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_login_history_email" ON "login_history" ("email")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_login_history_status" ON "login_history" ("status")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_login_history_created_at" ON "login_history" ("created_at")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "login_history"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "login_history_status_enum"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_audit_correlationId"`);
    await queryRunner.query(
      `ALTER TABLE "audit_logs" DROP COLUMN IF EXISTS "request_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "audit_logs" DROP COLUMN IF EXISTS "correlation_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "admins" DROP COLUMN IF EXISTS "last_login_ip"`,
    );
    await queryRunner.query(
      `ALTER TABLE "admins" DROP COLUMN IF EXISTS "updated_by_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "admins" DROP COLUMN IF EXISTS "created_by_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "admins" DROP COLUMN IF EXISTS "status"`,
    );
    await queryRunner.query(
      `ALTER TABLE "admins" DROP COLUMN IF EXISTS "notes"`,
    );
    await queryRunner.query(`DROP TYPE IF EXISTS "admins_status_enum"`);
  }
}

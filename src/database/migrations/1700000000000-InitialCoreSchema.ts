import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialCoreSchema1700000000000 implements MigrationInterface {
  name = 'InitialCoreSchema1700000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create Enum Types
    await queryRunner.query(
      `CREATE TYPE "users_status_enum" AS ENUM('PENDING_VERIFICATION', 'ACTIVE', 'SUSPENDED', 'BANNED')`,
    );

    // 1. Create users table
    await queryRunner.query(`
      CREATE TABLE "users" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMP,
        "email" character varying(150) NOT NULL,
        "username" character varying(50) NOT NULL,
        "password" character varying(255) NOT NULL,
        "status" "users_status_enum" NOT NULL DEFAULT 'PENDING_VERIFICATION',
        "avatar_url" text,
        "is_email_verified" boolean NOT NULL DEFAULT false,
        "failed_login_attempts" integer NOT NULL DEFAULT 0,
        "lockout_until" TIMESTAMP,
        "last_login_at" TIMESTAMP,
        CONSTRAINT "UQ_users_email" UNIQUE ("email"),
        CONSTRAINT "UQ_users_username" UNIQUE ("username"),
        CONSTRAINT "PK_users" PRIMARY KEY ("id")
      );
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_users_email" ON "users" ("email")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_users_username" ON "users" ("username")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_users_status" ON "users" ("status")`,
    );

    // 2. Create admins table
    await queryRunner.query(`
      CREATE TABLE "admins" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMP,
        "user_id" uuid NOT NULL,
        "is_super_admin" boolean NOT NULL DEFAULT false,
        "department" character varying(100),
        "last_login_at" TIMESTAMP,
        CONSTRAINT "UQ_admins_user_id" UNIQUE ("user_id"),
        CONSTRAINT "PK_admins" PRIMARY KEY ("id"),
        CONSTRAINT "FK_admins_users" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
      );
    `);

    // 3. Create roles table
    await queryRunner.query(`
      CREATE TABLE "roles" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMP,
        "code" character varying(50) NOT NULL,
        "name" character varying(100) NOT NULL,
        "description" text,
        "is_system" boolean NOT NULL DEFAULT false,
        CONSTRAINT "UQ_roles_code" UNIQUE ("code"),
        CONSTRAINT "PK_roles" PRIMARY KEY ("id")
      );
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_roles_code" ON "roles" ("code")`,
    );

    // 4. Create permissions table
    await queryRunner.query(`
      CREATE TABLE "permissions" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMP,
        "key" character varying(100) NOT NULL,
        "module" character varying(50) NOT NULL,
        "description" text,
        CONSTRAINT "UQ_permissions_key" UNIQUE ("key"),
        CONSTRAINT "PK_permissions" PRIMARY KEY ("id")
      );
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_permissions_key" ON "permissions" ("key")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_permissions_module" ON "permissions" ("module")`,
    );

    // 5. Create role_permissions junction table
    await queryRunner.query(`
      CREATE TABLE "role_permissions" (
        "role_id" uuid NOT NULL,
        "permission_id" uuid NOT NULL,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_role_permissions" PRIMARY KEY ("role_id", "permission_id"),
        CONSTRAINT "FK_role_permissions_role" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_role_permissions_permission" FOREIGN KEY ("permission_id") REFERENCES "permissions"("id") ON DELETE CASCADE
      );
    `);

    // 6. Create admin_roles junction table
    await queryRunner.query(`
      CREATE TABLE "admin_roles" (
        "admin_id" uuid NOT NULL,
        "role_id" uuid NOT NULL,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_admin_roles" PRIMARY KEY ("admin_id", "role_id"),
        CONSTRAINT "FK_admin_roles_admin" FOREIGN KEY ("admin_id") REFERENCES "admins"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_admin_roles_role" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE CASCADE
      );
    `);

    // 7. Create refresh_tokens table
    await queryRunner.query(`
      CREATE TABLE "refresh_tokens" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMP,
        "user_id" uuid NOT NULL,
        "family_id" uuid NOT NULL,
        "token_hash" character varying(255) NOT NULL,
        "device_info" text,
        "ip_address" character varying(45),
        "is_revoked" boolean NOT NULL DEFAULT false,
        "expires_at" TIMESTAMP NOT NULL,
        CONSTRAINT "UQ_refresh_tokens_token_hash" UNIQUE ("token_hash"),
        CONSTRAINT "PK_refresh_tokens" PRIMARY KEY ("id"),
        CONSTRAINT "FK_refresh_tokens_users" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
      );
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_refresh_tokens_familyId" ON "refresh_tokens" ("family_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_refresh_tokens_hash" ON "refresh_tokens" ("token_hash")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_refresh_tokens_revoked" ON "refresh_tokens" ("is_revoked")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_refresh_tokens_expiresAt" ON "refresh_tokens" ("expires_at")`,
    );

    // 8. Create audit_logs table
    await queryRunner.query(`
      CREATE TABLE "audit_logs" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMP,
        "admin_id" uuid,
        "action" character varying(100) NOT NULL,
        "resource" character varying(100) NOT NULL,
        "resource_id" character varying(100),
        "http_method" character varying(10) NOT NULL,
        "before_value" jsonb,
        "after_value" jsonb,
        "ip_address" character varying(45) NOT NULL,
        "user_agent" text,
        CONSTRAINT "PK_audit_logs" PRIMARY KEY ("id")
      );
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_audit_adminId" ON "audit_logs" ("admin_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_audit_action" ON "audit_logs" ("action")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_audit_resource" ON "audit_logs" ("resource")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "audit_logs"`);
    await queryRunner.query(`DROP TABLE "refresh_tokens"`);
    await queryRunner.query(`DROP TABLE "admin_roles"`);
    await queryRunner.query(`DROP TABLE "role_permissions"`);
    await queryRunner.query(`DROP TABLE "permissions"`);
    await queryRunner.query(`DROP TABLE "roles"`);
    await queryRunner.query(`DROP TABLE "admins"`);
    await queryRunner.query(`DROP TABLE "users"`);
    await queryRunner.query(`DROP TYPE "users_status_enum"`);
  }
}

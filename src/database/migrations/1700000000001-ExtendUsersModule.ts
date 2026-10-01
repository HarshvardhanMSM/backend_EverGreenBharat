import { MigrationInterface, QueryRunner } from 'typeorm';

export class ExtendUsersModule1700000000001 implements MigrationInterface {
  name = 'ExtendUsersModule1700000000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Create Enums
    await queryRunner.query(
      `CREATE TYPE "public"."users_verificationstatus_enum" AS ENUM('NONE', 'PENDING', 'VERIFIED', 'REJECTED')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."users_gender_enum" AS ENUM('MALE', 'FEMALE', 'OTHER', 'PREFER_NOT_TO_SAY')`,
    );

    // 2. Add Columns to users table
    await queryRunner.query(
      `ALTER TABLE "users" ADD "displayName" character varying(100)`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ADD "firstName" character varying(50)`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ADD "lastName" character varying(50)`,
    );
    await queryRunner.query(`ALTER TABLE "users" ADD "coverImageUrl" text`);
    await queryRunner.query(`ALTER TABLE "users" ADD "bio" text`);
    await queryRunner.query(
      `ALTER TABLE "users" ADD "gender" "public"."users_gender_enum"`,
    );
    await queryRunner.query(`ALTER TABLE "users" ADD "dateOfBirth" date`);
    await queryRunner.query(
      `ALTER TABLE "users" ADD "country" character varying(2)`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ADD "language" character varying(10) NOT NULL DEFAULT 'en'`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ADD "timezone" character varying(50) NOT NULL DEFAULT 'UTC'`,
    );
    await queryRunner.query(`ALTER TABLE "users" ADD "socialLinks" jsonb`);
    await queryRunner.query(
      `ALTER TABLE "users" ADD "isPrivateProfile" boolean NOT NULL DEFAULT false`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ADD "verificationStatus" "public"."users_verificationstatus_enum" NOT NULL DEFAULT 'NONE'`,
    );
    await queryRunner.query(`ALTER TABLE "users" ADD "lastSeenAt" TIMESTAMP`);
    await queryRunner.query(
      `ALTER TABLE "users" ADD "lastUsernameChangedAt" TIMESTAMP`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ADD "deactivatedAt" TIMESTAMP`,
    );

    // 3. Create Indexes
    await queryRunner.query(
      `CREATE INDEX "IDX_users_country" ON "users" ("country")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_users_verification_status" ON "users" ("verificationStatus")`,
    );

    // 4. Create user_blocks table
    await queryRunner.query(`
      CREATE TABLE "user_blocks" (
        "blockerId" uuid NOT NULL,
        "blockedId" uuid NOT NULL,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_user_blocks" PRIMARY KEY ("blockerId", "blockedId"),
        CONSTRAINT "FK_user_blocks_blocker" FOREIGN KEY ("blockerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION,
        CONSTRAINT "FK_user_blocks_blocked" FOREIGN KEY ("blockedId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION
      )
    `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_user_blocks_blocker_blocked" ON "user_blocks" ("blockerId", "blockedId")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "user_blocks"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_users_verification_status"`,
    );
    await queryRunner.query(`DROP INDEX "public"."IDX_users_country"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "deactivatedAt"`);
    await queryRunner.query(
      `ALTER TABLE "users" DROP COLUMN "lastUsernameChangedAt"`,
    );
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "lastSeenAt"`);
    await queryRunner.query(
      `ALTER TABLE "users" DROP COLUMN "verificationStatus"`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" DROP COLUMN "isPrivateProfile"`,
    );
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "socialLinks"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "timezone"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "language"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "country"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "dateOfBirth"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "gender"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "bio"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "coverImageUrl"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "lastName"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "firstName"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "displayName"`);
    await queryRunner.query(`DROP TYPE "public"."users_gender_enum"`);
    await queryRunner.query(
      `DROP TYPE "public"."users_verificationstatus_enum"`,
    );
  }
}

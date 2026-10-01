import { MigrationInterface, QueryRunner } from 'typeorm';

export class FixFoundationPhase3B1700000000005 implements MigrationInterface {
  name = 'FixFoundationPhase3B1700000000005';

  private readonly legacyDefaultTables = [
    'categories',
    'creators',
    'creator_applications',
    'creator_verifications',
    'creator_documents',
    'creator_stream_settings',
    'creator_payout_settings',
    'creator_notes',
    'wallets',
    'wallet_transactions',
    'wallet_ledgers',
    'coin_packages',
    'coin_purchases',
    'currency_exchange_rates',
    'promo_codes',
    'wallet_freezes',
    'wallet_adjustments',
    'daily_financial_reports',
  ];

  public async up(queryRunner: QueryRunner): Promise<void> {
    // pgcrypto only needed while historical migrations still use uuid_generate_v4()
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "pgcrypto"`);

    // Normalize all primary key defaults to gen_random_uuid() (built-in since PG 13)
    for (const table of this.legacyDefaultTables) {
      await queryRunner.query(
        `ALTER TABLE "${table}" ALTER COLUMN "id" SET DEFAULT gen_random_uuid()`,
      );
    }

    // user_blocks: entity exists, table was never created by any migration
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "user_blocks" (
        "blocker_id" uuid NOT NULL,
        "blocked_id" uuid NOT NULL,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_user_blocks" PRIMARY KEY ("blocker_id", "blocked_id"),
        CONSTRAINT "FK_user_blocks_blocker_id" FOREIGN KEY ("blocker_id") REFERENCES "users"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_user_blocks_blocked_id" FOREIGN KEY ("blocked_id") REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "IDX_user_blocks_blocker_blocked" ON "user_blocks" ("blocker_id", "blocked_id")`,
    );

    // promo_redemptions: entity exists, table was never created by any migration
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "promo_redemptions" (
        "id"                  uuid NOT NULL DEFAULT gen_random_uuid(),
        "created_at"          TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at"          TIMESTAMP NOT NULL DEFAULT now(),
        "deleted_at"          TIMESTAMP,
        "user_id"             uuid NOT NULL,
        "promo_code_id"       uuid NOT NULL,
        "transaction_id"      uuid,
        "bonus_coins_granted" NUMERIC(14,4) NOT NULL,
        "redeemed_at"         TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_promo_redemptions" PRIMARY KEY ("id"),
        CONSTRAINT "FK_promo_redemptions_user_id" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_promo_redemptions_promo_code_id" FOREIGN KEY ("promo_code_id") REFERENCES "promo_codes"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_promo_redemptions_transaction_id" FOREIGN KEY ("transaction_id") REFERENCES "wallet_transactions"("id") ON DELETE SET NULL
      )
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_promo_redemptions_user_id" ON "promo_redemptions" ("user_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_promo_redemptions_code_id" ON "promo_redemptions" ("promo_code_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_promo_redemptions_transaction_id" ON "promo_redemptions" ("transaction_id")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "promo_redemptions" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "user_blocks" CASCADE`);

    for (const table of this.legacyDefaultTables) {
      await queryRunner.query(
        `ALTER TABLE "${table}" ALTER COLUMN "id" SET DEFAULT uuid_generate_v4()`,
      );
    }
  }
}

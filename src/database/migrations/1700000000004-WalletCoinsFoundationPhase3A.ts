import { MigrationInterface, QueryRunner } from 'typeorm';

export class WalletCoinsFoundationPhase3A1700000000004 implements MigrationInterface {
  name = 'WalletCoinsFoundationPhase3A1700000000004';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ─── 1. ENUMS ─────────────────────────────────────────────────────────────
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "public"."wallet_status_enum" AS ENUM ('ACTIVE', 'FROZEN', 'PARTIALLY_FROZEN', 'CLOSED');
      EXCEPTION WHEN duplicate_object THEN null; END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "public"."transaction_type_enum" AS ENUM (
          'COIN_PURCHASE', 'GIFT_SEND', 'CREATOR_EARNING', 'WITHDRAWAL',
          'ADMIN_ADJUSTMENT', 'REFUND', 'CHARGEBACK', 'PROMO_BONUS',
          'REFERRAL_REWARD', 'SUBSCRIPTION_PAYMENT', 'PENALTY'
        );
      EXCEPTION WHEN duplicate_object THEN null; END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "public"."transaction_status_enum" AS ENUM (
          'PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED', 'REFUNDED'
        );
      EXCEPTION WHEN duplicate_object THEN null; END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "public"."ledger_entry_type_enum" AS ENUM ('CREDIT', 'DEBIT');
      EXCEPTION WHEN duplicate_object THEN null; END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "public"."ledger_balance_type_enum" AS ENUM ('AVAILABLE', 'PENDING', 'FROZEN');
      EXCEPTION WHEN duplicate_object THEN null; END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "public"."adjustment_type_enum" AS ENUM ('CREDIT', 'DEBIT');
      EXCEPTION WHEN duplicate_object THEN null; END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "public"."freeze_type_enum" AS ENUM ('FULL', 'PARTIAL');
      EXCEPTION WHEN duplicate_object THEN null; END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "public"."freeze_reason_enum" AS ENUM (
          'FRAUD_SUSPICION', 'CHARGEBACK_RISK', 'ADMIN_DISPUTE',
          'SECURITY_HOLD', 'COMPLIANCE_REVIEW', 'OTHER'
        );
      EXCEPTION WHEN duplicate_object THEN null; END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "public"."payment_provider_enum" AS ENUM (
          'STRIPE', 'PAYPAL', 'RAZORPAY', 'APPLE_PAY', 'GOOGLE_PAY', 'SYSTEM_INTERNAL'
        );
      EXCEPTION WHEN duplicate_object THEN null; END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "public"."payment_status_enum" AS ENUM (
          'PENDING', 'SETTLED', 'FAILED', 'REFUNDED', 'CANCELLED'
        );
      EXCEPTION WHEN duplicate_object THEN null; END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "public"."discount_type_enum" AS ENUM (
          'PERCENTAGE', 'FIXED_COINS', 'COIN_MULTIPLIER'
        );
      EXCEPTION WHEN duplicate_object THEN null; END $$;
    `);

    // ─── 2. TABLES ────────────────────────────────────────────────────────────

    // wallets
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "wallets" (
        "id"                UUID NOT NULL DEFAULT uuid_generate_v4(),
        "created_at"        TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at"        TIMESTAMP NOT NULL DEFAULT now(),
        "deleted_at"        TIMESTAMP,
        "user_id"           UUID NOT NULL,
        "creator_id"        UUID,
        "available_balance" NUMERIC(14,4) NOT NULL DEFAULT 0.0000,
        "pending_balance"   NUMERIC(14,4) NOT NULL DEFAULT 0.0000,
        "frozen_balance"    NUMERIC(14,4) NOT NULL DEFAULT 0.0000,
        "lifetime_earned"   NUMERIC(14,4) NOT NULL DEFAULT 0.0000,
        "lifetime_spent"    NUMERIC(14,4) NOT NULL DEFAULT 0.0000,
        "currency"          VARCHAR(10) NOT NULL DEFAULT 'COIN',
        "status"            "public"."wallet_status_enum" NOT NULL DEFAULT 'ACTIVE',
        CONSTRAINT "PK_wallets" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_wallets_user_id" UNIQUE ("user_id"),
        CONSTRAINT "CHK_wallets_available_balance" CHECK ("available_balance" >= 0),
        CONSTRAINT "CHK_wallets_pending_balance" CHECK ("pending_balance" >= 0),
        CONSTRAINT "CHK_wallets_frozen_balance" CHECK ("frozen_balance" >= 0),
        CONSTRAINT "FK_wallets_user_id" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_wallets_creator_id" FOREIGN KEY ("creator_id") REFERENCES "creators"("id") ON DELETE SET NULL
      )
    `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "IDX_wallets_user_id" ON "wallets" ("user_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_wallets_creator_id" ON "wallets" ("creator_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_wallets_status" ON "wallets" ("status")`,
    );

    // wallet_transactions
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "wallet_transactions" (
        "id"                  UUID NOT NULL DEFAULT uuid_generate_v4(),
        "created_at"          TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at"          TIMESTAMP NOT NULL DEFAULT now(),
        "deleted_at"          TIMESTAMP,
        "reference_number"    VARCHAR(64) NOT NULL,
        "idempotency_key"     VARCHAR(128) NOT NULL,
        "sender_wallet_id"   UUID,
        "receiver_wallet_id" UUID,
        "type"                "public"."transaction_type_enum" NOT NULL,
        "status"              "public"."transaction_status_enum" NOT NULL DEFAULT 'PENDING',
        "amount"              NUMERIC(14,4) NOT NULL,
        "fee_amount"          NUMERIC(14,4) NOT NULL DEFAULT 0.0000,
        "net_amount"          NUMERIC(14,4) NOT NULL,
        "currency"            VARCHAR(10) NOT NULL DEFAULT 'COIN',
        "metadata"            JSONB,
        "description"         TEXT,
        "failure_reason"      TEXT,
        "completed_at"        TIMESTAMP,
        CONSTRAINT "PK_wallet_transactions" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_wallet_transactions_reference" UNIQUE ("reference_number"),
        CONSTRAINT "UQ_wallet_transactions_idempotency" UNIQUE ("idempotency_key"),
        CONSTRAINT "CHK_wallet_transactions_amount" CHECK ("amount" > 0),
        CONSTRAINT "FK_wallet_tx_sender_wallet" FOREIGN KEY ("sender_wallet_id") REFERENCES "wallets"("id") ON DELETE SET NULL,
        CONSTRAINT "FK_wallet_tx_receiver_wallet" FOREIGN KEY ("receiver_wallet_id") REFERENCES "wallets"("id") ON DELETE SET NULL
      )
    `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "IDX_wallet_tx_reference_number" ON "wallet_transactions" ("reference_number")`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "IDX_wallet_tx_idempotency_key" ON "wallet_transactions" ("idempotency_key")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_wallet_tx_sender_wallet_id" ON "wallet_transactions" ("sender_wallet_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_wallet_tx_receiver_wallet_id" ON "wallet_transactions" ("receiver_wallet_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_wallet_tx_type" ON "wallet_transactions" ("type")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_wallet_tx_status" ON "wallet_transactions" ("status")`,
    );

    // wallet_ledgers
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "wallet_ledgers" (
        "id"              UUID NOT NULL DEFAULT uuid_generate_v4(),
        "created_at"      TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at"      TIMESTAMP NOT NULL DEFAULT now(),
        "deleted_at"      TIMESTAMP,
        "wallet_id"       UUID NOT NULL,
        "transaction_id"  UUID,
        "entry_type"      "public"."ledger_entry_type_enum" NOT NULL,
        "amount"          NUMERIC(14,4) NOT NULL,
        "balance_before"  NUMERIC(14,4) NOT NULL,
        "balance_after"   NUMERIC(14,4) NOT NULL,
        "balance_type"    "public"."ledger_balance_type_enum" NOT NULL DEFAULT 'AVAILABLE',
        "description"     TEXT,
        "posted_at"       TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_wallet_ledgers" PRIMARY KEY ("id"),
        CONSTRAINT "FK_wallet_ledgers_wallet_id" FOREIGN KEY ("wallet_id") REFERENCES "wallets"("id") ON DELETE RESTRICT
      )
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_wallet_ledgers_wallet_id" ON "wallet_ledgers" ("wallet_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_wallet_ledgers_transaction_id" ON "wallet_ledgers" ("transaction_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_wallet_ledgers_entry_type" ON "wallet_ledgers" ("entry_type")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_wallet_ledgers_posted_at" ON "wallet_ledgers" ("posted_at")`,
    );

    // coin_packages
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "coin_packages" (
        "id"                UUID NOT NULL DEFAULT uuid_generate_v4(),
        "created_at"        TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at"        TIMESTAMP NOT NULL DEFAULT now(),
        "deleted_at"        TIMESTAMP,
        "name"              VARCHAR(100) NOT NULL,
        "coin_amount"       NUMERIC(14,4) NOT NULL,
        "bonus_coins"       NUMERIC(14,4) NOT NULL DEFAULT 0.0000,
        "price_usd"         NUMERIC(10,2) NOT NULL,
        "badge_text"        VARCHAR(50),
        "is_popular"        BOOLEAN NOT NULL DEFAULT false,
        "is_active"         BOOLEAN NOT NULL DEFAULT true,
        "sort_order"        INTEGER NOT NULL DEFAULT 0,
        "regional_pricing"  JSONB,
        CONSTRAINT "PK_coin_packages" PRIMARY KEY ("id"),
        CONSTRAINT "CHK_coin_packages_coin_amount" CHECK ("coin_amount" > 0),
        CONSTRAINT "CHK_coin_packages_price_usd" CHECK ("price_usd" > 0)
      )
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_coin_packages_is_active" ON "coin_packages" ("is_active")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_coin_packages_sort_order" ON "coin_packages" ("sort_order")`,
    );

    // coin_purchases
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "coin_purchases" (
        "id"                      UUID NOT NULL DEFAULT uuid_generate_v4(),
        "created_at"              TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at"              TIMESTAMP NOT NULL DEFAULT now(),
        "deleted_at"              TIMESTAMP,
        "transaction_id"          UUID NOT NULL,
        "user_id"                 UUID NOT NULL,
        "package_id"              UUID,
        "fiat_amount"             NUMERIC(10,2) NOT NULL,
        "fiat_currency"           VARCHAR(3) NOT NULL DEFAULT 'USD',
        "payment_provider"        "public"."payment_provider_enum" NOT NULL,
        "provider_transaction_id" VARCHAR(128),
        "payment_status"          "public"."payment_status_enum" NOT NULL DEFAULT 'PENDING',
        "metadata"                JSONB,
        CONSTRAINT "PK_coin_purchases" PRIMARY KEY ("id"),
        CONSTRAINT "FK_coin_purchases_transaction_id" FOREIGN KEY ("transaction_id") REFERENCES "wallet_transactions"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_coin_purchases_user_id" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_coin_purchases_package_id" FOREIGN KEY ("package_id") REFERENCES "coin_packages"("id") ON DELETE SET NULL
      )
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_coin_purchases_transaction_id" ON "coin_purchases" ("transaction_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_coin_purchases_user_id" ON "coin_purchases" ("user_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_coin_purchases_package_id" ON "coin_purchases" ("package_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_coin_purchases_provider_tx_id" ON "coin_purchases" ("provider_transaction_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_coin_purchases_payment_status" ON "coin_purchases" ("payment_status")`,
    );

    // currency_exchange_rates
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "currency_exchange_rates" (
        "id"            UUID NOT NULL DEFAULT uuid_generate_v4(),
        "created_at"    TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at"    TIMESTAMP NOT NULL DEFAULT now(),
        "deleted_at"    TIMESTAMP,
        "from_currency" VARCHAR(3) NOT NULL,
        "to_currency"   VARCHAR(3) NOT NULL,
        "rate"          NUMERIC(12,6) NOT NULL,
        CONSTRAINT "PK_currency_exchange_rates" PRIMARY KEY ("id"),
        CONSTRAINT "CHK_currency_exchange_rates_rate" CHECK ("rate" > 0)
      )
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_fx_from_currency" ON "currency_exchange_rates" ("from_currency")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_fx_to_currency" ON "currency_exchange_rates" ("to_currency")`,
    );

    // promo_codes
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "promo_codes" (
        "id"                  UUID NOT NULL DEFAULT uuid_generate_v4(),
        "created_at"          TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at"          TIMESTAMP NOT NULL DEFAULT now(),
        "deleted_at"          TIMESTAMP,
        "code"                VARCHAR(30) NOT NULL,
        "discount_type"       "public"."discount_type_enum" NOT NULL,
        "discount_value"      NUMERIC(10,2) NOT NULL,
        "max_redemptions"     INTEGER,
        "current_redemptions" INTEGER NOT NULL DEFAULT 0,
        "expires_at"          TIMESTAMP,
        "is_active"           BOOLEAN NOT NULL DEFAULT true,
        CONSTRAINT "PK_promo_codes" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_promo_codes_code" UNIQUE ("code")
      )
    `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "IDX_promo_codes_code" ON "promo_codes" ("code")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_promo_codes_is_active" ON "promo_codes" ("is_active")`,
    );

    // wallet_freezes
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "wallet_freezes" (
        "id"             UUID NOT NULL DEFAULT uuid_generate_v4(),
        "created_at"     TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at"     TIMESTAMP NOT NULL DEFAULT now(),
        "deleted_at"     TIMESTAMP,
        "wallet_id"      UUID NOT NULL,
        "admin_id"       UUID NOT NULL,
        "freeze_type"    "public"."freeze_type_enum" NOT NULL,
        "frozen_amount"  NUMERIC(14,4) NOT NULL DEFAULT 0.0000,
        "reason"         "public"."freeze_reason_enum" NOT NULL,
        "notes"          TEXT,
        "is_active"      BOOLEAN NOT NULL DEFAULT true,
        "released_at"    TIMESTAMP,
        "released_by_id" UUID,
        CONSTRAINT "PK_wallet_freezes" PRIMARY KEY ("id"),
        CONSTRAINT "FK_wallet_freezes_wallet_id" FOREIGN KEY ("wallet_id") REFERENCES "wallets"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_wallet_freezes_admin_id" FOREIGN KEY ("admin_id") REFERENCES "admins"("id") ON DELETE RESTRICT,
        CONSTRAINT "FK_wallet_freezes_released_by" FOREIGN KEY ("released_by_id") REFERENCES "admins"("id") ON DELETE SET NULL
      )
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_wallet_freezes_wallet_id" ON "wallet_freezes" ("wallet_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_wallet_freezes_admin_id" ON "wallet_freezes" ("admin_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_wallet_freezes_is_active" ON "wallet_freezes" ("is_active")`,
    );

    // wallet_adjustments
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "wallet_adjustments" (
        "id"              UUID NOT NULL DEFAULT uuid_generate_v4(),
        "created_at"      TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at"      TIMESTAMP NOT NULL DEFAULT now(),
        "deleted_at"      TIMESTAMP,
        "wallet_id"       UUID NOT NULL,
        "transaction_id"  UUID,
        "admin_id"       UUID NOT NULL,
        "adjustment_type" "public"."adjustment_type_enum" NOT NULL,
        "amount"          NUMERIC(14,4) NOT NULL,
        "reason"          VARCHAR(255) NOT NULL,
        "notes"           TEXT,
        CONSTRAINT "PK_wallet_adjustments" PRIMARY KEY ("id"),
        CONSTRAINT "CHK_wallet_adjustments_amount" CHECK ("amount" > 0),
        CONSTRAINT "FK_wallet_adjustments_wallet_id" FOREIGN KEY ("wallet_id") REFERENCES "wallets"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_wallet_adjustments_transaction_id" FOREIGN KEY ("transaction_id") REFERENCES "wallet_transactions"("id") ON DELETE SET NULL,
        CONSTRAINT "FK_wallet_adjustments_admin_id" FOREIGN KEY ("admin_id") REFERENCES "admins"("id") ON DELETE RESTRICT
      )
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_wallet_adjustments_wallet_id" ON "wallet_adjustments" ("wallet_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_wallet_adjustments_transaction_id" ON "wallet_adjustments" ("transaction_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_wallet_adjustments_admin_id" ON "wallet_adjustments" ("admin_id")`,
    );

    // daily_financial_reports
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "daily_financial_reports" (
        "id"                          UUID NOT NULL DEFAULT uuid_generate_v4(),
        "created_at"                  TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at"                  TIMESTAMP NOT NULL DEFAULT now(),
        "deleted_at"                  TIMESTAMP,
        "report_date"                 DATE NOT NULL,
        "gross_revenue_usd"           NUMERIC(14,2) NOT NULL,
        "net_revenue_usd"             NUMERIC(14,2) NOT NULL,
        "coins_purchased"             NUMERIC(14,4) NOT NULL,
        "coins_spent_gifts"           NUMERIC(14,4) NOT NULL,
        "platform_commission_coins"  NUMERIC(14,4) NOT NULL,
        "creator_earnings_coins"     NUMERIC(14,4) NOT NULL,
        "outstanding_token_liability" NUMERIC(14,2) NOT NULL,
        "tax_liability_usd"           NUMERIC(14,2) NOT NULL,
        "status"                      VARCHAR(20) NOT NULL DEFAULT 'BALANCED',
        CONSTRAINT "PK_daily_financial_reports" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_daily_financial_reports_date" UNIQUE ("report_date")
      )
    `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "IDX_daily_reports_report_date" ON "daily_financial_reports" ("report_date")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP TABLE IF EXISTS "daily_financial_reports" CASCADE`,
    );
    await queryRunner.query(
      `DROP TABLE IF EXISTS "wallet_adjustments" CASCADE`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "wallet_freezes" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "promo_codes" CASCADE`);
    await queryRunner.query(
      `DROP TABLE IF EXISTS "currency_exchange_rates" CASCADE`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "coin_purchases" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "coin_packages" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "wallet_ledgers" CASCADE`);
    await queryRunner.query(
      `DROP TABLE IF EXISTS "wallet_transactions" CASCADE`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "wallets" CASCADE`);

    await queryRunner.query(
      `DROP TYPE IF EXISTS "public"."discount_type_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE IF EXISTS "public"."payment_status_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE IF EXISTS "public"."payment_provider_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE IF EXISTS "public"."freeze_reason_enum"`,
    );
    await queryRunner.query(`DROP TYPE IF EXISTS "public"."freeze_type_enum"`);
    await queryRunner.query(
      `DROP TYPE IF EXISTS "public"."adjustment_type_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE IF EXISTS "public"."ledger_balance_type_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE IF EXISTS "public"."ledger_entry_type_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE IF EXISTS "public"."transaction_status_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE IF EXISTS "public"."transaction_type_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE IF EXISTS "public"."wallet_status_enum"`,
    );
  }
}

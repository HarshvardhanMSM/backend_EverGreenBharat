const { Client } = require('pg');

async function run() {
  const client = new Client({
    host: 'localhost',
    port: 5432,
    user: 'postgres',
    password: 'root',
    database: 'nursery_db',
  });

  await client.connect();
  console.log('Connected to Postgres.');

  await client.query(`
    CREATE TABLE IF NOT EXISTS system_settings (
      key VARCHAR(100) PRIMARY KEY,
      value JSONB NOT NULL,
      "createdAt" TIMESTAMP WITHOUT TIME ZONE DEFAULT now() NOT NULL,
      "updatedAt" TIMESTAMP WITHOUT TIME ZONE DEFAULT now() NOT NULL
    );
  `);
  console.log('system_settings table created successfully.');

  // Pre-seed default economy config
  await client.query(`
    INSERT INTO system_settings (key, value, "createdAt", "updatedAt")
    VALUES (
      'economy_config',
      '{"coinsPerUsd": 100, "withdrawalCommissionRate": 30, "minimumWithdrawalCoins": 100}',
      now(),
      now()
    )
    ON CONFLICT (key) DO NOTHING;
  `);
  console.log('Initial economy_config inserted.');

  await client.end();
}

run().catch(console.error);

require('dotenv').config();
const { Client } = require('pg');

const client = new Client({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  user: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'root',
  database: process.env.DB_DATABASE || 'nursery_db',
});

async function fix() {
  await client.connect();
  console.log('Aligning PostgreSQL schema with TypeORM entity definitions...');

  // 1. Alter categories column lengths directly in postgres so oldColumn.length === newColumn.length
  await client.query(`ALTER TABLE "categories" ALTER COLUMN "name" TYPE character varying(100);`);
  await client.query(`ALTER TABLE "categories" ALTER COLUMN "slug" TYPE character varying(120);`);
  console.log('[+] Aligned categories name (varchar 100) and slug (varchar 120).');

  // 2. Drop the old unique constraint on name if it exists, so TypeORM doesn't conflict
  await client.query(`ALTER TABLE "categories" DROP CONSTRAINT IF EXISTS "UQ_8b0be371d28245da6e4f4b61878";`);
  await client.query(`DROP INDEX IF EXISTS "IDX_categories_name";`);
  await client.query(`CREATE INDEX IF NOT EXISTS "IDX_categories_name" ON "categories" ("name");`);
  console.log('[+] Removed unique constraint on category name, replaced with standard index.');

  // 3. Drop category_attributes table so TypeORM can recreate it cleanly with the proper Postgres ENUMs
  await client.query(`DROP TABLE IF EXISTS "category_attributes" CASCADE;`);
  console.log('[+] Cleared category_attributes for clean TypeORM synchronization.');

  await client.end();
  console.log('Schema alignment complete.');
}

fix().catch(err => {
  console.error('Alignment failed:', err);
  process.exit(1);
});

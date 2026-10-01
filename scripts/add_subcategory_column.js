require('dotenv').config();
const { Client } = require('pg');

const client = new Client({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  user: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'root',
  database: process.env.DB_DATABASE || 'nursery_db',
});

async function addSubcategoryColumn() {
  await client.connect();
  await client.query(`
    ALTER TABLE "products" 
    ADD COLUMN IF NOT EXISTS "subcategoryId" UUID REFERENCES "categories"("id") ON DELETE SET NULL;
  `);
  console.log('[+] Added subcategoryId column to products table.');
  await client.end();
}

addSubcategoryColumn().catch(console.error);

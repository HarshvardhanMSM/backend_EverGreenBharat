require('dotenv').config();
const { Client } = require('pg');

const client = new Client({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  user: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'root',
  database: process.env.DB_DATABASE || 'nursery_db',
});

async function run() {
  await client.connect();
  const res = await client.query(`
    SELECT conname, contype, pg_get_constraintdef(oid) 
    FROM pg_constraint 
    WHERE conrelid = 'categories'::regclass;
  `);
  console.log('Constraints on categories:');
  console.table(res.rows);

  const idxs = await client.query(`
    SELECT indexname, indexdef
    FROM pg_indexes
    WHERE tablename = 'categories';
  `);
  console.log('Indexes on categories:');
  console.table(idxs.rows);

  await client.end();
}

run().catch(console.error);

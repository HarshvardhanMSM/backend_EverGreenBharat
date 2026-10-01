const { Client } = require('pg');

async function main() {
  const client = new Client({
    host: 'localhost',
    port: 5432,
    user: 'postgres',
    password: 'root',
    database: 'nursery_db',
  });

  await client.connect();
  const res = await client.query('SELECT id, name, "scientificName", "suggestedCategory", specifications FROM master_products');
  console.log(JSON.stringify(res.rows, null, 2));
  await client.end();
}

main().catch(console.error);

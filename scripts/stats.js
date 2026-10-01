const { Client } = require('pg');

async function main() {
  const client = new Client({ host: 'localhost', port: 5432, user: 'postgres', password: 'root', database: 'nursery_db' });
  await client.connect();

  const total = await client.query('SELECT count(*) FROM master_products');
  const active = await client.query("SELECT count(*) FROM master_products WHERE status = 'active'");
  const withImages = await client.query('SELECT count(*) FROM master_products WHERE jsonb_array_length("referenceImages") > 0');
  const withHindi = await client.query("SELECT count(*) FROM master_products WHERE translations->'hi' IS NOT NULL");
  const categories = await client.query('SELECT "suggestedCategory", count(*) FROM master_products GROUP BY "suggestedCategory" ORDER BY count DESC');

  console.log('=== DATABASE MASTER CATALOG SUMMARY ===');
  console.log(`Total Master Plants: ${total.rows[0].count}`);
  console.log(`Active Status: ${active.rows[0].count}`);
  console.log(`With Reference Images: ${withImages.rows[0].count}`);
  console.log(`With Hindi Translations: ${withHindi.rows[0].count}`);
  console.log('\nBreakdown by Category:');
  console.table(categories.rows);

  await client.end();
}

main().catch(console.error);

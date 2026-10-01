const { Client } = require('pg');

async function testSearch(client, term) {
  const q = `%${term}%`;
  const res = await client.query(`
    SELECT name, "scientificName", "suggestedCategory", translations
    FROM master_products
    WHERE status = 'active'
      AND (name ILIKE $1 OR "scientificName" ILIKE $1 OR "suggestedCategory" ILIKE $1 OR CAST(translations AS text) ILIKE $1)
    LIMIT 3
  `, [q]);
  console.log(`\nSearch results for "${term}": (${res.rows.length} found)`);
  for (const r of res.rows) {
    console.log(`- ${r.name} | Hindi: ${r.translations?.hi?.name} | Category: ${r.suggestedCategory}`);
  }
}

async function main() {
  const client = new Client({ host: 'localhost', port: 5432, user: 'postgres', password: 'root', database: 'nursery_db' });
  await client.connect();

  await testSearch(client, 'Peace');
  await testSearch(client, 'पीस');
  await testSearch(client, 'Monstera');
  await testSearch(client, 'मॉन्स्टेरा');
  await testSearch(client, 'Snake');
  await testSearch(client, 'स्नेक');
  await testSearch(client, 'Bonsai');
  await testSearch(client, 'कढ़ी');

  await client.end();
}

main().catch(console.error);

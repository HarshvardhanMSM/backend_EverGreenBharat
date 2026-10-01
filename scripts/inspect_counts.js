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
  const tables = [
    'admins', 'users', 'admin_roles',
    'vendors', 'products', 'orders', 'order_items',
    'institutional_inquiries', 'influencer_profiles',
    'master_products', 'categories'
  ];

  console.log('=== DATABASE STATUS ===');
  for (const t of tables) {
    try {
      const res = await client.query(`SELECT COUNT(*) FROM "${t}"`);
      console.log(`${t.padEnd(25)}: ${res.rows[0].count}`);
    } catch(e) {
      console.log(`${t.padEnd(25)}: error (${e.message})`);
    }
  }

  const admins = await client.query('SELECT id, email, username, "isSuperAdmin", status, department FROM admins');
  console.log('\n=== CURRENT ADMINS ===');
  console.table(admins.rows);

  await client.end();
}

main().catch(console.error);

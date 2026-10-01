const { Client } = require('pg');
const path = require('path');
const fs = require('fs');

// Read .env manually in case dotenv is not installed in global scope
const envPath = path.join(__dirname, '.env');
const envVars = {};
if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, 'utf8');
  content.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const idx = trimmed.indexOf('=');
      if (idx !== -1) {
        const key = trimmed.substring(0, idx).trim();
        const val = trimmed.substring(idx + 1).trim();
        envVars[key] = val;
      }
    }
  });
}

const client = new Client({
  host: envVars.DB_HOST || 'localhost',
  port: parseInt(envVars.DB_PORT || '5432'),
  user: envVars.DB_USERNAME || 'postgres',
  password: envVars.DB_PASSWORD || 'root',
  database: envVars.DB_DATABASE || 'nursery_db',
});

async function resetDb() {
  console.log(`Connecting to PostgreSQL database "${envVars.DB_DATABASE || 'nursery_db'}" on ${envVars.DB_HOST || 'localhost'}:${envVars.DB_PORT || '5432'}...`);
  await client.connect();
  console.log('Connected successfully!');
  console.log('Resetting schema "public"...');
  await client.query('DROP SCHEMA public CASCADE;');
  await client.query('CREATE SCHEMA public;');
  await client.query('GRANT ALL ON SCHEMA public TO public;');
  console.log('Database successfully reset to a clean state!');
  await client.end();
}

resetDb().catch(err => {
  console.error('Database reset failed:', err.message);
  process.exit(1);
});

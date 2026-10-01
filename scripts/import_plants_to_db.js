const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

async function main() {
  const seedFile = path.resolve(__dirname, '../../docs/final_master_catalog_seed.json');
  if (!fs.existsSync(seedFile)) {
    console.error('Seed file not found:', seedFile);
    process.exit(1);
  }

  const plants = JSON.parse(fs.readFileSync(seedFile, 'utf8'));
  console.log(`Loaded ${plants.length} plant records from final_master_catalog_seed.json`);

  const client = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    user: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || 'root',
    database: process.env.DB_DATABASE || 'nursery_db',
  });

  await client.connect();
  console.log('Connected to PostgreSQL database:', client.database);

  // Fetch all existing master products
  const existingRes = await client.query('SELECT id, LOWER(name) as lower_name, name FROM master_products');
  const existingMap = new Map();
  for (const row of existingRes.rows) {
    existingMap.set(row.lower_name.trim(), row);
    // Also strip trailing " plant" if present for flexible matching
    const base = row.lower_name.replace(/\s+plant$/i, '').trim();
    existingMap.set(base, row);
  }
  console.log(`Found ${existingRes.rows.length} existing master products in database.`);

  let inserted = 0;
  let updated = 0;

  for (const p of plants) {
    const pLower = p.name.toLowerCase().trim();
    const pBase = pLower.replace(/\s+plant$/i, '').trim();

    // Check if match exists
    const match = existingMap.get(pLower) || existingMap.get(pBase);

    if (match) {
      // Update existing record with Hindi translations, specifications, reference images
      await client.query(
        `UPDATE master_products 
         SET translations = $1,
             specifications = COALESCE(NULLIF(specifications, '{}'::jsonb), $2),
             "referenceImages" = CASE 
                WHEN "referenceImages" = '[]'::jsonb OR "referenceImages" IS NULL THEN $3 
                ELSE "referenceImages" 
             END,
             "scientificName" = COALESCE("scientificName", $4),
             "suggestedCategory" = COALESCE("suggestedCategory", $5),
             "updatedAt" = NOW()
         WHERE id = $6`,
        [
          JSON.stringify(p.translations),
          JSON.stringify(p.specifications),
          JSON.stringify(p.referenceImages),
          p.scientificName,
          p.suggestedCategory,
          match.id,
        ]
      );
      updated++;
      console.log(`[UPDATE] ${match.name} (ID: ${match.id}) enriched with Hindi & specs`);
    } else {
      // Insert new master product
      await client.query(
        `INSERT INTO master_products (
          id, "createdAt", "updatedAt", name, "scientificName", description,
          specifications, "suggestedCategory", "referenceImages", source, status,
          "usageCount", translations
        ) VALUES (
          gen_random_uuid(), NOW(), NOW(), $1, $2, $3,
          $4, $5, $6, 'admin', 'active',
          0, $7
        )`,
        [
          p.name,
          p.scientificName,
          p.description,
          JSON.stringify(p.specifications),
          p.suggestedCategory,
          JSON.stringify(p.referenceImages),
          JSON.stringify(p.translations),
        ]
      );
      // Register in map to prevent duplicate inserts if any
      existingMap.set(pLower, { id: 'new', name: p.name });
      inserted++;
      console.log(`[INSERT] ${p.name}`);
    }
  }

  // Get total count
  const countRes = await client.query('SELECT count(*) FROM master_products');
  console.log(`\nImport Summary:`);
  console.log(`- New Plants Inserted: ${inserted}`);
  console.log(`- Existing Plants Updated: ${updated}`);
  console.log(`- Total Master Products in Database: ${countRes.rows[0].count}`);

  // Fetch sample to verify multilingual field
  const sampleRes = await client.query(
    `SELECT name, "scientificName", "suggestedCategory", "referenceImages", translations 
     FROM master_products 
     ORDER BY "createdAt" DESC 
     LIMIT 3`
  );
  console.log('\nLatest 3 Master Products:');
  console.log(JSON.stringify(sampleRes.rows, null, 2));

  await client.end();
}

main().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});

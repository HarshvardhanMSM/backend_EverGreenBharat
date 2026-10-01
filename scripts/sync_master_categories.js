const { Client } = require('pg');

async function syncMasterCatalogCategories() {
  const client = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    user: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || 'root',
    database: process.env.DB_NAME || 'nursery_db',
  });

  try {
    await client.connect();
    console.log('Connected to PostgreSQL nursery_db');

    // 1. Add columns to master_products if they don't exist
    await client.query(`
      ALTER TABLE master_products ADD COLUMN IF NOT EXISTS "categoryId" UUID REFERENCES categories(id) ON DELETE SET NULL;
      ALTER TABLE master_products ADD COLUMN IF NOT EXISTS "subcategoryId" UUID REFERENCES categories(id) ON DELETE SET NULL;
      ALTER TABLE master_products ADD COLUMN IF NOT EXISTS "attributes" JSONB DEFAULT '{}'::jsonb;
    `);
    console.log('Columns categoryId, subcategoryId, and attributes ensured on master_products.');

    // 2. Fetch all categories and subcategories
    const catRes = await client.query('SELECT id, name, slug, "parentId" FROM categories');
    const categories = catRes.rows;

    const plantsParent = categories.find(c => c.slug === 'plants' || c.name.toLowerCase() === 'plants');
    console.log('Parent "Plants" category:', plantsParent ? plantsParent.id : 'Not found');
    const plantSubcats = categories.filter(c => plantsParent && c.parentId === plantsParent.id);
    console.log('Subcategories under Plants count:', plantSubcats.length);
    if (plantSubcats.length > 0) {
      console.log('First 5 plant subcats:', plantSubcats.slice(0, 5).map(s => ({ id: s.id, name: s.name, slug: s.slug })));
    }

    // 3. Fetch master products
    const mpRes = await client.query('SELECT id, name, "suggestedCategory", specifications, attributes FROM master_products');
    console.log(`Found ${mpRes.rows.length} master products.`);

    let updatedCount = 0;
    for (const mp of mpRes.rows) {
      let matchedSubcat = null;
      // Match subcategory
      if (mp.suggestedCategory) {
        const scName = mp.suggestedCategory.trim().toLowerCase();
        matchedSubcat = categories.find(c =>
          c.parentId && (
            c.name.toLowerCase() === scName ||
            c.slug.toLowerCase() === scName.replace(/[^a-z0-9]+/g, '-') ||
            scName.includes(c.name.toLowerCase()) ||
            c.name.toLowerCase().includes(scName)
          )
        );
      }

      // Keyword matching on plant name or plantType
      if (!matchedSubcat && plantsParent) {
        const fullText = `${mp.name} ${mp.specifications?.plantType || ''} ${mp.specifications?.indoorOutdoor || ''}`.toLowerCase();
        if (fullText.includes('succulent') || fullText.includes('cactus')) {
          matchedSubcat = categories.find(c => c.parentId === plantsParent.id && c.name.toLowerCase().includes('succulent'));
        } else if (fullText.includes('flower') || fullText.includes('rose') || fullText.includes('hibiscus') || fullText.includes('jasmine')) {
          matchedSubcat = categories.find(c => c.parentId === plantsParent.id && c.name.toLowerCase().includes('flowering'));
        } else if (fullText.includes('medicinal') || fullText.includes('tulsi') || fullText.includes('neem') || fullText.includes('aloe') || fullText.includes('ayur')) {
          matchedSubcat = categories.find(c => c.parentId === plantsParent.id && c.name.toLowerCase().includes('medicinal'));
        } else if (fullText.includes('fruit') || fullText.includes('mango') || fullText.includes('guava') || fullText.includes('lemon')) {
          matchedSubcat = categories.find(c => c.parentId === plantsParent.id && c.name.toLowerCase().includes('fruit'));
        } else if (fullText.includes('bonsai')) {
          matchedSubcat = categories.find(c => c.parentId === plantsParent.id && c.name.toLowerCase().includes('bonsai'));
        } else if (fullText.includes('outdoor')) {
          matchedSubcat = categories.find(c => c.parentId === plantsParent.id && c.name.toLowerCase().includes('outdoor'));
        } else {
          matchedSubcat = categories.find(c => c.parentId === plantsParent.id && c.name.toLowerCase().includes('indoor'));
        }
      }

      const categoryId = plantsParent ? plantsParent.id : null;
      const subcategoryId = matchedSubcat ? matchedSubcat.id : null;

      // Also merge specifications into attributes if attributes is empty
      const existingAttrs = mp.attributes || {};
      const mergedAttrs = {
        ...existingAttrs,
        ...(mp.specifications || {}),
      };

      await client.query(
        `UPDATE master_products
         SET "categoryId" = COALESCE("categoryId", $1),
             "subcategoryId" = COALESCE("subcategoryId", $2),
             "attributes" = CASE WHEN "attributes" IS NULL OR "attributes" = '{}'::jsonb THEN $3::jsonb ELSE "attributes" END
         WHERE id = $4`,
        [categoryId, subcategoryId, JSON.stringify(mergedAttrs), mp.id]
      );
      updatedCount++;
    }

    console.log(`Successfully synced ${updatedCount} master products with categories, subcategories, and attributes.`);

    // 4. Verify count
    const verifyRes = await client.query(`
      SELECT COUNT(*) as total,
             COUNT("categoryId") as with_cat,
             COUNT("subcategoryId") as with_subcat
      FROM master_products
    `);
    console.log('Verification:', verifyRes.rows[0]);

  } catch (err) {
    console.error('Sync failed:', err);
  } finally {
    await client.end();
  }
}

syncMasterCatalogCategories();

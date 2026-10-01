require('dotenv').config();
const { Client } = require('pg');

const client = new Client({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  user: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'root',
  database: process.env.DB_DATABASE || 'nursery_db',
});

const CATEGORIES = [
  {
    name: 'Plants',
    slug: 'plants',
    description: 'Indoor, outdoor, flowering, fruit, and ornamental plants for homes, gardens, and landscapes.',
    sortOrder: 1,
    subcategories: [
      'Indoor Plants', 'Outdoor Plants', 'Flowering Plants', 'Fruit Plants',
      'Vegetable Plants', 'Medicinal Plants', 'Ornamental Plants', 'Succulents',
      'Cactus', 'Climbers/Creepers', 'Shrubs', 'Trees', 'Palm Plants',
      'Bonsai', 'Aquatic Plants', 'Air-Purifying Plants', 'Seasonal Plants',
    ],
    attributes: [
      { name: 'Common Name', type: 'text', req: 'required', filter: true, order: 1 },
      { name: 'Plant Type', type: 'dropdown', req: 'required', filter: true, order: 2, dropdown: ['Indoor', 'Outdoor', 'Flowering', 'Foliage', 'Succulent', 'Medicinal', 'Bonsai', 'Aquatic'] },
      { name: 'Plant Height', type: 'number+unit', req: 'required', filter: true, order: 3, units: ['cm', 'inch', 'ft'] },
      { name: 'Plant Width', type: 'number+unit', req: 'recommended', filter: true, order: 4, units: ['cm', 'inch', 'ft'] },
      { name: 'Pot Size', type: 'dropdown', req: 'recommended', filter: true, order: 5, dropdown: ['Small (3-5 inch)', 'Medium (6-8 inch)', 'Large (10-12 inch)', 'Extra Large (14+ inch)', 'Without Pot'] },
      { name: 'Sunlight Requirement', type: 'dropdown', req: 'required', filter: true, order: 6, dropdown: ['Full Sun (6+ hours)', 'Partial Sunlight / Semi-shade', 'Bright Indirect Light', 'Low Light'] },
      { name: 'Water Requirement', type: 'dropdown', req: 'required', filter: true, order: 7, dropdown: ['Daily', 'Alternate Days', 'Once a Week', 'When Topsoil is Dry', 'Low Water'] },
      { name: 'Soil Type', type: 'multi-select', req: 'recommended', filter: true, order: 8, dropdown: ['Well-draining Potting Mix', 'Garden Soil', 'Sandy Soil', 'Clay Soil', 'Coco Peat based'] },
      { name: 'Flowering / Non-Flowering', type: 'boolean', req: 'recommended', filter: true, order: 9 },
      { name: 'Flower Color', type: 'dropdown', req: 'optional', filter: true, order: 10, dropdown: ['Red', 'Pink', 'White', 'Yellow', 'Purple', 'Orange', 'Multicolor'] },
      { name: 'Flowering Season', type: 'dropdown', req: 'optional', filter: true, order: 11, dropdown: ['Year Round', 'Summer', 'Winter', 'Spring', 'Monsoon'] },
    ],
  },
  {
    name: 'Seeds',
    slug: 'seeds',
    description: 'High-germination vegetable, flower, fruit, herb, tree, and microgreen seeds.',
    sortOrder: 2,
    subcategories: [
      'Flower Seeds', 'Vegetable Seeds', 'Fruit Seeds', 'Herb Seeds',
      'Indoor Plant Seeds', 'Outdoor Plant Seeds', 'Medicinal Plant Seeds',
      'Tree Seeds', 'Microgreen Seeds', 'Lawn/Grass Seeds',
    ],
    attributes: [
      { name: 'Seed / Variety Name', type: 'text', req: 'required', filter: true, order: 1 },
      { name: 'Plant / Variety', type: 'text', req: 'required', filter: true, order: 2 },
      { name: 'Seed Type', type: 'dropdown', req: 'required', filter: true, order: 3, dropdown: ['Hybrid (F1)', 'Desi / Heirloom', 'Organic / Non-GMO', 'Open Pollinated'] },
      { name: 'Seed Quantity', type: 'number+unit', req: 'required', filter: true, order: 4, units: ['seeds', 'grams', 'packets'] },
      { name: 'Pack Size', type: 'number+unit', req: 'required', filter: true, order: 5, units: ['gm', 'kg', 'packet'] },
      { name: 'Water Requirement', type: 'dropdown', req: 'recommended', filter: true, order: 6, dropdown: ['Moderate', 'High', 'Low'] },
    ],
  },
  {
    name: 'Pots & Planters',
    slug: 'pots-planters',
    description: 'Ceramic, plastic, terracotta, hanging, metal, and self-watering planters.',
    sortOrder: 3,
    subcategories: [
      'Plastic Pots', 'Ceramic Pots', 'Terracotta Pots', 'Cement Pots',
      'Metal Planters', 'Wooden Planters', 'Hanging Pots', 'Wall Planters',
      'Grow Bags', 'Self-Watering Pots', 'Decorative Planters', 'Seedling Trays',
    ],
    attributes: [
      { name: 'Material', type: 'dropdown', req: 'required', filter: true, order: 1, dropdown: ['Plastic', 'Ceramic', 'Terracotta / Clay', 'Cement / Concrete', 'Metal', 'Wood', 'Fabric / HDPE'] },
      { name: 'Shape', type: 'dropdown', req: 'recommended', filter: true, order: 2, dropdown: ['Round', 'Square', 'Rectangular', 'Oval', 'Hexagonal', 'Novelty / Decorative'] },
      { name: 'Color', type: 'dropdown', req: 'recommended', filter: true, order: 3, dropdown: ['Terracotta / Brown', 'White', 'Black', 'Green', 'Grey', 'Blue', 'Multicolor'] },
      { name: 'Height', type: 'number+unit', req: 'required', filter: true, order: 4, units: ['inch', 'cm'] },
      { name: 'Width', type: 'number+unit', req: 'recommended', filter: true, order: 5, units: ['inch', 'cm'] },
      { name: 'Diameter', type: 'number+unit', req: 'recommended', filter: true, order: 6, units: ['inch', 'cm'] },
      { name: 'Capacity', type: 'number+unit', req: 'recommended', filter: true, order: 7, units: ['litres', 'gallons'] },
      { name: 'Indoor / Outdoor', type: 'dropdown', req: 'recommended', filter: true, order: 8, dropdown: ['Indoor', 'Outdoor', 'Both'] },
      { name: 'Weight', type: 'number+unit', req: 'optional', filter: true, order: 9, units: ['kg', 'gm'] },
    ],
  },
  {
    name: 'Fertilizers & Plant Nutrition',
    slug: 'fertilizers-plant-nutrition',
    description: 'Organic compost, vermicompost, NPK, liquid plant tonics, and growth supplements.',
    sortOrder: 4,
    subcategories: [
      'Organic Fertilizers', 'Chemical Fertilizers', 'Liquid Fertilizers',
      'Granular Fertilizers', 'Compost', 'Vermicompost',
      'Plant Growth Supplements', 'Micronutrients', 'NPK Fertilizers',
      'Seaweed/Humic Products',
    ],
    attributes: [
      { name: 'Fertilizer Type', type: 'dropdown', req: 'required', filter: true, order: 1, dropdown: ['NPK', 'Organic Manure', 'Vermicompost', 'Bone Meal', 'Neem Cake', 'Seaweed Extract', 'Epsom Salt', 'Micronutrient Spray'] },
      { name: 'Form', type: 'dropdown', req: 'required', filter: true, order: 2, dropdown: ['Liquid', 'Granular / Pellets', 'Powder', 'Sticks / Spikes'] },
      { name: 'Nutrient Composition', type: 'rich-text', req: 'recommended', filter: false, order: 3 },
      { name: 'Pack Size', type: 'number+unit', req: 'required', filter: true, order: 4, units: ['gm', 'kg', 'ml', 'litre'] },
      { name: 'Weight / Volume', type: 'number+unit', req: 'required', filter: true, order: 5, units: ['kg', 'gm', 'litre', 'ml'] },
      { name: 'Organic / Chemical', type: 'dropdown', req: 'recommended', filter: true, order: 6, dropdown: ['100% Organic', 'Chemical / Synthetic', 'Bio-fertilizer'] },
    ],
  },
  {
    name: 'Gardening Tools',
    slug: 'gardening-tools',
    description: 'Secateurs, pruners, trowels, sprayers, hose pipes, and garden maintenance toolkits.',
    sortOrder: 5,
    subcategories: [
      'Pruning Tools', 'Hand Tools', 'Shovels', 'Spades', 'Trowels',
      'Secateurs', 'Shears', 'Rakes', 'Garden Forks', 'Watering Tools',
      'Sprayers', 'Hose & Irrigation', 'Gardening Tool Sets',
    ],
    attributes: [
      { name: 'Tool Type', type: 'dropdown', req: 'required', filter: true, order: 1, dropdown: ['Secateurs / Pruners', 'Trowel', 'Shears', 'Watering Can', 'Sprayer', 'Rake', 'Garden Fork', 'Cultivator', 'Tool Set'] },
      { name: 'Material', type: 'dropdown', req: 'required', filter: true, order: 2, dropdown: ['Stainless Steel', 'Carbon Steel', 'Heavy Duty Plastic', 'Brass', 'Aluminium'] },
      { name: 'Handle Material', type: 'dropdown', req: 'optional', filter: true, order: 3, dropdown: ['Rubber Grip', 'Wood', 'Plastic', 'Metal with Cushion'] },
      { name: 'Length', type: 'number+unit', req: 'recommended', filter: true, order: 4, units: ['cm', 'inch'] },
      { name: 'Width', type: 'number+unit', req: 'optional', filter: true, order: 5, units: ['cm', 'inch'] },
      { name: 'Weight', type: 'number+unit', req: 'recommended', filter: true, order: 6, units: ['gm', 'kg'] },
      { name: 'Size', type: 'dropdown', req: 'recommended', filter: true, order: 7, dropdown: ['Small / Handheld', 'Medium', 'Large / Heavy Duty'] },
      { name: 'Manual / Electric', type: 'dropdown', req: 'recommended', filter: true, order: 8, dropdown: ['Manual', 'Battery Operated', 'Electric Corded'] },
    ],
  },
];

async function seed() {
  await client.connect();
  console.log('Connected to database.');

  // Clean legacy streaming categories
  const legacySlugs = ['gaming', 'music', 'talk-shows', 'cooking', 'sports', 'education', 'art-design', 'travel', 'technology', 'just-chatting'];
  for (const slug of legacySlugs) {
    await client.query('DELETE FROM categories WHERE slug = $1', [slug]).catch(() => {});
  }
  console.log('Cleaned legacy categories.');

  // Create table category_attributes if not exists
  await client.query(`
    CREATE TABLE IF NOT EXISTS category_attributes (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      "categoryId" UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
      "attributeName" VARCHAR(100) NOT NULL,
      "dataType" VARCHAR(50) NOT NULL DEFAULT 'text',
      "unitOptions" JSONB DEFAULT '[]'::jsonb,
      "dropdownOptions" JSONB DEFAULT '[]'::jsonb,
      "requiredLevel" VARCHAR(50) NOT NULL DEFAULT 'optional',
      filterable BOOLEAN DEFAULT true,
      "displayOrder" INT DEFAULT 0,
      "createdAt" TIMESTAMP DEFAULT NOW(),
      "updatedAt" TIMESTAMP DEFAULT NOW()
    );
  `);

  // Ensure parentId and imageUrl columns exist on categories
  await client.query(`ALTER TABLE categories ADD COLUMN IF NOT EXISTS "parentId" UUID REFERENCES categories(id) ON DELETE CASCADE;`).catch(() => {});
  await client.query(`ALTER TABLE categories ADD COLUMN IF NOT EXISTS "imageUrl" TEXT;`).catch(() => {});

  for (const cat of CATEGORIES) {
    // Upsert primary category
    let res = await client.query('SELECT id FROM categories WHERE slug = $1', [cat.slug]);
    let catId;
    if (res.rows.length === 0) {
      const insertRes = await client.query(
        `INSERT INTO categories (name, slug, description, "sortOrder", "isActive") VALUES ($1, $2, $3, $4, true) RETURNING id`,
        [cat.name, cat.slug, cat.description, cat.sortOrder]
      );
      catId = insertRes.rows[0].id;
      console.log(`[+] Created Category: ${cat.name}`);
    } else {
      catId = res.rows[0].id;
      await client.query('UPDATE categories SET "sortOrder" = $1, description = $2 WHERE id = $3', [cat.sortOrder, cat.description, catId]);
      console.log(`[*] Updated Category: ${cat.name}`);
    }

    // Subcategories
    let subOrder = 1;
    for (const subName of cat.subcategories) {
      const subSlug = `${cat.slug}-${subName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}`;
      const subRes = await client.query('SELECT id FROM categories WHERE "parentId" = $1 AND name = $2', [catId, subName]);
      if (subRes.rows.length === 0) {
        await client.query(
          `INSERT INTO categories (name, slug, description, "parentId", "sortOrder", "isActive") VALUES ($1, $2, $3, $4, $5, true)`,
          [subName, subSlug, `${subName} under ${cat.name}`, catId, subOrder++]
        );
      }
    }

    // Attributes
    for (const attr of cat.attributes) {
      const attrRes = await client.query('SELECT id FROM category_attributes WHERE "categoryId" = $1 AND "attributeName" = $2', [catId, attr.name]);
      if (attrRes.rows.length === 0) {
        await client.query(
          `INSERT INTO category_attributes ("categoryId", "attributeName", "dataType", "requiredLevel", filterable, "unitOptions", "dropdownOptions", "displayOrder")
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [catId, attr.name, attr.type, attr.req, attr.filter, JSON.stringify(attr.units || []), JSON.stringify(attr.dropdown || []), attr.order]
        );
      }
    }
  }

  const catCount = await client.query('SELECT COUNT(*) FROM categories WHERE "parentId" IS NULL');
  const subCount = await client.query('SELECT COUNT(*) FROM categories WHERE "parentId" IS NOT NULL');
  const attrCount = await client.query('SELECT COUNT(*) FROM category_attributes');

  console.log(`\n=== SEEDING SUMMARY ===`);
  console.log(`Primary Categories : ${catCount.rows[0].count}`);
  console.log(`Subcategories      : ${subCount.rows[0].count}`);
  console.log(`Dynamic Attributes : ${attrCount.rows[0].count}`);

  await client.end();
}

seed().catch(err => {
  console.error(err);
  process.exit(1);
});

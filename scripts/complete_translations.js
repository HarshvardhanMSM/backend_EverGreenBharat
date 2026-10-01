const { Client } = require('pg');

async function main() {
  const client = new Client({ host: 'localhost', port: 5432, user: 'postgres', password: 'root', database: 'nursery_db' });
  await client.connect();

  const withoutTrans = await client.query("SELECT id, name FROM master_products WHERE translations = '{}'::jsonb OR translations IS NULL");
  console.log('Without translations count:', withoutTrans.rows.length);
  console.log(withoutTrans.rows);

  for (const row of withoutTrans.rows) {
    if (row.name.toLowerCase().includes('snake')) {
      await client.query(`
        UPDATE master_products
        SET translations = $1
        WHERE id = $2
      `, [
        JSON.stringify({
          hi: {
            name: "संसेवियरिया लौरेंटी स्नेक प्लांट",
            description: "हवा को शुद्ध करने वाला अत्यधिक सहनशील पौधा, जो रात में भी ऑक्सीजन छोड़ता है।",
            careInstructions: "कम पानी दें (10-15 दिन में एक बार)। कम रोशनी और धूप दोनों में चल जाता है।"
          }
        }),
        row.id
      ]);
      console.log('Updated:', row.name);
    } else if (row.name.toLowerCase().includes('pothos')) {
      await client.query(`
        UPDATE master_products
        SET translations = $1
        WHERE id = $2
      `, [
        JSON.stringify({
          hi: {
            name: "गोल्डन पोथोस (मनी प्लांट)",
            description: "सुख, समृद्धि और सकारात्मक ऊर्जा लाने वाली सबसे लोकप्रिय हरी लता।",
            careInstructions: "अप्रत्यक्ष धूप में रखें और हफ्ते में एक बार पानी दें।"
          }
        }),
        row.id
      ]);
      console.log('Updated:', row.name);
    }
  }

  const finalCheck = await client.query("SELECT count(*) FROM master_products WHERE translations != '{}'::jsonb AND translations IS NOT NULL");
  const totalCount = await client.query("SELECT count(*) FROM master_products");
  console.log(`Total master products: ${totalCount.rows[0].count}`);
  console.log(`Master products with Hindi translations: ${finalCheck.rows[0].count}`);

  await client.end();
}

main().catch(console.error);

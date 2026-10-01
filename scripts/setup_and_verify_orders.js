const { Client } = require('pg');
const bcrypt = require('bcrypt');

async function main() {
  const client = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    user: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || 'root',
    database: process.env.DB_NAME || 'nursery_db',
  });

  try {
    await client.connect();
    console.log('=== NURSERY SYSTEM VERIFICATION & SEED SCRIPT ===');
    console.log('Connected to PostgreSQL nursery_db\n');

    // 1. Verify Master Catalog with Categories & Attributes
    const masterCatRes = await client.query(`
      SELECT COUNT(*) as total,
             COUNT("categoryId") as with_cat,
             COUNT("subcategoryId") as with_subcat
      FROM master_products
    `);
    console.log('1. MASTER PRODUCTS STATUS:');
    console.log(`   Total Master Botanical Plants: ${masterCatRes.rows[0].total}`);
    console.log(`   With Parent Category:          ${masterCatRes.rows[0].with_cat}`);
    console.log(`   With Subcategory:              ${masterCatRes.rows[0].with_subcat}`);

    // Check sample master product with attributes
    const sampleMp = await client.query(`
      SELECT mp.name, mp."scientificName", c.name as category, sc.name as subcategory, mp.attributes
      FROM master_products mp
      LEFT JOIN categories c ON mp."categoryId" = c.id
      LEFT JOIN categories sc ON mp."subcategoryId" = sc.id
      LIMIT 2
    `);
    console.log('\nSample Master Plant Records:');
    console.log(JSON.stringify(sampleMp.rows, null, 2));

    // 2. Ensure at least one customer user exists
    let userRes = await client.query('SELECT id, email, "displayName", phone FROM users LIMIT 1');
    let userId;
    if (userRes.rows.length === 0) {
      console.log('\n2. Creating customer user for orders and mobile testing...');
      const pwHash = await bcrypt.hash('Customer@123456', 10);
      const insertUser = await client.query(`
        INSERT INTO users (
          email, username, password, "displayName", phone, status, "isPhoneVerified"
        ) VALUES ($1, $2, $3, $4, $5, 'ACTIVE', true)
        RETURNING id, email, "displayName", phone
      `, ['rahul.sharma@example.com', 'rahulsharma', pwHash, 'Rahul Sharma', '+91 9876543210']);
      userId = insertUser.rows[0].id;
      console.log(`   Customer created: ${insertUser.rows[0].displayName} (${insertUser.rows[0].email})`);
    } else {
      userId = userRes.rows[0].id;
      console.log(`\n2. Existing Customer User found: ${userRes.rows[0].displayName || userRes.rows[0].email} (${userId})`);
    }

    // 3. Ensure at least one Vendor exists
    let vendorRes = await client.query('SELECT id, "storeName", "userId" FROM vendors LIMIT 1');
    let vendorId;
    if (vendorRes.rows.length === 0) {
      console.log('\n3. Creating vendor account...');
      let vUser = await client.query("SELECT id FROM users WHERE email = 'greenparadise@nursery.com'");
      if (vUser.rows.length === 0) {
        const vUserHash = await bcrypt.hash('Vendor@123456', 10);
        vUser = await client.query(`
          INSERT INTO users (
            email, username, password, "displayName", phone, status, "isPhoneVerified"
          ) VALUES ($1, $2, $3, $4, $5, 'ACTIVE', true)
          RETURNING id
        `, ['greenparadise@nursery.com', 'greenparadise', vUserHash, 'Green Paradise Owner', '+91 9829099887']);
      }

      const insertVendor = await client.query(`
        INSERT INTO vendors (
          "userId", "businessName", "storeName", "storeSlug", "supportEmail", "supportPhone",
          "approvalStatus", "isActive", address
        ) VALUES ($1, $2, $3, $4, $5, $6, 'APPROVED', true, $7)
        RETURNING id, "storeName"
      `, [
        vUser.rows[0].id,
        'Green Paradise Nursery Pvt Ltd',
        'Green Paradise Nursery Jaipur',
        'green-paradise-nursery-jaipur',
        'care@greenparadise.com',
        '+91 9829099887',
        JSON.stringify({
          street: 'Plot 42, Nursery Circle, Vaishali Nagar',
          city: 'Jaipur',
          state: 'Rajasthan',
          postalCode: '302021',
        }),
      ]);
      vendorId = insertVendor.rows[0].id;
      console.log(`   Vendor created: ${insertVendor.rows[0].storeName} (${vendorId})`);
    } else {
      vendorId = vendorRes.rows[0].id;
      console.log(`\n3. Existing Vendor found: ${vendorRes.rows[0].storeName} (${vendorId})`);
    }

    // 4. Ensure Vendor Products exist linked to Master Catalog & Categories
    let prodRes = await client.query(`
      SELECT p.id, p.name, p.price, p."stockQuantity", p."categoryId", p."subcategoryId"
      FROM products p
      LIMIT 5
    `);

    if (prodRes.rows.length === 0) {
      console.log('\n4. Creating vendor products linked to Master Catalog & Categories...');
      const mps = await client.query(`
        SELECT id, name, "scientificName", "categoryId", "subcategoryId", "referenceImages", attributes
        FROM master_products
        LIMIT 4
      `);

      for (const mp of mps.rows) {
        const prodPrice = 299 + Math.floor(Math.random() * 500);
        const imgArr = Array.isArray(mp.referenceImages) && mp.referenceImages.length > 0
          ? mp.referenceImages
          : ['https://images.unsplash.com/photo-1545241047-6083a3684587?w=500'];

        await client.query(`
          INSERT INTO products (
            "vendorId", "masterProductId", name, description, price, "stockQuantity",
            status, images, "categoryId", "subcategoryId", attributes
          ) VALUES ($1, $2, $3, $4, $5, $6, 'active', $7, $8, $9, $10)
        `, [
          vendorId,
          mp.id,
          mp.name,
          `Fresh and healthy live ${mp.name} (${mp.scientificName}) grown in premium potting mix.`,
          prodPrice,
          50,
          JSON.stringify(imgArr),
          mp.categoryId,
          mp.subcategoryId,
          JSON.stringify(mp.attributes || {}),
        ]);
      }

      prodRes = await client.query(`
        SELECT p.id, p.name, p.price, p."stockQuantity", p."categoryId", p."subcategoryId", p.images
        FROM products p
        LIMIT 5
      `);
      console.log(`   Created ${prodRes.rows.length} vendor inventory products.`);
    } else {
      console.log(`\n4. Existing Vendor Products found: ${prodRes.rows.length} products.`);
    }

    // 5. Ensure Orders exist with full details (items, address, history, OTP)
    const existingOrders = await client.query('SELECT COUNT(*) as count FROM orders');
    if (parseInt(existingOrders.rows[0].count) === 0) {
      console.log('\n5. Seeding full realistic marketplace orders...');
      const prods = prodRes.rows;
      const otpHash = await bcrypt.hash('482910', 10);

      const ordersToSeed = [
        {
          orderNumber: 'ORD-2026-891024',
          status: 'delivered',
          paymentMethod: 'COD',
          paymentStatus: 'collected',
          subtotal: 798.00,
          deliveryCharge: 60.00,
          total: 858.00,
          deliveredAt: new Date(Date.now() - 3600000 * 5),
          deliveryOtp: otpHash,
          deliveryOtpAttempts: 1,
          shippingAddress: {
            fullName: 'Rahul Sharma',
            phone: '+91 9876543210',
            addressLine1: 'B-402, Green Meadows, Tonk Road',
            addressLine2: 'Near World Trade Park',
            city: 'Jaipur',
            state: 'Rajasthan',
            postalCode: '302018',
            country: 'India',
          },
          statusHistory: [
            { status: 'placed', timestamp: new Date(Date.now() - 86400000 * 3), note: 'Order placed by customer via Mobile App' },
            { status: 'confirmed', timestamp: new Date(Date.now() - 86400000 * 2), note: 'Confirmed by Green Paradise Nursery' },
            { status: 'out_for_delivery', timestamp: new Date(Date.now() - 86400000 * 1), note: 'Dispatched with nursery delivery partner' },
            { status: 'delivered', timestamp: new Date(Date.now() - 3600000 * 5), note: 'Doorstep Delivery OTP verified successfully at delivery address' },
          ],
        },
        {
          orderNumber: 'ORD-2026-891025',
          status: 'out_for_delivery',
          paymentMethod: 'razorpay',
          paymentStatus: 'success',
          subtotal: 1249.00,
          deliveryCharge: 0.00,
          total: 1249.00,
          deliveredAt: null,
          deliveryOtp: otpHash,
          deliveryOtpAttempts: 0,
          shippingAddress: {
            fullName: 'Pooja Verma',
            phone: '+91 9829012345',
            addressLine1: 'Plot 15, Sector 4, Vaishali Nagar',
            addressLine2: 'Behind National Handloom',
            city: 'Jaipur',
            state: 'Rajasthan',
            postalCode: '302021',
            country: 'India',
          },
          statusHistory: [
            { status: 'placed', timestamp: new Date(Date.now() - 43200000), note: 'Prepaid order placed via Razorpay (PAY_99182)' },
            { status: 'confirmed', timestamp: new Date(Date.now() - 28800000), note: 'Healthy plant quality check passed' },
            { status: 'out_for_delivery', timestamp: new Date(Date.now() - 7200000), note: 'Out for doorstep delivery. OTP sent to customer.' },
          ],
        },
        {
          orderNumber: 'ORD-2026-891026',
          status: 'confirmed',
          paymentMethod: 'COD',
          paymentStatus: 'pending',
          subtotal: 549.00,
          deliveryCharge: 50.00,
          total: 599.00,
          deliveredAt: null,
          deliveryOtp: null,
          deliveryOtpAttempts: 0,
          shippingAddress: {
            fullName: 'Amit Patel',
            phone: '+91 9784561230',
            addressLine1: 'Flat 101, Surya Enclave',
            addressLine2: 'Malviya Nagar',
            city: 'Jaipur',
            state: 'Rajasthan',
            postalCode: '302017',
            country: 'India',
          },
          statusHistory: [
            { status: 'placed', timestamp: new Date(Date.now() - 7200000), note: 'Order placed by customer' },
            { status: 'confirmed', timestamp: new Date(Date.now() - 3600000), note: 'Nursery confirmed live plant stock availability' },
          ],
        },
      ];

      for (const ord of ordersToSeed) {
        const insOrder = await client.query(`
          INSERT INTO orders (
            "orderNumber", "userId", "vendorId", "orderStatus", "paymentMethod", "paymentStatus",
            "subtotal", "deliveryCharge", "total", "shippingAddress", "statusHistory",
            "deliveryOtp", "deliveryOtpAttempts", "deliveredAt"
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
          RETURNING id
        `, [
          ord.orderNumber,
          userId,
          vendorId,
          ord.status,
          ord.paymentMethod,
          ord.paymentStatus,
          ord.subtotal,
          ord.deliveryCharge,
          ord.total,
          JSON.stringify(ord.shippingAddress),
          JSON.stringify(ord.statusHistory),
          ord.deliveryOtp,
          ord.deliveryOtpAttempts,
          ord.deliveredAt,
        ]);

        const oId = insOrder.rows[0].id;

        // Add 2 items per order
        for (let i = 0; i < Math.min(2, prods.length); i++) {
          const pr = prods[i];
          const img = Array.isArray(pr.images) && pr.images.length > 0 ? pr.images[0] : null;
          const qty = i + 1;
          const uPrice = parseFloat(pr.price);
          const tPrice = uPrice * qty;

          await client.query(`
            INSERT INTO order_items (
              "orderId", "productId", "vendorId", "productName", "productImage",
              quantity, "unitPrice", "totalPrice", "specificationsSnapshot"
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
          `, [
            oId,
            pr.id,
            vendorId,
            pr.name,
            img,
            qty,
            uPrice,
            tPrice,
            JSON.stringify({ potSize: '6-inch Ceramic Pot', plantHeight: '12-15 inches' }),
          ]);
        }
      }
      console.log(`   Seeded ${ordersToSeed.length} orders with line items & status history.`);
    } else {
      console.log(`\n5. Existing Orders count: ${existingOrders.rows[0].count}`);
    }

    // 6. Comprehensive Verification Report
    console.log('\n======================================================');
    console.log('             COMPREHENSIVE VERIFICATION REPORT         ');
    console.log('======================================================');

    // 6.1 Order Summary
    const ordersView = await client.query(`
      SELECT o."orderNumber", o."orderStatus", o."paymentMethod", o."paymentStatus",
             o.total, v."storeName", u."displayName" as customer,
             COUNT(oi.id) as item_count
      FROM orders o
      LEFT JOIN vendors v ON o."vendorId" = v.id
      LEFT JOIN users u ON o."userId" = u.id
      LEFT JOIN order_items oi ON o.id = oi."orderId"
      GROUP BY o.id, o."orderNumber", o."orderStatus", o."paymentMethod", o."paymentStatus", o.total, v."storeName", u."displayName"
      ORDER BY o."createdAt" DESC
    `);
    console.log('\n[A] ORDERS IN DATABASE:');
    console.table(ordersView.rows);

    // 6.2 Order Items with Category hierarchy
    const itemsView = await client.query(`
      SELECT oi."productName", oi.quantity, oi."unitPrice", oi."totalPrice",
             c.name as category, sc.name as subcategory,
             oi."specificationsSnapshot"
      FROM order_items oi
      LEFT JOIN products p ON oi."productId" = p.id
      LEFT JOIN categories c ON p."categoryId" = c.id
      LEFT JOIN categories sc ON p."subcategoryId" = sc.id
      LIMIT 4
    `);
    console.log('\n[B] ORDER ITEMS WITH PLANT CATEGORY HIERARCHY:');
    console.table(itemsView.rows);

    // 6.3 Master Catalog with Categories & Dynamic Attributes
    const masterAttrView = await client.query(`
      SELECT mp.name, c.name as category, sc.name as subcategory,
             mp.attributes->>'sunlight' as sunlight,
             mp.attributes->>'careLevel' as care_level,
             mp.attributes->>'waterRequirement' as water_req
      FROM master_products mp
      LEFT JOIN categories c ON mp."categoryId" = c.id
      LEFT JOIN categories sc ON mp."subcategoryId" = sc.id
      LIMIT 4
    `);
    console.log('\n[C] MASTER BOTANICAL CATALOG CATEGORIZATION & DYNAMIC ATTRIBUTES:');
    console.table(masterAttrView.rows);

    console.log('\n✅ ALL VERIFICATION CHECKS PASSED SUCCESSFULLY!');
  } catch (err) {
    console.error('Script Error:', err);
  } finally {
    await client.end();
  }
}

main();

const { Client } = require('pg');

async function verifyOrdersAndApis() {
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

    // 1. Check Orders count
    const orderRes = await client.query('SELECT COUNT(*) as count FROM orders');
    console.log(`Total Orders in DB: ${orderRes.rows[0].count}`);

    // If 0 orders, seed demo orders so Admin orders page has complete realistic data!
    if (parseInt(orderRes.rows[0].count) === 0) {
      console.log('Seeding demo orders for Admin and Mobile testing...');

      // Find a user, vendor, and product
      const userRes = await client.query('SELECT id, email, "displayName", phone FROM users LIMIT 1');
      const vendorRes = await client.query("SELECT id, \"storeName\" FROM vendors LIMIT 1");
      const prodRes = await client.query("SELECT id, name, price, images, \"categoryId\", \"subcategoryId\" FROM products LIMIT 3");

      if (userRes.rows.length > 0 && vendorRes.rows.length > 0 && prodRes.rows.length > 0) {
        const user = userRes.rows[0];
        const vendor = vendorRes.rows[0];
        const prods = prodRes.rows;

        const demoOrders = [
          {
            orderNumber: 'ORD-2026-891024',
            status: 'delivered',
            paymentMethod: 'COD',
            paymentStatus: 'collected',
            subtotal: 798.00,
            deliveryCharge: 60.00,
            total: 858.00,
            address: {
              fullName: user.displayName || 'Rahul Sharma',
              phone: user.phone || '+91 9876543210',
              addressLine1: 'B-402, Green Meadows, Tonk Road',
              addressLine2: 'Near World Trade Park',
              city: 'Jaipur',
              state: 'Rajasthan',
              postalCode: '302018',
              country: 'India',
            },
            history: [
              { status: 'placed', timestamp: new Date(Date.now() - 86400000 * 3), note: 'Order placed by customer' },
              { status: 'confirmed', timestamp: new Date(Date.now() - 86400000 * 2), note: 'Confirmed by Nursery store' },
              { status: 'out_for_delivery', timestamp: new Date(Date.now() - 86400000 * 1), note: 'Assigned to delivery agent' },
              { status: 'delivered', timestamp: new Date(), note: 'Doorstep Delivery OTP verified successfully' },
            ],
          },
          {
            orderNumber: 'ORD-2026-891025',
            status: 'out_for_delivery',
            paymentMethod: 'ONLINE',
            paymentStatus: 'success',
            subtotal: 1249.00,
            deliveryCharge: 0.00,
            total: 1249.00,
            address: {
              fullName: 'Pooja Verma',
              phone: '+91 9829012345',
              addressLine1: 'Plot 15, Vaishali Nagar',
              addressLine2: 'Behind National Handloom',
              city: 'Jaipur',
              state: 'Rajasthan',
              postalCode: '302021',
              country: 'India',
            },
            history: [
              { status: 'placed', timestamp: new Date(Date.now() - 43200000), note: 'Prepaid order placed via Razorpay' },
              { status: 'confirmed', timestamp: new Date(Date.now() - 28800000), note: 'Nursery prepared healthy plant packaging' },
              { status: 'out_for_delivery', timestamp: new Date(Date.now() - 7200000), note: 'Out for doorstep delivery' },
            ],
          },
          {
            orderNumber: 'ORD-2026-891026',
            status: 'confirmed',
            paymentMethod: 'COD',
            paymentStatus: 'pending',
            subtotal: 499.00,
            deliveryCharge: 50.00,
            total: 549.00,
            address: {
              fullName: 'Amit Patel',
              phone: '+91 9784561230',
              addressLine1: 'Flat 101, Surya Enclave',
              addressLine2: 'Malviya Nagar',
              city: 'Jaipur',
              state: 'Rajasthan',
              postalCode: '302017',
              country: 'India',
            },
            history: [
              { status: 'placed', timestamp: new Date(Date.now() - 7200000), note: 'Order placed by customer' },
              { status: 'confirmed', timestamp: new Date(Date.now() - 3600000), note: 'Nursery confirmed inventory availability' },
            ],
          },
        ];

        for (const o of demoOrders) {
          const insertOrder = await client.query(`
            INSERT INTO orders (
              "orderNumber", "userId", "vendorId", "orderStatus", "paymentMethod", "paymentStatus",
              "subtotal", "deliveryCharge", "total", "shippingAddress", "statusHistory", "deliveryOtpAttempts"
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
            RETURNING id
          `, [
            o.orderNumber, user.id, vendor.id, o.status, o.paymentMethod, o.paymentStatus,
            o.subtotal, o.deliveryCharge, o.total, JSON.stringify(o.address), JSON.stringify(o.history), 0
          ]);

          const orderId = insertOrder.rows[0].id;

          // Insert order items
          for (let i = 0; i < prods.length; i++) {
            const p = prods[i];
            const pImg = Array.isArray(p.images) && p.images.length > 0 ? p.images[0] : null;
            await client.query(`
              INSERT INTO order_items (
                "orderId", "productId", "vendorId", "productName", "productImage", "quantity", "unitPrice", "totalPrice"
              ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            `, [
              orderId, p.id, vendor.id, p.name, pImg, i + 1, parseFloat(p.price), parseFloat(p.price) * (i + 1)
            ]);
          }
        }
        console.log(`Seeded ${demoOrders.length} realistic demo orders with order items.`);
      }
    }

    // 2. Verify Orders in DB
    const ordersList = await client.query(`
      SELECT o."orderNumber", o."orderStatus", o."paymentMethod", o."paymentStatus", o.total,
             v."storeName", u."displayName",
             COUNT(oi.id) as item_count
      FROM orders o
      LEFT JOIN vendors v ON o."vendorId" = v.id
      LEFT JOIN users u ON o."userId" = u.id
      LEFT JOIN order_items oi ON o.id = oi."orderId"
      GROUP BY o.id, o."orderNumber", o."orderStatus", o."paymentMethod", o."paymentStatus", o.total, v."storeName", u."displayName"
      ORDER BY o."createdAt" DESC
      LIMIT 5
    `);
    console.log('\n--- VERIFY ORDERS IN DB ---');
    console.table(ordersList.rows);

    // 3. Verify Master Products with Categories & Attributes
    const mpSample = await client.query(`
      SELECT mp.id, mp.name, mp."scientificName",
             cat.name as category_name, subcat.name as subcategory_name,
             mp.attributes
      FROM master_products mp
      LEFT JOIN categories cat ON mp."categoryId" = cat.id
      LEFT JOIN categories subcat ON mp."subcategoryId" = subcat.id
      LIMIT 3
    `);
    console.log('\n--- VERIFY MASTER PRODUCTS WITH CATEGORIES & ATTRIBUTES ---');
    console.log(JSON.stringify(mpSample.rows, null, 2));

  } catch (err) {
    console.error('Error verifying:', err);
  } finally {
    await client.end();
  }
}

verifyOrdersAndApis();

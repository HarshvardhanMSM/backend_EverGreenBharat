const { Client } = require('pg');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcrypt');

// Load environment variables from .env
const envPath = path.resolve(__dirname, '../.env');
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

const config = {
  host: process.env.DB_HOST || envVars.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || envVars.DB_PORT || '5432', 10),
  user: process.env.DB_USERNAME || envVars.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || envVars.DB_PASSWORD || 'root',
  database: process.env.DB_DATABASE || envVars.DB_DATABASE || 'nursery_db',
  superAdminEmail: (process.env.SUPERADMIN_EMAIL || envVars.SUPERADMIN_EMAIL || 'admin@stream.com').toLowerCase().trim(),
  superAdminPassword: process.env.SUPERADMIN_PASSWORD || envVars.SUPERADMIN_PASSWORD || 'Admin@123456',
  staffEmail: (process.env.STAFF_EMAIL || envVars.STAFF_EMAIL || 'staff@nursery.com').toLowerCase().trim(),
  staffPassword: process.env.STAFF_PASSWORD || envVars.STAFF_PASSWORD || 'Staff@123456',
  staffRoleCode: (process.env.STAFF_ROLE || envVars.STAFF_ROLE || 'ADMIN').toUpperCase().trim(),
};

async function deleteIfExists(client, tableName, whereClause, params = []) {
  const check = await client.query(`SELECT to_regclass($1) as reg`, [`public.${tableName}`]);
  if (check.rows[0]?.reg) {
    const res = await client.query(`DELETE FROM "${tableName}" WHERE ${whereClause}`, params);
    return res.rowCount || 0;
  }
  return 0;
}

async function cleanDemoData() {
  console.log('================================================================');
  console.log('       NURSERY PLATFORM - PRODUCTION DATA INITIALIZER & CLEANER ');
  console.log('================================================================');
  console.log(`Connecting to PostgreSQL database "${config.database}" on ${config.host}:${config.port}...`);

  const client = new Client({
    host: config.host,
    port: config.port,
    user: config.user,
    password: config.password,
    database: config.database,
  });

  await client.connect();
  console.log('Database connected successfully.\n');

  try {
    await client.query('BEGIN');

    // Known demo emails, slugs, and identifiers
    const demoAdminEmails = [
      'admin@nursery.com',
      'finance@nursery.com',
      'moderator@nursery.com',
      'operations@nursery.com',
    ].filter(e => e !== config.superAdminEmail && e !== config.staffEmail);

    const demoUserEmails = [
      'anita.plantlover@gmail.com',
      'rahul.gardener@gmail.com',
      'vendor.oasis@nursery.com',
      'vendor.flora@nursery.com',
      'vendor.roots@nursery.com',
      'vendor.bonsai@nursery.com',
      'priya.green@stream.com',
      'kenji.bonsai@stream.com',
      'priya.greenthumb@greenarmy.in',
      'rohan.bonsai@greenarmy.in',
      'dr.shalini@greenarmy.in',
    ];

    const demoVendorSlugs = [
      'green-oasis-nursery',
      'flora-paradise',
      'urban-roots',
      'bonsai-heaven',
    ];

    const demoInquiryEmails = [
      'rajesh.kumar@techpark.in',
      'facilities@techpark.in',
      'meera.sengupta@hyatt.com',
      'landscaping@grandheritage.com',
      'vikram@greenspaces.design',
      'admin@stjude.edu.in',
    ];

    console.log('1. Purging demo orders & order items...');
    await deleteIfExists(
      client,
      'order_items',
      `"orderId" IN (
        SELECT id FROM "orders" 
        WHERE "orderNumber" LIKE 'ORD-2026%'
           OR "userId" IN (SELECT id FROM "users" WHERE email = ANY($1))
      )`,
      [demoUserEmails]
    );

    const ordersDeleted = await deleteIfExists(
      client,
      'orders',
      `"orderNumber" LIKE 'ORD-2026%' OR "userId" IN (SELECT id FROM "users" WHERE email = ANY($1))`,
      [demoUserEmails]
    );
    console.log(`   Deleted ${ordersDeleted} demo orders.`);

    console.log('2. Purging demo cart items & payments...');
    await deleteIfExists(
      client,
      'payments',
      `"orderId" IN (
        SELECT id FROM "orders" 
        WHERE "orderNumber" LIKE 'ORD-2026%'
           OR "userId" IN (SELECT id FROM "users" WHERE email = ANY($1))
      )`,
      [demoUserEmails]
    );
    await deleteIfExists(
      client,
      'cart_items',
      `"cartId" IN (SELECT id FROM "carts" WHERE "userId" IN (SELECT id FROM "users" WHERE email = ANY($1)))`,
      [demoUserEmails]
    );
    await deleteIfExists(
      client,
      'carts',
      `"userId" IN (SELECT id FROM "users" WHERE email = ANY($1))`,
      [demoUserEmails]
    );

    console.log('3. Purging demo institutional inquiries...');
    const inquiriesDeleted = await deleteIfExists(
      client,
      'institutional_inquiries',
      `email = ANY($1) OR "companyName" IN ('TechPark SEZ Pune', 'The Grand Heritage Hotel', 'St. Jude Academy')`,
      [demoInquiryEmails]
    );
    console.log(`   Deleted ${inquiriesDeleted} demo inquiries.`);

    console.log('4. Purging demo community & influencer content (posts, likes, follows, reports)...');
    await deleteIfExists(
      client,
      'content_reports',
      `"reportedBy" IN (SELECT id FROM "users" WHERE email = ANY($1)) OR "reportedUserId" IN (SELECT id FROM "users" WHERE email = ANY($1))`,
      [demoUserEmails]
    );
    await deleteIfExists(
      client,
      'post_likes',
      `"userId" IN (SELECT id FROM "users" WHERE email = ANY($1))`,
      [demoUserEmails]
    );
    await deleteIfExists(
      client,
      'influencer_follows',
      `"followerUserId" IN (SELECT id FROM "users" WHERE email = ANY($1)) OR "followingInfluencerId" IN (SELECT id FROM "influencer_profiles" WHERE "userId" IN (SELECT id FROM "users" WHERE email = ANY($1)))`,
      [demoUserEmails]
    );
    await deleteIfExists(
      client,
      'influencer_posts',
      `"influencerId" IN (SELECT id FROM "influencer_profiles" WHERE "userId" IN (SELECT id FROM "users" WHERE email = ANY($1)))`,
      [demoUserEmails]
    );
    const influencersDeleted = await deleteIfExists(
      client,
      'influencer_profiles',
      `"userId" IN (SELECT id FROM "users" WHERE email = ANY($1))`,
      [demoUserEmails]
    );
    console.log(`   Deleted ${influencersDeleted} demo influencer profiles.`);

    console.log('5. Purging demo vendor products...');
    const productsDeleted = await deleteIfExists(
      client,
      'products',
      `"vendorId" IN (
        SELECT id FROM "vendors" 
        WHERE "storeSlug" = ANY($1) 
           OR "userId" IN (SELECT id FROM "users" WHERE email = ANY($2))
      )`,
      [demoVendorSlugs, demoUserEmails]
    );
    console.log(`   Deleted ${productsDeleted} demo products.`);

    console.log('6. Purging demo vendors...');
    const vendorsDeleted = await deleteIfExists(
      client,
      'vendors',
      `"storeSlug" = ANY($1) OR "userId" IN (SELECT id FROM "users" WHERE email = ANY($2))`,
      [demoVendorSlugs, demoUserEmails]
    );
    console.log(`   Deleted ${vendorsDeleted} demo vendors.`);

    console.log('7. Purging demo user accounts...');
    const usersDeleted = await deleteIfExists(client, 'users', `email = ANY($1)`, [demoUserEmails]);
    console.log(`   Deleted ${usersDeleted} demo user accounts.`);

    console.log('8. Purging extra demo admin accounts...');
    await client.query(`
      DELETE FROM admin_roles 
      WHERE admin_id IN (
        SELECT id FROM admins 
        WHERE email = ANY($1) 
          AND email != $2 
          AND email != $3
      )
    `, [demoAdminEmails, config.superAdminEmail, config.staffEmail]);

    const deletedAdmins = await client.query(`
      DELETE FROM admins 
      WHERE email = ANY($1) 
        AND email != $2 
        AND email != $3
      RETURNING id, email
    `, [demoAdminEmails, config.superAdminEmail, config.staffEmail]);
    console.log(`   Deleted ${deletedAdmins.rowCount} extra demo admin accounts.`);

    console.log('9. Cleaning up demo login history & orphaned audit logs...');
    await deleteIfExists(client, 'login_history', `email = ANY($1) OR email = ANY($2)`, [demoUserEmails, demoAdminEmails]);
    await client.query(`DELETE FROM audit_logs WHERE "adminId" NOT IN (SELECT id FROM admins)`);

    console.log('\n10. Ensuring Production Super Admin & Main Staff accounts...');

    // Fetch Super Admin role
    const superAdminRoleRes = await client.query(`SELECT id, code FROM roles WHERE code = 'SUPER_ADMIN'`);
    if (superAdminRoleRes.rows.length === 0) {
      throw new Error("Required role 'SUPER_ADMIN' not found. Please ensure RBAC seeders have run.");
    }
    const superAdminRoleId = superAdminRoleRes.rows[0].id;

    // Fetch or verify Staff role
    let staffRoleRes = await client.query(`SELECT id, code FROM roles WHERE code = $1`, [config.staffRoleCode]);
    if (staffRoleRes.rows.length === 0) {
      staffRoleRes = await client.query(`SELECT id, code FROM roles WHERE code = 'ADMIN'`);
    }
    const staffRoleId = staffRoleRes.rows[0]?.id || superAdminRoleId;

    const salt = await bcrypt.genSalt(10);
    const superAdminHashedPassword = await bcrypt.hash(config.superAdminPassword, salt);
    const staffHashedPassword = await bcrypt.hash(config.staffPassword, salt);

    // 10a. Ensure Super Admin
    let superAdmin = await client.query(`SELECT id, email FROM admins WHERE email = $1`, [config.superAdminEmail]);
    let superAdminId;
    if (superAdmin.rows.length === 0) {
      const inserted = await client.query(`
        INSERT INTO admins (
          id, "createdAt", "updatedAt", email, username, password, "displayName",
          "isSuperAdmin", department, status, "failedLoginAttempts"
        ) VALUES (
          gen_random_uuid(), NOW(), NOW(), $1, 'super_admin', $2, 'Platform Super Administrator',
          true, 'Executive Platform Operations', 'ACTIVE', 0
        ) RETURNING id
      `, [config.superAdminEmail, superAdminHashedPassword]);
      superAdminId = inserted.rows[0].id;
      console.log(`   [+] Created Super Admin: ${config.superAdminEmail}`);
    } else {
      superAdminId = superAdmin.rows[0].id;
      await client.query(`
        UPDATE admins 
        SET "isSuperAdmin" = true, status = 'ACTIVE', "failedLoginAttempts" = 0, "lockoutUntil" = NULL, department = 'Executive Platform Operations'
        WHERE id = $1
      `, [superAdminId]);
      console.log(`   [*] Verified Super Admin: ${config.superAdminEmail}`);
    }

    // Link Super Admin role
    await client.query(`
      INSERT INTO admin_roles (admin_id, role_id, created_at)
      VALUES ($1, $2, NOW())
      ON CONFLICT DO NOTHING
    `, [superAdminId, superAdminRoleId]);

    // 10b. Ensure Main Staff Account
    let staff = await client.query(`SELECT id, email FROM admins WHERE email = $1`, [config.staffEmail]);
    let staffId;
    if (staff.rows.length === 0) {
      const inserted = await client.query(`
        INSERT INTO admins (
          id, "createdAt", "updatedAt", email, username, password, "displayName",
          "isSuperAdmin", department, status, "failedLoginAttempts"
        ) VALUES (
          gen_random_uuid(), NOW(), NOW(), $1, 'main_staff', $2, 'Main Operations Staff',
          false, 'Operations & Store Management', 'ACTIVE', 0
        ) RETURNING id
      `, [config.staffEmail, staffHashedPassword]);
      staffId = inserted.rows[0].id;
      console.log(`   [+] Created Main Staff: ${config.staffEmail}`);
    } else {
      staffId = staff.rows[0].id;
      await client.query(`
        UPDATE admins 
        SET status = 'ACTIVE', "isSuperAdmin" = false, "failedLoginAttempts" = 0, "lockoutUntil" = NULL, department = 'Operations & Store Management'
        WHERE id = $1
      `, [staffId]);
      console.log(`   [*] Verified Main Staff: ${config.staffEmail}`);
    }

    // Link Staff role
    await client.query(`
      INSERT INTO admin_roles (admin_id, role_id, created_at)
      VALUES ($1, $2, NOW())
      ON CONFLICT DO NOTHING
    `, [staffId, staffRoleId]);

    // Prune any other admins that are neither superAdmin nor staff
    await client.query(`DELETE FROM admin_roles WHERE admin_id NOT IN ($1, $2)`, [superAdminId, staffId]);
    await client.query(`DELETE FROM admins WHERE id NOT IN ($1, $2)`, [superAdminId, staffId]);

    await client.query('COMMIT');

    console.log('\n================================================================');
    console.log('              CLEANUP & INITIALIZATION SUCCESSFUL!              ');
    console.log('================================================================');
    console.log('All dummy/demo data has been purged successfully.');
    console.log('The database now contains ONLY 2 administrative accounts:');
    console.log(`  1. Super Admin: ${config.superAdminEmail} (Role: SUPER_ADMIN)`);
    console.log(`  2. Main Staff:  ${config.staffEmail} (Role: ${config.staffRoleCode})`);
    console.log('Master plant catalog and essential categories remain intact.\n');

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error during demo data cleanup:', err);
    throw err;
  } finally {
    await client.end();
  }
}

cleanDemoData().catch(err => {
  console.error('Fatal error:', err.message);
  process.exit(1);
});

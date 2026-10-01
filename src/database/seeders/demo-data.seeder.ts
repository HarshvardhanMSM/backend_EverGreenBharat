import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { User } from '../../modules/users/entities/user.entity';
import { Admin, AdminStatus } from '../../modules/admin/entities/admin.entity';
import { Role } from '../../modules/rbac/entities/role.entity';
import { AdminRoleEntity } from '../../modules/rbac/entities/admin-role.entity';
import { AuditLog } from '../../modules/audit/entities/audit-log.entity';
import {
  LoginHistory,
  LoginStatus,
} from '../../modules/auth/entities/login-history.entity';

// Nursery Entities
import { MasterProduct } from '../../modules/master-products/entities/master-product.entity';
import { Vendor } from '../../modules/vendors/entities/vendor.entity';
import { Product } from '../../modules/products/entities/product.entity';
import { Order } from '../../modules/orders/entities/order.entity';
import { OrderItem } from '../../modules/orders/entities/order-item.entity';
import { InstitutionalInquiry } from '../../modules/inquiries/entities/institutional-inquiry.entity';
import { InfluencerProfile } from '../../modules/influencers/entities/influencer-profile.entity';
import { Post } from '../../modules/influencers/entities/post.entity';
import { NotificationTemplate } from '../../modules/notifications/entities/notification-template.entity';

import { UserStatus } from '../../common/enums/user-status.enum';
import { VerificationStatus } from '../../common/enums/verification-status.enum';
import { AdminRole } from '../../common/enums/admin-role.enum';
import { HashUtil } from '../../common/utils/hash.util';

// Nursery Enums
import {
  ApprovalStatus,
  MasterProductSource,
  MasterProductStatus,
  ProductStatus,
  OrderStatus,
  PaymentStatus,
  PaymentMethod,
  InquiryStatus,
  PostStatus,
  PostMediaType,
} from '../../common/enums/nursery.enums';

@Injectable()
export class DemoDataSeeder implements OnModuleInit {
  private readonly logger = new Logger(DemoDataSeeder.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Admin)
    private readonly adminRepository: Repository<Admin>,
    @InjectRepository(Role)
    private readonly roleRepository: Repository<Role>,
    @InjectRepository(AdminRoleEntity)
    private readonly adminRoleRepository: Repository<AdminRoleEntity>,
    @InjectRepository(AuditLog)
    private readonly auditLogRepository: Repository<AuditLog>,
    @InjectRepository(LoginHistory)
    private readonly loginHistoryRepository: Repository<LoginHistory>,

    // Nursery Repositories
    @InjectRepository(MasterProduct)
    private readonly masterProductRepository: Repository<MasterProduct>,
    @InjectRepository(Vendor)
    private readonly vendorRepository: Repository<Vendor>,
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    @InjectRepository(OrderItem)
    private readonly orderItemRepository: Repository<OrderItem>,
    @InjectRepository(InstitutionalInquiry)
    private readonly inquiryRepository: Repository<InstitutionalInquiry>,
    @InjectRepository(InfluencerProfile)
    private readonly influencerProfileRepository: Repository<InfluencerProfile>,
    @InjectRepository(Post)
    private readonly postRepository: Repository<Post>,
    @InjectRepository(NotificationTemplate)
    private readonly templateRepository: Repository<NotificationTemplate>,
  ) {}

  async onModuleInit() {
    try {
      setTimeout(async () => {
        const isProduction =
          process.env.NODE_ENV === 'production' ||
          process.env.PURGE_DEMO_DATA === 'true';

        if (isProduction) {
          await this.purgeDemoDataAndSeedProductionStaff();
        } else {
          if (process.env.SKIP_DEMO_DATA === 'true') {
            this.logger.log('SKIP_DEMO_DATA is set. Skipping demo data seeding.');
            return;
          }
          await this.seedAllDemoData();
        }
      }, 1000);
    } catch (err: any) {
      this.logger.warn(`DemoDataSeeder deferred: ${err?.message || err}`);
    }
  }

  /**
   * Production Initialization & Dummy Data Cleanup:
   * When NODE_ENV=production or PURGE_DEMO_DATA=true:
   * - Purges all mock orders, inquiries, vendor products, vendors, customers, and mock influencer content.
   * - Ensures ONLY 2 active staff accounts exist:
   *     1. Super Admin (email via SUPERADMIN_EMAIL or default admin@stream.com)
   *     2. Main Staff (email via STAFF_EMAIL or default staff@nursery.com)
   * - Deletes any other admin accounts from database.
   * - Preserves botanical master product catalog and essential categories.
   */
  public async purgeDemoDataAndSeedProductionStaff() {
    this.logger.log(
      '[Production Mode Detected] Checking and purging dummy/demo marketplace data from database...',
    );

    const superAdminEmail = (
      process.env.SUPERADMIN_EMAIL || 'admin@stream.com'
    )
      .toLowerCase()
      .trim();
    const superAdminPassword =
      process.env.SUPERADMIN_PASSWORD || 'Admin@123456';
    const staffEmail = (process.env.STAFF_EMAIL || 'staff@nursery.com')
      .toLowerCase()
      .trim();
    const staffPassword = process.env.STAFF_PASSWORD || 'Staff@123456';
    const staffRoleCode = (
      process.env.STAFF_ROLE || AdminRole.ADMIN
    )
      .toUpperCase()
      .trim();

    const demoAdminEmails = [
      'admin@nursery.com',
      'finance@nursery.com',
      'moderator@nursery.com',
      'operations@nursery.com',
    ].filter((e) => e !== superAdminEmail && e !== staffEmail);

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

    const query = (sql: string, params: any[] = []) =>
      this.adminRepository.query(sql, params);

    const safeDelete = async (
      tableName: string,
      whereClause: string,
      params: any[] = [],
    ) => {
      try {
        const check = await query(`SELECT to_regclass($1) as reg`, [
          `public.${tableName}`,
        ]);
        if (check[0]?.reg) {
          return await query(
            `DELETE FROM "${tableName}" WHERE ${whereClause}`,
            params,
          );
        }
      } catch (err: any) {
        this.logger.warn(`Safe delete skipped for ${tableName}: ${err?.message || err}`);
      }
    };

    // 1. Purge Demo Orders & Items
    await safeDelete(
      'order_items',
      `"orderId" IN (SELECT id FROM "orders" WHERE "orderNumber" LIKE 'ORD-2026%' OR "userId" IN (SELECT id FROM "users" WHERE email = ANY($1)))`,
      [demoUserEmails],
    );
    await safeDelete(
      'orders',
      `"orderNumber" LIKE 'ORD-2026%' OR "userId" IN (SELECT id FROM "users" WHERE email = ANY($1))`,
      [demoUserEmails],
    );

    // 2. Purge Demo Carts & Payments
    await safeDelete(
      'payments',
      `"orderId" IN (SELECT id FROM "orders" WHERE "orderNumber" LIKE 'ORD-2026%' OR "userId" IN (SELECT id FROM "users" WHERE email = ANY($1)))`,
      [demoUserEmails],
    );
    await safeDelete(
      'cart_items',
      `"cartId" IN (SELECT id FROM "carts" WHERE "userId" IN (SELECT id FROM "users" WHERE email = ANY($1)))`,
      [demoUserEmails],
    );
    await safeDelete(
      'carts',
      `"userId" IN (SELECT id FROM "users" WHERE email = ANY($1))`,
      [demoUserEmails],
    );

    // 3. Purge Demo Inquiries
    await safeDelete(
      'institutional_inquiries',
      `email = ANY($1) OR "companyName" IN ('TechPark SEZ Pune', 'The Grand Heritage Hotel', 'St. Jude Academy')`,
      [demoInquiryEmails],
    );

    // 4. Purge Demo Community & Influencers
    await safeDelete(
      'content_reports',
      `"reportedBy" IN (SELECT id FROM "users" WHERE email = ANY($1)) OR "reportedUserId" IN (SELECT id FROM "users" WHERE email = ANY($1))`,
      [demoUserEmails],
    );
    await safeDelete(
      'post_likes',
      `"userId" IN (SELECT id FROM "users" WHERE email = ANY($1))`,
      [demoUserEmails],
    );
    await safeDelete(
      'influencer_follows',
      `"followerUserId" IN (SELECT id FROM "users" WHERE email = ANY($1)) OR "followingInfluencerId" IN (SELECT id FROM "influencer_profiles" WHERE "userId" IN (SELECT id FROM "users" WHERE email = ANY($1)))`,
      [demoUserEmails],
    );
    await safeDelete(
      'influencer_posts',
      `"influencerId" IN (SELECT id FROM "influencer_profiles" WHERE "userId" IN (SELECT id FROM "users" WHERE email = ANY($1)))`,
      [demoUserEmails],
    );
    await safeDelete(
      'influencer_profiles',
      `"userId" IN (SELECT id FROM "users" WHERE email = ANY($1))`,
      [demoUserEmails],
    );

    // 5. Purge Demo Products & Vendors
    await safeDelete(
      'products',
      `"vendorId" IN (SELECT id FROM "vendors" WHERE "storeSlug" = ANY($1) OR "userId" IN (SELECT id FROM "users" WHERE email = ANY($2)))`,
      [demoVendorSlugs, demoUserEmails],
    );
    await safeDelete(
      'vendors',
      `"storeSlug" = ANY($1) OR "userId" IN (SELECT id FROM "users" WHERE email = ANY($2))`,
      [demoVendorSlugs, demoUserEmails],
    );

    // 6. Purge Demo Users
    await safeDelete('users', `email = ANY($1)`, [demoUserEmails]);

    // 7. Purge Extra Demo Admins
    await safeDelete(
      'admin_roles',
      `admin_id IN (SELECT id FROM admins WHERE email = ANY($1) AND email != $2 AND email != $3)`,
      [demoAdminEmails, superAdminEmail, staffEmail],
    );
    await safeDelete(
      'admins',
      `email = ANY($1) AND email != $2 AND email != $3`,
      [demoAdminEmails, superAdminEmail, staffEmail],
    );

    // 8. Clean up Login History & Audit Logs
    await safeDelete('login_history', `email = ANY($1) OR email = ANY($2)`, [
      demoUserEmails,
      demoAdminEmails,
    ]);
    await safeDelete('audit_logs', `"adminId" NOT IN (SELECT id FROM admins)`);

    // 9. Ensure Super Admin
    const superAdminRole = await this.roleRepository.findOne({
      where: { code: AdminRole.SUPER_ADMIN },
    });
    if (!superAdminRole) {
      this.logger.error('Super Admin role not found. RBAC permissions must be seeded first.');
      return;
    }

    let superAdmin = await this.adminRepository.findOne({
      where: { email: superAdminEmail },
    });
    const superHashed = await HashUtil.hashPassword(superAdminPassword);
    if (!superAdmin) {
      superAdmin = this.adminRepository.create({
        email: superAdminEmail,
        username: 'super_admin',
        password: superHashed,
        displayName: 'Platform Super Administrator',
        isSuperAdmin: true,
        department: 'Executive Platform Operations',
        status: AdminStatus.ACTIVE,
        failedLoginAttempts: 0,
      });
      superAdmin = await this.adminRepository.save(superAdmin);
      this.logger.log(`[Production] Created Super Admin account: ${superAdminEmail}`);
    } else {
      superAdmin.isSuperAdmin = true;
      superAdmin.status = AdminStatus.ACTIVE;
      superAdmin.failedLoginAttempts = 0;
      superAdmin.lockoutUntil = null;
      superAdmin.department = 'Executive Platform Operations';
      await this.adminRepository.save(superAdmin);
      this.logger.log(`[Production] Verified Super Admin account: ${superAdminEmail}`);
    }

    // Link Super Admin role (idempotent)
    const superAdminLink = await this.adminRoleRepository.findOne({
      where: { adminId: superAdmin.id, roleId: superAdminRole.id },
    });
    if (!superAdminLink) {
      await this.adminRoleRepository.save(
        this.adminRoleRepository.create({
          adminId: superAdmin.id,
          roleId: superAdminRole.id,
        }),
      );
    }

    // 10. Ensure Main Staff Account
    let staffRole = await this.roleRepository.findOne({
      where: { code: staffRoleCode as any },
    });
    if (!staffRole) {
      staffRole = await this.roleRepository.findOne({
        where: { code: AdminRole.ADMIN },
      });
    }
    const targetStaffRoleId = staffRole?.id || superAdminRole.id;

    let staff = await this.adminRepository.findOne({
      where: { email: staffEmail },
    });
    const staffHashed = await HashUtil.hashPassword(staffPassword);
    if (!staff) {
      staff = this.adminRepository.create({
        email: staffEmail,
        username: 'main_staff',
        password: staffHashed,
        displayName: 'Main Operations Staff',
        isSuperAdmin: false,
        department: 'Operations & Store Management',
        status: AdminStatus.ACTIVE,
        failedLoginAttempts: 0,
      });
      staff = await this.adminRepository.save(staff);
      this.logger.log(`[Production] Created Main Staff account: ${staffEmail}`);
    } else {
      staff.status = AdminStatus.ACTIVE;
      staff.isSuperAdmin = false;
      staff.failedLoginAttempts = 0;
      staff.lockoutUntil = null;
      staff.department = 'Operations & Store Management';
      await this.adminRepository.save(staff);
      this.logger.log(`[Production] Verified Main Staff account: ${staffEmail}`);
    }

    // Link Staff role (idempotent)
    const staffLink = await this.adminRoleRepository.findOne({
      where: { adminId: staff.id, roleId: targetStaffRoleId },
    });
    if (!staffLink) {
      await this.adminRoleRepository.save(
        this.adminRoleRepository.create({
          adminId: staff.id,
          roleId: targetStaffRoleId,
        }),
      );
    }

    // Ensure any remaining third-party/demo admins are pruned
    await query(`DELETE FROM admin_roles WHERE admin_id NOT IN ($1, $2)`, [
      superAdmin.id,
      staff.id,
    ]);
    await query(`DELETE FROM admins WHERE id NOT IN ($1, $2)`, [
      superAdmin.id,
      staff.id,
    ]);

    // Ensure production notification templates are available
    await this.seedProductionNotificationTemplates();

    this.logger.log('================================================================');
    this.logger.log('[Production Mode] Production initialization & dummy data cleanup complete.');
    this.logger.log(`[Production Mode] Super Admin: ${superAdminEmail} (SUPER_ADMIN)`);
    this.logger.log(`[Production Mode] Main Staff:  ${staffEmail} (${staffRole?.code || 'ADMIN'})`);
    this.logger.log('================================================================');
  }

  private async seedProductionNotificationTemplates() {
    const existingTemplates = await this.templateRepository.count();
    if (existingTemplates === 0) {
      this.logger.log('Seeding production notification email templates...');
      const templates = [
        {
          templateKey: 'order_placed_customer',
          name: 'Order Confirmation to Customer',
          channel: 'email' as const,
          subject: 'Your Nursery Order #{{orderNumber}} has been placed! 🌿',
          bodyHtml:
            '<div style="font-family:sans-serif;padding:20px;"><h2>Order Confirmed!</h2><p>Hi {{customerName}}, thank you for ordering from {{storeName}}. Your plants are being carefully prepped for dispatch.</p><p>Total Amount: <strong>₹{{totalAmount}}</strong></p></div>',
          bodyText:
            'Your order #{{orderNumber}} is confirmed with {{storeName}} for ₹{{totalAmount}}.',
          availableVariables: [
            'customerName',
            'orderNumber',
            'storeName',
            'totalAmount',
          ],
          isActive: true,
        },
        {
          templateKey: 'order_out_for_delivery',
          name: 'Order Out For Delivery (with OTP)',
          channel: 'email' as const,
          subject: 'Your Plants are Out for Delivery! 🚚 Share OTP {{otp}}',
          bodyHtml:
            '<div style="font-family:sans-serif;padding:20px;"><h2>Your Plants are on the way!</h2><p>Hi {{customerName}}, your order #{{orderNumber}} is out for delivery with our executive.</p><div style="background:#f0fdf4;border:2px dashed #16a34a;padding:16px;text-align:center;font-size:24px;letter-spacing:4px;font-weight:bold;color:#15803d;">{{otp}}</div><p>Please share this OTP at doorstep upon inspecting your plants.</p></div>',
          bodyText:
            'Order #{{orderNumber}} is out for delivery. Share OTP {{otp}} at doorstep.',
          availableVariables: [
            'customerName',
            'orderNumber',
            'otp',
            'deliveryExecutiveName',
          ],
          isActive: true,
        },
        {
          templateKey: 'order_delivered',
          name: 'Order Delivered Successfully',
          channel: 'email' as const,
          subject: 'Delivered! Welcome your new green companions 🪴',
          bodyHtml:
            '<div style="font-family:sans-serif;padding:20px;"><h2>Delivered Successfully!</h2><p>Hi {{customerName}}, your plants from #{{orderNumber}} have been safely delivered. Check out our plant care guide in the app.</p></div>',
          bodyText:
            'Order #{{orderNumber}} delivered. Enjoy your green companions!',
          availableVariables: ['customerName', 'orderNumber'],
          isActive: true,
        },
        {
          templateKey: 'inquiry_status_updated',
          name: 'B2B Inquiry Status Update',
          channel: 'email' as const,
          subject: 'Update on your Institutional Plant Inquiry - {{companyName}}',
          bodyHtml:
            '<div style="font-family:sans-serif;padding:20px;"><h2>Inquiry Status Update</h2><p>Dear {{contactName}}, your inquiry for {{companyName}} has moved to status: <strong>{{status}}</strong>.</p><p>{{notes}}</p></div>',
          bodyText:
            'Inquiry update for {{companyName}}: Status is {{status}}.',
          availableVariables: [
            'contactName',
            'companyName',
            'status',
            'notes',
            'quotedAmount',
          ],
          isActive: true,
        },
      ];

      for (const t of templates) {
        await this.templateRepository.save(this.templateRepository.create(t));
      }
    }
  }

  private async seedAllDemoData() {
    this.logger.log('Starting Nursery Marketplace demo data seeding...');

    const defaultPassword = await HashUtil.hashPassword('Admin@123456');

    // 1. Seed Operational Admins for Nursery Marketplace
    const adminAccounts = [
      {
        email: 'admin@stream.com',
        username: 'super_admin',
        displayName: 'Platform Administrator',
        roleCode: AdminRole.SUPER_ADMIN,
        dept: 'Executive & Platform Operations',
      },
      {
        email: 'admin@nursery.com',
        username: 'nursery_admin',
        displayName: 'Nursery Lead Administrator',
        roleCode: AdminRole.SUPER_ADMIN,
        dept: 'Marketplace Operations',
      },
      {
        email: 'finance@nursery.com',
        username: 'nursery_finance',
        displayName: 'Finance & Payouts Lead',
        roleCode: AdminRole.FINANCE_MANAGER,
        dept: 'Vendor Payouts & Accounting',
      },
      {
        email: 'moderator@nursery.com',
        username: 'nursery_moderator',
        displayName: 'Community Moderator',
        roleCode: AdminRole.MODERATOR,
        dept: 'Green Army Trust & Safety',
      },
      {
        email: 'operations@nursery.com',
        username: 'nursery_ops',
        displayName: 'Fulfillment & Logistics Lead',
        roleCode: AdminRole.CREATOR_MANAGER,
        dept: 'Logistics & Doorstep Delivery',
      },
    ];

    const seededAdmins: Record<string, Admin> = {};

    for (const admDef of adminAccounts) {
      let admin = await this.adminRepository.findOne({
        where: { email: admDef.email },
      });
      if (!admin) {
        admin = this.adminRepository.create({
          email: admDef.email,
          username: admDef.username,
          password: defaultPassword,
          displayName: admDef.displayName,
          isSuperAdmin: admDef.roleCode === AdminRole.SUPER_ADMIN,
          department: admDef.dept,
          status: AdminStatus.ACTIVE,
        });
        admin = await this.adminRepository.save(admin);
      }
      seededAdmins[admDef.roleCode] = admin;

      const role = await this.roleRepository.findOne({
        where: { code: admDef.roleCode },
      });
      if (role) {
        const link = await this.adminRoleRepository.findOne({
          where: { adminId: admin.id, roleId: role.id },
        });
        if (!link) {
          await this.adminRoleRepository.save(
            this.adminRoleRepository.create({
              adminId: admin.id,
              roleId: role.id,
            }),
          );
        }
      }
    }

    const superAdmin = seededAdmins[AdminRole.SUPER_ADMIN];

    // 2. Seed Nursery Plant Customers with Delivery Addresses
    const customersData = [
      {
        email: 'anita.plantlover@gmail.com',
        username: 'anita_desai',
        displayName: 'Anita Desai',
        bio: 'Balcony urban gardener & rare foliage plant collector in Pune.',
        phone: '+919822334455',
        addresses: [
          {
            id: 'addr-anita-1',
            fullName: 'Anita Desai',
            phone: '+919822334455',
            addressLine1: 'Flat 402, Green Meadows, Model Colony',
            addressLine2: 'Near Deep Bungalow Chowk',
            city: 'Pune',
            state: 'Maharashtra',
            postalCode: '411016',
            isDefault: true,
          },
        ],
      },
      {
        email: 'rahul.gardener@gmail.com',
        username: 'rahul_sharma',
        displayName: 'Rahul Sharma',
        bio: 'Indoor air purifying plants enthusiast & terrace landscape hobbyist.',
        phone: '+919811223344',
        addresses: [
          {
            id: 'addr-rahul-1',
            fullName: 'Rahul Sharma',
            phone: '+919811223344',
            addressLine1: '12 Palm Grove, Bandra West',
            addressLine2: 'Linking Road',
            city: 'Mumbai',
            state: 'Maharashtra',
            postalCode: '400050',
            isDefault: true,
          },
        ],
      },
    ];

    const seededCustomers: User[] = [];

    for (const cData of customersData) {
      let user = await this.userRepository.findOne({
        where: { email: cData.email },
      });
      if (!user) {
        user = this.userRepository.create({
          email: cData.email,
          username: cData.username,
          password: defaultPassword,
          displayName: cData.displayName,
          status: UserStatus.ACTIVE,
          verificationStatus: VerificationStatus.VERIFIED,
          bio: cData.bio,
          phone: cData.phone,
          addresses: cData.addresses,
          isEmailVerified: true,
          isPhoneVerified: true,
        });
        user = await this.userRepository.save(user);
      }
      seededCustomers.push(user);
    }

    // 3. Seed Nursery Marketplace Ecosystem (Catalog, Vendors, Products, Orders, Inquiries, Green Army)
    await this.seedNurseryDemoData(seededCustomers);

    // 4. Seed Nursery Audit Logs
    const existingAudit = await this.auditLogRepository.count();
    if (existingAudit === 0 && superAdmin) {
      this.logger.log('Seeding Nursery platform audit logs...');
      const auditEntries = [
        {
          adminId: superAdmin.id,
          action: 'ADMIN_LOGIN',
          resource: 'auth',
          resourceId: superAdmin.id,
          httpMethod: 'POST',
          ipAddress: '192.168.1.100',
          userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
        },
        {
          adminId: superAdmin.id,
          action: 'MASTER_CATALOG_SYNC',
          resource: 'master_products',
          resourceId: null,
          httpMethod: 'POST',
          afterValue: { totalImported: 5, category: 'Botanical Master Plants' },
          ipAddress: '192.168.1.100',
          userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        },
        {
          adminId: superAdmin.id,
          action: 'VENDOR_KYC_APPROVE',
          resource: 'vendors',
          resourceId: null,
          httpMethod: 'PATCH',
          beforeValue: { approvalStatus: 'PENDING' },
          afterValue: { approvalStatus: 'APPROVED', store: 'Green Oasis Plant Nursery' },
          ipAddress: '10.0.0.45',
          userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        },
        {
          adminId: superAdmin.id,
          action: 'INQUIRY_STATUS_UPDATE',
          resource: 'institutional_inquiries',
          resourceId: null,
          httpMethod: 'PATCH',
          beforeValue: { status: 'NEW' },
          afterValue: { status: 'CONTACTED', client: 'TechPark SEZ Pune' },
          ipAddress: '10.0.0.88',
          userAgent: 'Mozilla/5.0 (X11; Linux x86_64)',
        },
        {
          adminId: superAdmin.id,
          action: 'DELIVERY_OTP_RESET',
          resource: 'orders',
          resourceId: null,
          httpMethod: 'POST',
          afterValue: { action: 'OTP_UNLOCKED_AND_EXTENDED', orderNumber: 'ORD-20260901-001' },
          ipAddress: '192.168.1.100',
          userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
        },
      ];

      for (const log of auditEntries) {
        await this.auditLogRepository.save(this.auditLogRepository.create(log));
      }
    }

    // 5. Seed Clean Login History
    const existingLoginHist = await this.loginHistoryRepository.count();
    if (existingLoginHist === 0) {
      this.logger.log('Seeding clean login history logs...');
      const logins = [
        {
          email: 'admin@nursery.com',
          status: LoginStatus.SUCCESS,
          ipAddress: '127.0.0.1',
          userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
          browser: 'Chrome 125.0',
          device: 'Desktop',
          os: 'Windows 11',
        },
        {
          email: 'admin@stream.com',
          status: LoginStatus.SUCCESS,
          ipAddress: '192.168.1.100',
          userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
          browser: 'Chrome 125.0',
          device: 'Desktop',
          os: 'macOS',
        },
        {
          email: 'vendor.oasis@nursery.com',
          status: LoginStatus.SUCCESS,
          ipAddress: '115.112.44.18',
          userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X)',
          browser: 'Mobile Safari',
          device: 'iPhone 15',
          os: 'iOS 17.4',
        },
        {
          email: 'operations@nursery.com',
          status: LoginStatus.SUCCESS,
          ipAddress: '10.0.0.88',
          userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
          browser: 'Firefox 125.0',
          device: 'Desktop',
          os: 'Windows 10',
        },
      ];

      for (const entry of logins) {
        await this.loginHistoryRepository.save(
          this.loginHistoryRepository.create(entry),
        );
      }
    }

    this.logger.log('Nursery Marketplace demo data seeding successfully completed!');
  }

  private async seedNurseryDemoData(seededCustomers: User[]) {
    this.logger.log('Seeding Master Plant Catalog & Nursery Ecosystem...');

    const defaultPassword = await HashUtil.hashPassword('Admin@123456');

    // 1. Master Plant Catalog
    const existingMasterCount = await this.masterProductRepository.count();
    let seededMasters: MasterProduct[] = [];
    if (existingMasterCount === 0) {
      this.logger.log('Seeding 5 master botanical catalog plants...');
      const catalogData = [
        {
          name: 'Monstera Deliciosa',
          scientificName: 'Monstera deliciosa',
          description:
            'Iconic split-leaf tropical plant with vibrant glossy green foliage, perfect for bright indoor living spaces.',
          suggestedCategory: 'Indoor Plants',
          specifications: {
            plantType: 'Tropical Foliage',
            sunlight: 'Bright Indirect Light',
            waterRequirement: 'Medium',
            careLevel: 'Easy',
            idealTemperature: '18-30°C',
            indoorOutdoor: 'Indoor' as const,
            petFriendly: false,
            commonSynonyms: ['Swiss Cheese Plant', 'Split-Leaf Philodendron'],
          },
          referenceImages: [
            'https://images.unsplash.com/photo-1614594975525-e45190c55d0b?w=800&auto=format&fit=crop&q=60',
          ],
          source: MasterProductSource.ADMIN,
          status: MasterProductStatus.ACTIVE,
        },
        {
          name: 'Fiddle Leaf Fig',
          scientificName: 'Ficus lyrata',
          description:
            'Architectural indoor tree with broad, violin-shaped foliage that brings luxury biophilic aesthetics to modern interiors.',
          suggestedCategory: 'Indoor Plants',
          specifications: {
            plantType: 'Indoor Tree',
            sunlight: 'Bright Indirect Light',
            waterRequirement: 'Low',
            careLevel: 'Moderate',
            idealTemperature: '16-24°C',
            indoorOutdoor: 'Indoor' as const,
            petFriendly: false,
            commonSynonyms: ['Banjo Fig', 'Violin Leaf Fig'],
          },
          referenceImages: [
            'https://images.unsplash.com/photo-1597055181374-7243c3f8e56d?w=800&auto=format&fit=crop&q=60',
          ],
          source: MasterProductSource.ADMIN,
          status: MasterProductStatus.ACTIVE,
        },
        {
          name: 'Snake Plant Laurentii',
          scientificName: 'Sansevieria trifasciata',
          description:
            'Extremely resilient architectural succulent that purifies air toxins and converts CO2 to oxygen overnight.',
          suggestedCategory: 'Air Purifying Plants',
          specifications: {
            plantType: 'Succulent / Sansevieria',
            sunlight: 'Low Light to Full Sun',
            waterRequirement: 'Low',
            careLevel: 'Easy',
            idealTemperature: '15-32°C',
            indoorOutdoor: 'Both' as const,
            petFriendly: false,
            commonSynonyms: ['Mother-in-law Tongue', 'Viper Bowstring Hemp'],
          },
          referenceImages: [
            'https://images.unsplash.com/photo-1593691509543-c55fb32e7355?w=800&auto=format&fit=crop&q=60',
          ],
          source: MasterProductSource.ADMIN,
          status: MasterProductStatus.ACTIVE,
        },
        {
          name: 'Peace Lily',
          scientificName: 'Spathiphyllum wallisii',
          description:
            'Elegant indoor plant with glossy dark foliage and striking white spathe blooms that naturally droop when thirsty.',
          suggestedCategory: 'Flowering Plants',
          specifications: {
            plantType: 'Flowering Perennial',
            sunlight: 'Low to Medium Light',
            waterRequirement: 'High',
            careLevel: 'Easy',
            idealTemperature: '18-27°C',
            indoorOutdoor: 'Indoor' as const,
            petFriendly: false,
            commonSynonyms: ['White Sails', 'Spath'],
          },
          referenceImages: [
            'https://images.unsplash.com/photo-1593691511055-e15264b971a9?w=800&auto=format&fit=crop&q=60',
          ],
          source: MasterProductSource.ADMIN,
          status: MasterProductStatus.ACTIVE,
        },
        {
          name: 'Golden Pothos',
          scientificName: 'Epipremnum aureum',
          description:
            'Cascading vine with heart-shaped variegated green and golden foliage that thrives in hanging baskets and shelves.',
          suggestedCategory: 'Hanging Plants',
          specifications: {
            plantType: 'Trailing Vine',
            sunlight: 'Low to Medium Light',
            waterRequirement: 'Medium',
            careLevel: 'Easy',
            idealTemperature: '15-30°C',
            indoorOutdoor: 'Both' as const,
            petFriendly: false,
            commonSynonyms: ['Devil Ivy', 'Money Plant'],
          },
          referenceImages: [
            'https://images.unsplash.com/photo-1596547609652-9cf5d8d76921?w=800&auto=format&fit=crop&q=60',
          ],
          source: MasterProductSource.ADMIN,
          status: MasterProductStatus.ACTIVE,
        },
      ];

      for (const item of catalogData) {
        const entity = this.masterProductRepository.create(item);
        const saved = await this.masterProductRepository.save(entity);
        seededMasters.push(saved);
      }
    } else {
      seededMasters = await this.masterProductRepository.find({ take: 5 });
    }

    // 2. Nursery Vendors
    const vendorUsers = [
      {
        email: 'vendor.oasis@nursery.com',
        username: 'vendor_oasis',
        displayName: 'Green Oasis Nursery',
        businessName: 'Green Oasis Nursery LLP',
        storeName: 'Green Oasis Plant Nursery',
        storeSlug: 'green-oasis-nursery',
        description:
          'Premier nursery in Pune specializing in acclimatized indoor exotic foliage and rare house plants.',
        address: {
          street: 'Shop 12, Senapati Bapat Road',
          city: 'Pune',
          state: 'Maharashtra',
          postalCode: '411001',
          latitude: 18.5204,
          longitude: 73.8567,
        },
        deliveryArea: {
          serviceablePincodes: ['411001', '411002', '411004', '411016'],
          radiusKm: 25,
          minOrderAmount: 299,
          freeDeliveryAbove: 999,
        },
        supportPhone: '+919822012345',
        supportEmail: 'contact@greenoasis.in',
        approvalStatus: ApprovalStatus.APPROVED,
        rating: 4.8,
        ratingCount: 86,
      },
      {
        email: 'vendor.flora@nursery.com',
        username: 'vendor_flora',
        displayName: 'Flora Paradise',
        businessName: 'Flora Paradise Pvt Ltd',
        storeName: 'Flora Paradise Botanical Store',
        storeSlug: 'flora-paradise',
        description:
          'Mumbai flagship boutique offering designer planters, mature statement trees, and exotic flowering plants.',
        address: {
          street: '45 Bandra West, Linking Road',
          city: 'Mumbai',
          state: 'Maharashtra',
          postalCode: '400050',
          latitude: 19.0596,
          longitude: 72.8295,
        },
        deliveryArea: {
          serviceablePincodes: ['400050', '400051', '400052'],
          radiusKm: 20,
          minOrderAmount: 499,
          freeDeliveryAbove: 1499,
        },
        supportPhone: '+919821098765',
        supportEmail: 'orders@floraparadise.com',
        approvalStatus: ApprovalStatus.APPROVED,
        rating: 4.6,
        ratingCount: 42,
      },
      {
        email: 'vendor.roots@nursery.com',
        username: 'vendor_roots',
        displayName: 'Urban Roots Nursery',
        businessName: 'Urban Roots Gardening Enterprises',
        storeName: 'Urban Roots Nursery',
        storeSlug: 'urban-roots',
        description:
          'Bangalore urban gardening hub specializing in air purifying plants and organic soil blends.',
        address: {
          street: '88 Indiranagar 100ft Road',
          city: 'Bangalore',
          state: 'Karnataka',
          postalCode: '560038',
          latitude: 12.9716,
          longitude: 77.5946,
        },
        deliveryArea: {
          serviceablePincodes: ['560038', '560008'],
          radiusKm: 15,
        },
        supportPhone: '+919845011223',
        supportEmail: 'hello@urbanroots.in',
        approvalStatus: ApprovalStatus.PENDING,
        rating: 0.0,
        ratingCount: 0,
      },
    ];

    const seededVendors: Vendor[] = [];

    for (const vData of vendorUsers) {
      let user = await this.userRepository.findOne({
        where: { email: vData.email },
      });
      if (!user) {
        user = this.userRepository.create({
          email: vData.email,
          username: vData.username,
          password: defaultPassword,
          displayName: vData.displayName,
          status: UserStatus.ACTIVE,
          verificationStatus: VerificationStatus.VERIFIED,
          isEmailVerified: true,
          isVendor: true,
        });
        user = await this.userRepository.save(user);
      }

      let vendor = await this.vendorRepository.findOne({
        where: { userId: user.id },
      });
      if (!vendor) {
        vendor = this.vendorRepository.create({
          userId: user.id,
          businessName: vData.businessName,
          storeName: vData.storeName,
          storeSlug: vData.storeSlug,
          description: vData.description,
          address: vData.address,
          deliveryArea: vData.deliveryArea,
          supportPhone: vData.supportPhone,
          supportEmail: vData.supportEmail,
          approvalStatus: vData.approvalStatus,
          rating: vData.rating,
          ratingCount: vData.ratingCount,
          isActive: true,
        });
        vendor = await this.vendorRepository.save(vendor);
      }
      seededVendors.push(vendor);
    }

    // 3. Vendor Product Listings
    const existingProductCount = await this.productRepository.count();
    let seededProducts: Product[] = [];
    if (existingProductCount === 0 && seededVendors.length >= 2 && seededMasters.length >= 5) {
      this.logger.log('Seeding vendor product inventory...');
      const productsData = [
        {
          vendorId: seededVendors[0].id,
          masterProductId: seededMasters[0]?.id || null,
          name: 'Monstera Deliciosa - 8 Inch Ceramic Pot',
          description:
            'Healthy, bushy Monstera with perforated mature leaves, repotted in premium soil mix.',
          price: 799.0,
          discountPrice: 699.0,
          stockQuantity: 35,
          status: ProductStatus.ACTIVE,
          images: [
            'https://images.unsplash.com/photo-1614594975525-e45190c55d0b?w=800&auto=format&fit=crop&q=60',
          ],
          attributes: {
            plantHeightCm: 45,
            potIncluded: true,
            potMaterial: 'Ceramic',
            careLevel: 'Easy',
          },
          deliveryInfo: {
            isFragile: true,
            packagingWeightGrams: 1800,
            estimatedDeliveryDays: 2,
            shippingCharge: 79,
          },
        },
        {
          vendorId: seededVendors[0].id,
          masterProductId: seededMasters[2]?.id || null,
          name: 'Snake Plant Laurentii - 6 Inch Nursery Pot',
          description:
            'Yellow-bordered robust Sansevieria. Ideal for work desks and bedside tables.',
          price: 349.0,
          discountPrice: 299.0,
          stockQuantity: 60,
          status: ProductStatus.ACTIVE,
          images: [
            'https://images.unsplash.com/photo-1593691509543-c55fb32e7355?w=800&auto=format&fit=crop&q=60',
          ],
          attributes: {
            plantHeightCm: 30,
            potIncluded: true,
            potMaterial: 'Recycled Plastic',
            careLevel: 'Easy',
          },
          deliveryInfo: {
            isFragile: false,
            packagingWeightGrams: 900,
            estimatedDeliveryDays: 1,
            shippingCharge: 49,
          },
        },
        {
          vendorId: seededVendors[0].id,
          masterProductId: seededMasters[4]?.id || null,
          name: 'Golden Pothos Hanging Basket',
          description:
            'Long trailing golden vines in a lightweight UV-resistant hanging planter with hanger.',
          price: 249.0,
          discountPrice: 199.0,
          stockQuantity: 80,
          status: ProductStatus.ACTIVE,
          images: [
            'https://images.unsplash.com/photo-1596547609652-9cf5d8d76921?w=800&auto=format&fit=crop&q=60',
          ],
          attributes: {
            plantHeightCm: 25,
            potIncluded: true,
            potMaterial: 'Hanging Basket',
            careLevel: 'Easy',
          },
          deliveryInfo: {
            isFragile: false,
            packagingWeightGrams: 800,
            estimatedDeliveryDays: 2,
            shippingCharge: 49,
          },
        },
        {
          vendorId: seededVendors[1].id,
          masterProductId: seededMasters[1]?.id || null,
          name: 'Fiddle Leaf Fig Premium Tree (4 Feet)',
          description:
            'Showstopper indoor centerpiece tree with thick stem and large violin leaves.',
          price: 1499.0,
          discountPrice: 1299.0,
          stockQuantity: 12,
          status: ProductStatus.ACTIVE,
          images: [
            'https://images.unsplash.com/photo-1597055181374-7243c3f8e56d?w=800&auto=format&fit=crop&q=60',
          ],
          attributes: {
            plantHeightCm: 120,
            potIncluded: true,
            potMaterial: 'Terrazzo Planter',
            careLevel: 'Moderate',
          },
          deliveryInfo: {
            isFragile: true,
            packagingWeightGrams: 5000,
            estimatedDeliveryDays: 3,
            shippingCharge: 199,
          },
        },
        {
          vendorId: seededVendors[1].id,
          masterProductId: seededMasters[3]?.id || null,
          name: 'Peace Lily White Spathe (Air Purifying)',
          description:
            'Currently in active white bloom. Excellent bedroom and living room air purifier.',
          price: 499.0,
          discountPrice: 449.0,
          stockQuantity: 28,
          status: ProductStatus.ACTIVE,
          images: [
            'https://images.unsplash.com/photo-1593691511055-e15264b971a9?w=800&auto=format&fit=crop&q=60',
          ],
          attributes: {
            plantHeightCm: 35,
            potIncluded: true,
            potMaterial: 'Ceramic Glazed',
            careLevel: 'Easy',
          },
          deliveryInfo: {
            isFragile: true,
            packagingWeightGrams: 1200,
            estimatedDeliveryDays: 2,
            shippingCharge: 69,
          },
        },
      ];

      for (const p of productsData) {
        const prod = this.productRepository.create(p);
        seededProducts.push(await this.productRepository.save(prod));
      }
    } else {
      seededProducts = await this.productRepository.find({ take: 5 });
    }

    // 4. Seed Sample Orders with Doorstep OTP
    const existingOrderCount = await this.orderRepository.count();
    if (existingOrderCount === 0 && seededCustomers.length >= 2 && seededVendors.length >= 2 && seededProducts.length >= 2) {
      this.logger.log('Seeding nursery customer orders with Doorstep OTP...');
      const otpCustomer = seededCustomers[0];
      const otpHashed = await HashUtil.hashPassword('482910');

      // Order 1: Out for delivery (Doorstep OTP active!)
      const order1 = this.orderRepository.create({
        orderNumber: 'ORD-20260901-001',
        userId: otpCustomer.id,
        vendorId: seededVendors[0].id,
        shippingAddress: {
          fullName: 'Anita Desai',
          phone: '+919822334455',
          addressLine1: 'Flat 402, Green Meadows, Model Colony',
          addressLine2: 'Near Deep Bungalow Chowk',
          city: 'Pune',
          state: 'Maharashtra',
          postalCode: '411016',
        },
        subtotal: 998.0,
        discount: 0.0,
        deliveryCharge: 79.0,
        total: 1077.0,
        paymentMethod: PaymentMethod.COD,
        paymentStatus: PaymentStatus.PENDING,
        orderStatus: OrderStatus.OUT_FOR_DELIVERY,
        deliveryOtp: otpHashed,
        deliveryOtpGeneratedAt: new Date(),
        deliveryOtpExpiresAt: new Date(Date.now() + 12 * 3600 * 1000),
        deliveryOtpAttempts: 0,
        statusHistory: [
          { status: OrderStatus.PLACED, timestamp: new Date(Date.now() - 3600 * 1000 * 4) },
          { status: OrderStatus.CONFIRMED, timestamp: new Date(Date.now() - 3600 * 1000 * 3) },
          { status: OrderStatus.PROCESSING, timestamp: new Date(Date.now() - 3600 * 1000 * 2) },
          { status: OrderStatus.OUT_FOR_DELIVERY, timestamp: new Date(Date.now() - 3600 * 1000 * 1), note: 'Dispatched with executive Suresh' },
        ],
      });
      const savedOrder1 = await this.orderRepository.save(order1);

      // Order 1 Items
      await this.orderItemRepository.save(
        this.orderItemRepository.create({
          orderId: savedOrder1.id,
          productId: seededProducts[0].id,
          vendorId: seededVendors[0].id,
          productName: seededProducts[0].name,
          unitPrice: 699.0,
          quantity: 1,
          totalPrice: 699.0,
        }),
      );
      await this.orderItemRepository.save(
        this.orderItemRepository.create({
          orderId: savedOrder1.id,
          productId: seededProducts[1].id,
          vendorId: seededVendors[0].id,
          productName: seededProducts[1].name,
          unitPrice: 299.0,
          quantity: 1,
          totalPrice: 299.0,
        }),
      );

      // Order 2: Delivered Successfully
      const rahulCustomer = seededCustomers[1];
      const order2 = this.orderRepository.create({
        orderNumber: 'ORD-20260828-002',
        userId: rahulCustomer.id,
        vendorId: seededVendors[1].id,
        shippingAddress: {
          fullName: 'Rahul Sharma',
          phone: '+919811223344',
          addressLine1: '12 Palm Grove, Bandra West',
          city: 'Mumbai',
          state: 'Maharashtra',
          postalCode: '400050',
        },
        subtotal: 1299.0,
        discount: 100.0,
        deliveryCharge: 0.0,
        total: 1199.0,
        paymentMethod: PaymentMethod.RAZORPAY,
        paymentStatus: PaymentStatus.SUCCESS,
        orderStatus: OrderStatus.DELIVERED,
        deliveredAt: new Date(Date.now() - 86400 * 1000 * 2),
        statusHistory: [
          { status: OrderStatus.PLACED, timestamp: new Date(Date.now() - 86400 * 1000 * 3) },
          { status: OrderStatus.CONFIRMED, timestamp: new Date(Date.now() - 86400 * 1000 * 3) },
          { status: OrderStatus.PROCESSING, timestamp: new Date(Date.now() - 86400 * 1000 * 2) },
          { status: OrderStatus.OUT_FOR_DELIVERY, timestamp: new Date(Date.now() - 86400 * 1000 * 2) },
          { status: OrderStatus.DELIVERED, timestamp: new Date(Date.now() - 86400 * 1000 * 2), note: 'OTP verified at doorstep' },
        ],
      });
      const savedOrder2 = await this.orderRepository.save(order2);

      await this.orderItemRepository.save(
        this.orderItemRepository.create({
          orderId: savedOrder2.id,
          productId: seededProducts[3].id,
          vendorId: seededVendors[1].id,
          productName: seededProducts[3].name,
          unitPrice: 1299.0,
          quantity: 1,
          totalPrice: 1299.0,
        }),
      );
    }

    // 5. Institutional Inquiries (Kanban Pipeline)
    const existingInqCount = await this.inquiryRepository.count();
    if (existingInqCount === 0) {
      this.logger.log('Seeding institutional B2B inquiries...');
      const inquiriesData = [
        {
          name: 'Rajesh Kumar',
          companyName: 'TechPark SEZ Pune',
          email: 'rajesh.kumar@techpark.in',
          contactNumber: '+919820011223',
          purpose:
            'Requirement for 450 air purifying plants (Sansevieria, Areca Palm, Monstera) across 6 office floors & cafeteria.',
          status: InquiryStatus.CONTACTED,
          notes: [
            {
              id: 'note-1',
              authorName: 'Admin Team',
              adminId: '00000000-0000-0000-0000-000000000001',
              text: 'Quotation of ₹1,85,000 sent via email on Monday. Client requested discount for upfront payment.',
              createdAt: new Date(),
            },
          ],
        },
        {
          name: 'Meera Sengupta',
          companyName: 'Grand Hyatt Mumbai',
          email: 'meera.sengupta@hyatt.com',
          contactNumber: '+919811122334',
          purpose:
            'Luxury lobby tropical foliage overhaul. 80 mature Fiddle Leaf Figs & Kentia Palms in designer ceramic pots.',
          status: InquiryStatus.IN_DISCUSSION,
          notes: [
            {
              id: 'note-2',
              authorName: 'Admin Team',
              adminId: '00000000-0000-0000-0000-000000000001',
              text: 'Site inspection completed. In negotiation over maintenance warranty package for ₹3,20,000.',
              createdAt: new Date(),
            },
          ],
        },
        {
          name: 'Vikram Mehta',
          companyName: 'Green Spaces Urban Architects',
          email: 'vikram@greenspaces.design',
          contactNumber: '+919988776655',
          purpose:
            'Rooftop biophilic installation for new residential luxury tower in Koramangala, Bangalore.',
          status: InquiryStatus.NEW,
          notes: [],
        },
      ];

      for (const inq of inquiriesData) {
        const entity = this.inquiryRepository.create(inq);
        await this.inquiryRepository.save(entity);
      }
    }

    // 6. Green Army Influencer Community
    const existingInfluencers = await this.influencerProfileRepository.count();
    if (existingInfluencers === 0) {
      this.logger.log('Seeding Green Army community profiles...');
      const influencersData = [
        {
          email: 'priya.green@stream.com',
          username: 'plantmom_priya',
          displayName: 'Priya Sharma',
          bio: 'Urban jungle enthusiast & balcony gardening tips | 150+ house plants | Pune, India',
          followersCount: 45200,
          postContent:
            "Monsoon plant care alert! 🌧️ Don't let rainwater accumulate in saucers. Top 3 tips: 1) Check drainage holes, 2) Prune yellowing leaves, 3) Spray neem oil preventative.",
        },
        {
          email: 'kenji.bonsai@stream.com',
          username: 'bonsaiken',
          displayName: 'Kenji Verma',
          bio: 'Bonsai artist & tropical tree specialist | Workshops & guides',
          followersCount: 18400,
          postContent:
            'Root pruning a 12-year-old Ficus retusa. Notice how compact the fibrous root system has become! 🪴',
        },
      ];

      for (const inf of influencersData) {
        let user = await this.userRepository.findOne({
          where: { email: inf.email },
        });
        if (!user) {
          user = this.userRepository.create({
            email: inf.email,
            username: inf.username,
            password: defaultPassword,
            displayName: inf.displayName,
            status: UserStatus.ACTIVE,
            verificationStatus: VerificationStatus.VERIFIED,
            isEmailVerified: true,
            isInfluencer: true,
          });
          user = await this.userRepository.save(user);
        }

        const profile = this.influencerProfileRepository.create({
          userId: user.id,
          bio: inf.bio,
          gardeningInterests: ['Houseplants', 'Urban Jungle', 'Balcony Gardening'],
          isBadgeGranted: true,
          badgeGrantedAt: new Date(),
          followersCount: inf.followersCount,
          followingCount: 120,
          approvalStatus: ApprovalStatus.APPROVED,
        });
        const savedProfile = await this.influencerProfileRepository.save(profile);

        // Seed Sample Post
        const post = this.postRepository.create({
          influencerId: savedProfile.id,
          type: PostMediaType.IMAGE,
          mediaUrls: [
            'https://images.unsplash.com/photo-1545241047-6083a3684587?w=800&auto=format&fit=crop&q=60',
          ],
          caption: inf.postContent,
          tags: ['urbanjungle', 'plantcare', 'greenarmy', 'monsooncare'],
          likeCount: 342,
          reportCount: 0,
          status: PostStatus.APPROVED,
        });
        await this.postRepository.save(post);
      }
    }

    // 7. Notification Templates
    const existingTemplates = await this.templateRepository.count();
    if (existingTemplates === 0) {
      this.logger.log('Seeding notification templates...');
      const templates = [
        {
          templateKey: 'order_placed_customer',
          name: 'Order Confirmation to Customer',
          channel: 'email' as const,
          subject: 'Your Nursery Order #{{orderNumber}} has been placed! 🌿',
          bodyHtml:
            '<div style="font-family:sans-serif;padding:20px;"><h2>Order Confirmed!</h2><p>Hi {{customerName}}, thank you for ordering from {{storeName}}. Your plants are being carefully prepped for dispatch.</p><p>Total Amount: <strong>₹{{totalAmount}}</strong></p></div>',
          bodyText: 'Your order #{{orderNumber}} is confirmed with {{storeName}} for ₹{{totalAmount}}.',
          availableVariables: ['customerName', 'orderNumber', 'storeName', 'totalAmount'],
          isActive: true,
        },
        {
          templateKey: 'order_out_for_delivery',
          name: 'Order Out For Delivery (with OTP)',
          channel: 'email' as const,
          subject: 'Your Plants are Out for Delivery! 🚚 Share OTP {{otp}}',
          bodyHtml:
            '<div style="font-family:sans-serif;padding:20px;"><h2>Your Plants are on the way!</h2><p>Hi {{customerName}}, your order #{{orderNumber}} is out for delivery with our executive.</p><div style="background:#f0fdf4;border:2px dashed #16a34a;padding:16px;text-align:center;font-size:24px;letter-spacing:4px;font-weight:bold;color:#15803d;">{{otp}}</div><p>Please share this OTP at doorstep upon inspecting your plants.</p></div>',
          bodyText: 'Order #{{orderNumber}} is out for delivery. Share OTP {{otp}} at doorstep.',
          availableVariables: ['customerName', 'orderNumber', 'otp', 'deliveryExecutiveName'],
          isActive: true,
        },
        {
          templateKey: 'order_delivered',
          name: 'Order Delivered Successfully',
          channel: 'email' as const,
          subject: 'Delivered! Welcome your new green companions 🪴',
          bodyHtml:
            '<div style="font-family:sans-serif;padding:20px;"><h2>Delivered Successfully!</h2><p>Hi {{customerName}}, your plants from #{{orderNumber}} have been safely delivered. Check out our plant care guide in the app.</p></div>',
          bodyText: 'Order #{{orderNumber}} delivered. Enjoy your green companions!',
          availableVariables: ['customerName', 'orderNumber'],
          isActive: true,
        },
        {
          templateKey: 'inquiry_status_updated',
          name: 'B2B Inquiry Status Update',
          channel: 'email' as const,
          subject: 'Update on your Institutional Plant Inquiry - {{companyName}}',
          bodyHtml:
            '<div style="font-family:sans-serif;padding:20px;"><h2>Inquiry Status Update</h2><p>Dear {{contactName}}, your inquiry for {{companyName}} has moved to status: <strong>{{status}}</strong>.</p><p>{{notes}}</p></div>',
          bodyText: 'Inquiry update for {{companyName}}: Status is {{status}}.',
          availableVariables: ['contactName', 'companyName', 'status', 'notes', 'quotedAmount'],
          isActive: true,
        },
      ];

      for (const t of templates) {
        await this.templateRepository.save(this.templateRepository.create(t));
      }
    }

    this.logger.log('Nursery Marketplace demo data successfully prepared!');
  }
}

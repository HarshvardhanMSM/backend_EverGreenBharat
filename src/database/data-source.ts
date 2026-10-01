import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
import { User } from '../modules/users/entities/user.entity';
import { UserBlock } from '../modules/users/entities/user-block.entity';
import { UserFollow } from '../modules/users/entities/user-follow.entity';
import { Admin } from '../modules/admin/entities/admin.entity';
import { Role } from '../modules/rbac/entities/role.entity';
import { Permission } from '../modules/rbac/entities/permission.entity';
import { RolePermission } from '../modules/rbac/entities/role-permission.entity';
import { AdminRoleEntity } from '../modules/rbac/entities/admin-role.entity';
import { RefreshToken } from '../modules/auth/entities/refresh-token.entity';
import { LoginHistory } from '../modules/auth/entities/login-history.entity';
import { OtpCode } from '../modules/auth/entities/otp-code.entity';
import { AuditLog } from '../modules/audit/entities/audit-log.entity';

// Nursery Marketplace Entities
import { Category } from '../modules/categories/entities/category.entity';
import { Banner } from '../modules/banners/entities/banner.entity';
import { MasterProduct } from '../modules/master-products/entities/master-product.entity';
import { Vendor } from '../modules/vendors/entities/vendor.entity';
import { Product } from '../modules/products/entities/product.entity';
import { Order } from '../modules/orders/entities/order.entity';
import { OrderItem } from '../modules/orders/entities/order-item.entity';
import { InstitutionalInquiry } from '../modules/inquiries/entities/institutional-inquiry.entity';
import { InfluencerProfile } from '../modules/influencers/entities/influencer-profile.entity';
import { Post } from '../modules/influencers/entities/post.entity';
import { Like } from '../modules/influencers/entities/like.entity';
import { Follow } from '../modules/influencers/entities/follow.entity';
import { Report } from '../modules/influencers/entities/report.entity';
import { ModerationEvent } from '../modules/moderation/entities/moderation-event.entity';
import { Notification } from '../modules/notifications/entities/notification.entity';
import { NotificationTemplate } from '../modules/notifications/entities/notification-template.entity';

dotenv.config();

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  username: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_DATABASE || 'nursery_db',
  synchronize: false,
  logging: true,
  entities: [
    User,
    UserBlock,
    UserFollow,
    Admin,
    Role,
    Permission,
    RolePermission,
    AdminRoleEntity,
    RefreshToken,
    LoginHistory,
    OtpCode,
    AuditLog,
    Category,
    Banner,
    MasterProduct,
    Vendor,
    Product,
    Order,
    OrderItem,
    InstitutionalInquiry,
    InfluencerProfile,
    Post,
    Like,
    Follow,
    Report,
    ModerationEvent,
    Notification,
    NotificationTemplate,
  ],
  migrations: ['src/database/migrations/*.ts'],
  subscribers: [],
});

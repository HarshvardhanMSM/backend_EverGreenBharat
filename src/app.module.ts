import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { APP_GUARD, APP_INTERCEPTOR, APP_FILTER } from '@nestjs/core';
import { EventEmitterModule } from '@nestjs/event-emitter';

import envConfig from './config/env.config';
import { validateEnv } from './config/env.validation';

// Core & Administration Modules
import { UsersModule } from './modules/users/users.module';
import { AdminModule } from './modules/admin/admin.module';
import { AuthModule } from './modules/auth/auth.module';
import { RbacModule } from './modules/rbac/rbac.module';
import { AuditModule } from './modules/audit/audit.module';
import { StorageModule } from './common/storage/storage.module';

// Nursery Marketplace Feature Modules
import { MasterProductsModule } from './modules/master-products/master-products.module';
import { VendorsModule } from './modules/vendors/vendors.module';
import { ProductsModule } from './modules/products/products.module';
import { CategoriesModule } from './modules/categories/categories.module';
import { MarketplaceModule } from './modules/marketplace/marketplace.module';
import { CartModule } from './modules/cart/cart.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { OrdersModule } from './modules/orders/orders.module';
import { InquiriesModule } from './modules/inquiries/inquiries.module';
import { InfluencersModule } from './modules/influencers/influencers.module';
import { ModerationModule } from './modules/moderation/moderation.module';
import { BannersModule } from './modules/banners/banners.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { I18nModule } from './common/i18n/i18n.module';
import { I18nMiddleware } from './common/i18n/i18n.middleware';

// Guards, interceptors, filters
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { PermissionsGuard } from './common/guards/permissions.guard';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { AuditLogInterceptor } from './common/interceptors/audit-log.interceptor';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

// Entities registered in TypeORM root
import { User } from './modules/users/entities/user.entity';
import { UserBlock } from './modules/users/entities/user-block.entity';
import { UserFollow } from './modules/users/entities/user-follow.entity';
import { Admin } from './modules/admin/entities/admin.entity';
import { SystemSetting } from './modules/admin/entities/system-setting.entity';
import { Role } from './modules/rbac/entities/role.entity';
import { Permission } from './modules/rbac/entities/permission.entity';
import { RolePermission } from './modules/rbac/entities/role-permission.entity';
import { AdminRoleEntity } from './modules/rbac/entities/admin-role.entity';
import { RefreshToken } from './modules/auth/entities/refresh-token.entity';
import { LoginHistory } from './modules/auth/entities/login-history.entity';
import { OtpCode } from './modules/auth/entities/otp-code.entity';
import { AuditLog } from './modules/audit/entities/audit-log.entity';

// Nursery Marketplace Entities
import { Category } from './modules/categories/entities/category.entity';
import { CategoryAttribute } from './modules/categories/entities/category-attribute.entity';
import { Banner } from './modules/banners/entities/banner.entity';
import { MasterProduct } from './modules/master-products/entities/master-product.entity';
import { Vendor } from './modules/vendors/entities/vendor.entity';
import { Product } from './modules/products/entities/product.entity';
import { Order } from './modules/orders/entities/order.entity';
import { OrderItem } from './modules/orders/entities/order-item.entity';
import { Payment } from './modules/payments/entities/payment.entity';
import { Cart } from './modules/cart/entities/cart.entity';
import { CartItem } from './modules/cart/entities/cart-item.entity';
import { InstitutionalInquiry } from './modules/inquiries/entities/institutional-inquiry.entity';
import { InfluencerProfile } from './modules/influencers/entities/influencer-profile.entity';
import { Post } from './modules/influencers/entities/post.entity';
import { Like } from './modules/influencers/entities/like.entity';
import { Follow } from './modules/influencers/entities/follow.entity';
import { Report } from './modules/influencers/entities/report.entity';
import { ModerationEvent } from './modules/moderation/entities/moderation-event.entity';
import { Notification } from './modules/notifications/entities/notification.entity';
import { NotificationTemplate } from './modules/notifications/entities/notification-template.entity';

// Seeders
import { DemoDataSeeder } from './database/seeders/demo-data.seeder';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [envConfig],
      validate: validateEnv,
    }),

    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.get<string>('database.host'),
        port: config.get<number>('database.port'),
        username: config.get<string>('database.username'),
        password: config.get<string>('database.password'),
        database: config.get<string>('database.name'),
        autoLoadEntities: true,
        synchronize: process.env.NODE_ENV !== 'production',
        logging: process.env.NODE_ENV === 'development',
        extra: {
          max: parseInt(process.env.DB_POOL_MAX || '20', 10),
          min: parseInt(process.env.DB_POOL_MIN || '2', 10),
          idleTimeoutMillis: 30000,
          connectionTimeoutMillis: 5000,
        },
        ssl:
          process.env.DB_SSL === 'true'
            ? { rejectUnauthorized: false }
            : false,
        entities: [
          User,
          UserBlock,
          UserFollow,
          Admin,
          SystemSetting,
          Role,
          Permission,
          RolePermission,
          AdminRoleEntity,
          RefreshToken,
          LoginHistory,
          OtpCode,
          AuditLog,
          Category,
          CategoryAttribute,
          Banner,
          MasterProduct,
          Vendor,
          Product,
          Order,
          OrderItem,
          Payment,
          Cart,
          CartItem,
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
      }),
    }),

    TypeOrmModule.forFeature([
      User,
      Admin,
      Role,
      AdminRoleEntity,
      AuditLog,
      LoginHistory,
      Category,
      CategoryAttribute,
      Banner,
      UserFollow,
      MasterProduct,
      Vendor,
      Product,
      Order,
      OrderItem,
      InstitutionalInquiry,
      InfluencerProfile,
      Post,
      NotificationTemplate,
    ]),

    EventEmitterModule.forRoot(),
    ScheduleModule.forRoot(),
    StorageModule,

    // Core & Administration Modules
    UsersModule,
    AdminModule,
    AuthModule,
    RbacModule,
    AuditModule,

    // Nursery Marketplace Feature Modules
    MasterProductsModule,
    VendorsModule,
    ProductsModule,
    CategoriesModule,
    MarketplaceModule,
    CartModule,
    PaymentsModule,
    OrdersModule,
    InquiriesModule,
    InfluencersModule,
    ModerationModule,
    BannersModule,
    NotificationsModule,
    I18nModule,
  ],
  providers: [
    DemoDataSeeder,
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
    {
      provide: APP_GUARD,
      useClass: PermissionsGuard,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: TransformInterceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: AuditLogInterceptor,
    },
    {
      provide: APP_FILTER,
      useClass: HttpExceptionFilter,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(I18nMiddleware).forRoutes('*');
  }
}

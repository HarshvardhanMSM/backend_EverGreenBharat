import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { Admin } from '../admin/entities/admin.entity';
import { UserBlock } from './entities/user-block.entity';
import { UserFollow } from './entities/user-follow.entity';
import { RefreshToken } from '../auth/entities/refresh-token.entity';
import { AuditLog } from '../audit/entities/audit-log.entity';
import { UsersService } from './users.service';
import { OnboardingService } from './services/onboarding.service';
import { UserFollowsService } from './services/user-follows.service';
import { UserFollowsRepository } from './repositories/user-follows.repository';
import { UsersController } from './users.controller';
import { AdminUsersController } from './admin-users.controller';
import {
  UserFollowsController,
  CreatorFollowersController,
  AdminUserFollowsController,
} from './controllers/user-follows.controller';
import { AuthModule } from '../auth/auth.module';
import { ModerationModule } from '../moderation/moderation.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      Admin,
      UserBlock,
      UserFollow,
      RefreshToken,
      AuditLog,
    ]),
    AuthModule,
    ModerationModule,
  ],
  controllers: [
    UsersController,
    AdminUsersController,
    UserFollowsController,
    CreatorFollowersController,
    AdminUserFollowsController,
  ],
  providers: [
    UsersService,
    OnboardingService,
    UserFollowsService,
    UserFollowsRepository,
  ],
  exports: [UsersService, UserFollowsService, TypeOrmModule],
})
export class UsersModule {}

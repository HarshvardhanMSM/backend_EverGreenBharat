import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Admin } from './entities/admin.entity';
import { SystemSetting } from './entities/system-setting.entity';
import { User } from '../users/entities/user.entity';
import { Role } from '../rbac/entities/role.entity';
import { AdminRoleEntity } from '../rbac/entities/admin-role.entity';
import { RefreshToken } from '../auth/entities/refresh-token.entity';
import { LoginHistory } from '../auth/entities/login-history.entity';
import { AdminManagementService } from './services/admin-management.service';
import { AdminManagementController } from './controllers/admin-management.controller';
import { EconomyConfigService } from './services/economy-config.service';
import { EconomyConfigController } from './controllers/economy-config.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Admin,
      SystemSetting,
      User,
      Role,
      AdminRoleEntity,
      RefreshToken,
      LoginHistory,
    ]),
  ],
  providers: [AdminManagementService, EconomyConfigService],
  controllers: [AdminManagementController, EconomyConfigController],
  exports: [AdminManagementService, EconomyConfigService, TypeOrmModule],
})
export class AdminModule {}


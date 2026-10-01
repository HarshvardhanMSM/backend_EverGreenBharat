import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Role } from './entities/role.entity';
import { Permission } from './entities/permission.entity';
import { RolePermission } from './entities/role-permission.entity';
import { AdminRoleEntity } from './entities/admin-role.entity';
import { User } from '../users/entities/user.entity';
import { Admin } from '../admin/entities/admin.entity';
import { RbacService } from './rbac.service';
import { PermissionSeeder } from './rbac.seeder';
import { AdminRbacController } from './admin-rbac.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Role,
      Permission,
      RolePermission,
      AdminRoleEntity,
      User,
      Admin,
    ]),
  ],
  controllers: [AdminRbacController],
  providers: [RbacService, PermissionSeeder],
  exports: [RbacService, TypeOrmModule],
})
export class RbacModule {}

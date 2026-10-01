import {
  Controller,
  Get,
  Post,
  Patch,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { RbacService } from './rbac.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { AuthorityGuard } from '../../common/guards/authority.guard';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { PermissionKeys } from '../../common/enums/permission-keys.enum';
import { AuditLogInterceptor } from '../../common/interceptors/audit-log.interceptor';
import { IsString, IsArray, IsOptional, MinLength } from 'class-validator';

class AssignRoleDto {
  @IsString()
  adminId: string;

  @IsString()
  roleCode: string;
}

class CreateRoleDto {
  @IsString()
  @MinLength(2)
  code: string;

  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsArray()
  permissionKeys?: string[];
}

class EditRoleDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsArray()
  permissionKeys?: string[];
}

class CloneRoleDto {
  @IsString()
  @MinLength(2)
  code: string;

  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;
}

class SetPermissionsDto {
  @IsArray()
  permissionKeys: string[];
}

@ApiTags('Admin RBAC')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, PermissionsGuard, AuthorityGuard)
@Controller('v1/admin/rbac')
export class AdminRbacController {
  constructor(private readonly rbacService: RbacService) {}

  @Get('roles')
  @Permissions(PermissionKeys.ROLES_READ)
  @ApiOperation({ summary: 'Get all system and custom roles' })
  async getRoles() {
    return this.rbacService.findAllRoles();
  }

  @Get('roles/:id')
  @Permissions(PermissionKeys.ROLES_READ)
  @ApiOperation({ summary: 'Get detailed role info and assigned permissions' })
  async getRoleById(@Param('id') id: string) {
    return this.rbacService.findRoleById(id);
  }

  @Post('roles')
  @Permissions(PermissionKeys.ROLES_CREATE)
  @UseInterceptors(AuditLogInterceptor)
  @ApiOperation({ summary: 'Create a new custom administrative role' })
  async createRole(@Body() dto: CreateRoleDto) {
    return this.rbacService.createRole(dto);
  }

  @Patch('roles/:id')
  @Permissions(PermissionKeys.ROLES_UPDATE)
  @UseInterceptors(AuditLogInterceptor)
  @ApiOperation({
    summary: 'Edit a custom administrative role (system roles protected)',
  })
  async editRole(@Param('id') id: string, @Body() dto: EditRoleDto) {
    return this.rbacService.editRole(id, dto);
  }

  @Delete('roles/:id')
  @Permissions(PermissionKeys.ROLES_DELETE)
  @UseInterceptors(AuditLogInterceptor)
  @ApiOperation({
    summary: 'Delete a custom administrative role (system roles protected)',
  })
  async deleteRole(@Param('id') id: string) {
    return this.rbacService.deleteRole(id);
  }

  @Post('roles/:id/clone')
  @Permissions(PermissionKeys.ROLES_CLONE)
  @UseInterceptors(AuditLogInterceptor)
  @ApiOperation({ summary: 'Clone an existing role with all its permissions' })
  async cloneRole(@Param('id') id: string, @Body() dto: CloneRoleDto) {
    return this.rbacService.cloneRole(id, dto);
  }

  @Put('roles/:id/permissions')
  @Permissions(PermissionKeys.ROLES_ASSIGN_PERMISSIONS)
  @UseInterceptors(AuditLogInterceptor)
  @ApiOperation({ summary: 'Set permission assignments for a role' })
  async setPermissions(
    @Param('id') id: string,
    @Body() dto: SetPermissionsDto,
  ) {
    return this.rbacService.setRolePermissions(id, dto.permissionKeys);
  }

  @Post('assign-role')
  @Permissions(PermissionKeys.ADMIN_ASSIGN_ROLES)
  @UseInterceptors(AuditLogInterceptor)
  @ApiOperation({
    summary: 'Assign a system role to an administrative account',
  })
  async assignRole(@Body() dto: AssignRoleDto) {
    return this.rbacService.assignRoleToAdmin(dto.adminId, dto.roleCode);
  }

  @Get('permissions')
  @Permissions(PermissionKeys.PERMISSIONS_READ)
  @ApiOperation({ summary: 'Get all permissions grouped by module' })
  @ApiQuery({ name: 'module', required: false })
  @ApiQuery({ name: 'search', required: false })
  async getPermissions(
    @Query('module') moduleFilter?: string,
    @Query('search') search?: string,
  ) {
    return this.rbacService.findAllPermissions(moduleFilter, search);
  }

  @Get('permissions/stats')
  @Permissions(PermissionKeys.PERMISSIONS_READ)
  @ApiOperation({
    summary: 'Get permission usage statistics across roles and admins',
  })
  async getPermissionStats() {
    return this.rbacService.getPermissionUsageStats();
  }

  @Get('permissions/:id')
  @Permissions(PermissionKeys.PERMISSIONS_READ)
  @ApiOperation({ summary: 'Get permission details by ID' })
  async getPermissionById(@Param('id') id: string) {
    return this.rbacService.findPermissionById(id);
  }
}

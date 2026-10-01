import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AdminManagementService } from '../services/admin-management.service';
import { CreateAdminDto } from '../dto/create-admin.dto';
import { UpdateAdminDto } from '../dto/update-admin.dto';
import { AdminQueryDto } from '../dto/admin-query.dto';
import {
  SuspendAdminDto,
  ResetAdminPasswordDto,
  AssignAdminRolesDto,
} from '../dto/admin-action.dto';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../../common/guards/permissions.guard';
import { AuthorityGuard } from '../../../common/guards/authority.guard';
import { Permissions } from '../../../common/decorators/permissions.decorator';
import { PermissionKeys } from '../../../common/enums/permission-keys.enum';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { AuditLogInterceptor } from '../../../common/interceptors/audit-log.interceptor';

@ApiTags('Admin Management')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, PermissionsGuard, AuthorityGuard)
@Controller('v1/admin/admins')
export class AdminManagementController {
  constructor(
    private readonly adminManagementService: AdminManagementService,
  ) {}

  @Post()
  @Permissions(PermissionKeys.ADMIN_CREATE)
  @UseInterceptors(AuditLogInterceptor)
  @ApiOperation({ summary: 'Create a new administrative account' })
  async create(
    @Body() dto: CreateAdminDto,
    @CurrentUser('admin') currentAdmin: any,
  ) {
    const admin = await this.adminManagementService.createAdmin(
      dto,
      currentAdmin?.id,
    );
    return {
      success: true,
      message: `Admin account '${admin.user.email}' created successfully`,
      data: admin,
    };
  }

  @Get()
  @Permissions(PermissionKeys.ADMIN_READ)
  @ApiOperation({ summary: 'List all administrative accounts with filters' })
  async findAll(@Query() queryDto: AdminQueryDto) {
    return this.adminManagementService.findAllAdmins(queryDto);
  }

  @Get(':id')
  @Permissions(PermissionKeys.ADMIN_READ)
  @ApiOperation({ summary: 'Get detailed admin account profile by ID' })
  async findOne(@Param('id') id: string) {
    const admin = await this.adminManagementService.findAdminById(id);
    return {
      success: true,
      data: admin,
    };
  }

  @Patch(':id')
  @Permissions(PermissionKeys.ADMIN_UPDATE)
  @UseInterceptors(AuditLogInterceptor)
  @ApiOperation({ summary: 'Update admin account details' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateAdminDto,
    @CurrentUser('admin') currentAdmin: any,
  ) {
    const admin = await this.adminManagementService.updateAdmin(
      id,
      dto,
      currentAdmin?.id,
    );
    return {
      success: true,
      message: `Admin profile updated successfully`,
      data: admin,
    };
  }

  @Post(':id/suspend')
  @Permissions(PermissionKeys.ADMIN_SUSPEND)
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(AuditLogInterceptor)
  @ApiOperation({ summary: 'Suspend administrative account' })
  async suspend(
    @Param('id') id: string,
    @Body() dto: SuspendAdminDto,
    @CurrentUser('admin') currentAdmin: any,
  ) {
    const admin = await this.adminManagementService.suspendAdmin(
      id,
      dto.reason,
      currentAdmin?.id,
    );
    return {
      success: true,
      message: `Admin account suspended successfully`,
      data: admin,
    };
  }

  @Post(':id/activate')
  @Permissions(PermissionKeys.ADMIN_ACTIVATE)
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(AuditLogInterceptor)
  @ApiOperation({ summary: 'Activate administrative account' })
  async activate(
    @Param('id') id: string,
    @CurrentUser('admin') currentAdmin: any,
  ) {
    const admin = await this.adminManagementService.activateAdmin(
      id,
      currentAdmin?.id,
    );
    return {
      success: true,
      message: `Admin account activated successfully`,
      data: admin,
    };
  }

  @Delete(':id')
  @Permissions(PermissionKeys.ADMIN_DELETE)
  @UseInterceptors(AuditLogInterceptor)
  @ApiOperation({ summary: 'Soft delete administrative account' })
  async remove(
    @Param('id') id: string,
    @CurrentUser('admin') currentAdmin: any,
  ) {
    await this.adminManagementService.softDeleteAdmin(id, currentAdmin?.id);
    return {
      success: true,
      message: `Admin account soft deleted successfully`,
    };
  }

  @Post(':id/restore')
  @Permissions(PermissionKeys.ADMIN_RESTORE)
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(AuditLogInterceptor)
  @ApiOperation({ summary: 'Restore soft deleted administrative account' })
  async restore(
    @Param('id') id: string,
    @CurrentUser('admin') currentAdmin: any,
  ) {
    const admin = await this.adminManagementService.restoreAdmin(
      id,
      currentAdmin?.id,
    );
    return {
      success: true,
      message: `Admin account restored successfully`,
      data: admin,
    };
  }

  @Post(':id/reset-password')
  @Permissions(PermissionKeys.ADMIN_RESET_PASSWORD)
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(AuditLogInterceptor)
  @ApiOperation({ summary: 'Reset admin account password' })
  async resetPassword(
    @Param('id') id: string,
    @Body() dto: ResetAdminPasswordDto,
  ) {
    return this.adminManagementService.resetPassword(id, dto.newPassword);
  }

  @Post(':id/force-logout')
  @Permissions(PermissionKeys.ADMIN_FORCE_LOGOUT)
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(AuditLogInterceptor)
  @ApiOperation({
    summary: 'Force logout and revoke all active sessions for an admin',
  })
  async forceLogout(@Param('id') id: string) {
    return this.adminManagementService.forceLogout(id);
  }

  @Post(':id/roles')
  @Permissions(PermissionKeys.ADMIN_ASSIGN_ROLES)
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(AuditLogInterceptor)
  @ApiOperation({ summary: 'Assign administrative roles to admin' })
  async assignRoles(@Param('id') id: string, @Body() dto: AssignAdminRolesDto) {
    const admin = await this.adminManagementService.assignRoles(
      id,
      dto.roleCodes,
    );
    return {
      success: true,
      message: `Roles assigned successfully`,
      data: admin,
    };
  }

  @Delete(':id/roles/:roleId')
  @Permissions(PermissionKeys.ADMIN_ASSIGN_ROLES)
  @UseInterceptors(AuditLogInterceptor)
  @ApiOperation({ summary: 'Remove a specific role from an admin' })
  async removeRole(@Param('id') id: string, @Param('roleId') roleId: string) {
    const admin = await this.adminManagementService.removeRole(id, roleId);
    return {
      success: true,
      message: `Role removed successfully`,
      data: admin,
    };
  }

  @Get(':id/sessions')
  @Permissions(PermissionKeys.SESSIONS_READ)
  @ApiOperation({ summary: 'Get active sessions for a target admin' })
  async getSessions(@Param('id') id: string) {
    return this.adminManagementService.getAdminSessions(id);
  }

  @Get(':id/login-history')
  @Permissions(PermissionKeys.LOGIN_HISTORY_READ)
  @ApiOperation({ summary: 'Get login history for a target admin' })
  async getLoginHistory(
    @Param('id') id: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.adminManagementService.getAdminLoginHistory(id, page, limit);
  }
}

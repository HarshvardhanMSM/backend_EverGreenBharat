import {
  Controller,
  Get,
  Patch,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { AdminUserQueryDto } from './dto/admin-user-query.dto';
import { AdminUpdateUserDto } from './dto/admin-update-user.dto';
import { SuspendUserDto } from './dto/suspend-user.dto';
import { BanUserDto, BulkUserActionDto } from './dto/ban-user.dto';
import { WarnUserDto } from './dto/warn-user.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { PermissionKeys } from '../../common/enums/permission-keys.enum';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';

@ApiTags('Admin Users')
@Controller('v1/admin/users')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth('JWT-auth')
export class AdminUsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @Permissions(PermissionKeys.USERS_READ)
  @ApiOperation({ summary: 'List paginated users with search & filters' })
  async findAll(@Query() queryDto: AdminUserQueryDto) {
    return this.usersService.findAllAdmin(queryDto);
  }

  @Get('export')
  @Permissions(PermissionKeys.USERS_READ)
  @ApiOperation({ summary: 'Export user list report as CSV' })
  async exportCsv(@Res() res: Response) {
    const csvData = await this.usersService.exportUsersCsv();
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader(
      'Content-Disposition',
      'attachment; filename=users_export.csv',
    );
    return res.send(csvData);
  }

  @Get(':id')
  @Permissions(PermissionKeys.USERS_READ)
  @ApiOperation({ summary: 'Get detailed user profile by ID' })
  async findOne(@Param('id') id: string) {
    return this.usersService.findOneAdmin(id);
  }

  @Patch(':id')
  @Permissions(PermissionKeys.USERS_WRITE)
  @ApiOperation({ summary: 'Admin update user profile details' })
  async updateUser(
    @Param('id') id: string,
    @Body() adminUpdateDto: AdminUpdateUserDto,
  ) {
    return this.usersService.updateUserAdmin(id, adminUpdateDto);
  }

  @Get(':id/sessions')
  @Permissions(PermissionKeys.USERS_READ)
  @ApiOperation({ summary: 'Get active sessions for a target user' })
  async getUserSessions(@Param('id') id: string) {
    return this.usersService.getUserSessions(id);
  }

  @Post(':id/suspend')
  @Permissions(PermissionKeys.USERS_BAN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Suspend user account temporarily' })
  async suspendUser(
    @Param('id') id: string,
    @Body() dto: SuspendUserDto,
    @CurrentUser('id') adminId: string,
  ) {
    return this.usersService.suspendUser(id, dto, adminId);
  }

  @Post(':id/warn')
  @Permissions(PermissionKeys.USERS_BAN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Issue a formal warning to a user' })
  async warnUser(
    @Param('id') id: string,
    @Body() dto: WarnUserDto,
    @CurrentUser('id') adminId: string,
  ) {
    return this.usersService.warnUser(id, dto, adminId);
  }

  @Post(':id/ban')
  @Permissions(PermissionKeys.USERS_BAN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Ban user account permanently' })
  async banUser(
    @Param('id') id: string,
    @Body() dto: BanUserDto,
    @CurrentUser('id') adminId: string,
  ) {
    return this.usersService.banUser(id, dto, adminId);
  }

  @Post(':id/activate')
  @Permissions(PermissionKeys.USERS_WRITE)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reactivate user account' })
  async activateUser(
    @Param('id') id: string,
    @CurrentUser('id') adminId: string,
  ) {
    return this.usersService.activateUser(id, adminId);
  }

  @Get(':id/moderation-events')
  @Permissions(PermissionKeys.USERS_READ)
  @ApiOperation({ summary: 'Get moderation event history for a user' })
  async getModerationEvents(
    @Param('id') id: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const pageNumber = page ? parseInt(page, 10) : 1;
    const limitNumber = limit ? parseInt(limit, 10) : 20;
    return this.usersService.getModerationHistory(id, pageNumber, limitNumber);
  }

  @Delete(':id')
  @Permissions(PermissionKeys.USERS_WRITE)
  @ApiOperation({ summary: 'Soft delete user account' })
  async softDeleteUser(
    @Param('id') id: string,
    @CurrentUser('id') adminId: string,
  ) {
    return this.usersService.softDeleteUserAdmin(id, adminId);
  }

  @Post('bulk-action')
  @Permissions(PermissionKeys.USERS_BAN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Execute bulk action (Suspend / Ban / Activate)' })
  async bulkAction(
    @Body() dto: BulkUserActionDto,
    @CurrentUser('id') adminId: string,
  ) {
    return this.usersService.bulkUserAction(dto, adminId);
  }
}

import {
  Controller,
  Get,
  Delete,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { SessionsService } from '../services/sessions.service';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../../common/guards/permissions.guard';
import { Permissions } from '../../../common/decorators/permissions.decorator';
import { PermissionKeys } from '../../../common/enums/permission-keys.enum';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { AuditLogInterceptor } from '../../../common/interceptors/audit-log.interceptor';

@ApiTags('Admin Sessions')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('v1/admin/sessions')
export class AdminSessionsController {
  constructor(private readonly sessionsService: SessionsService) {}

  @Get()
  @Permissions(PermissionKeys.SESSIONS_READ)
  @ApiOperation({ summary: 'List all active user and admin sessions' })
  async findAll(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('search') search?: string,
  ) {
    return this.sessionsService.findAllSessions(page, limit, search);
  }

  @Get('me')
  @ApiOperation({ summary: 'List caller active sessions' })
  async getMySessions(@CurrentUser('id') userId: string) {
    return this.sessionsService.getUserSessions(userId);
  }

  @Delete(':sessionId')
  @Permissions(PermissionKeys.SESSIONS_REVOKE)
  @UseInterceptors(AuditLogInterceptor)
  @ApiOperation({ summary: 'Revoke a specific active session' })
  async revokeSession(@Param('sessionId') sessionId: string) {
    return this.sessionsService.revokeSession(sessionId);
  }

  @Delete('admin/:adminId')
  @Permissions(PermissionKeys.ADMIN_FORCE_LOGOUT)
  @UseInterceptors(AuditLogInterceptor)
  @ApiOperation({ summary: 'Force logout all sessions for a target admin' })
  async forceLogoutAdmin(@Param('adminId') adminId: string) {
    return this.sessionsService.revokeAllUserSessions(adminId);
  }
}

import { Controller, Get, Query, UseGuards, Res } from '@nestjs/common';
import type { Response } from 'express';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import {
  LoginHistoryService,
  LoginHistoryQueryDto,
} from '../services/login-history.service';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../../common/guards/permissions.guard';
import { Permissions } from '../../../common/decorators/permissions.decorator';
import { PermissionKeys } from '../../../common/enums/permission-keys.enum';

@ApiTags('Admin Login History')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('v1/admin/login-history')
export class AdminLoginHistoryController {
  constructor(private readonly loginHistoryService: LoginHistoryService) {}

  @Get()
  @Permissions(PermissionKeys.LOGIN_HISTORY_READ)
  @ApiOperation({
    summary: 'List platform login history with search & filters',
  })
  async findAll(@Query() queryDto: LoginHistoryQueryDto) {
    return this.loginHistoryService.findAllLoginHistory(queryDto);
  }

  @Get('export')
  @Permissions(PermissionKeys.LOGIN_HISTORY_EXPORT)
  @ApiOperation({ summary: 'Export login history report as CSV' })
  async exportCsv(
    @Query() queryDto: LoginHistoryQueryDto,
    @Res() res: Response,
  ) {
    const csvData =
      await this.loginHistoryService.exportLoginHistoryCsv(queryDto);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader(
      'Content-Disposition',
      'attachment; filename=login_history_export.csv',
    );
    return res.send(csvData);
  }
}

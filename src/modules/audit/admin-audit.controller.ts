import { Controller, Get, Param, Query, UseGuards, Res } from '@nestjs/common';
import type { Response } from 'express';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuditService, AuditLogQueryDto } from './audit.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { PermissionKeys } from '../../common/enums/permission-keys.enum';

@ApiTags('Admin Audit')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('v1/admin/audit-logs')
export class AdminAuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  @Permissions(PermissionKeys.AUDIT_READ)
  @ApiOperation({
    summary: 'List administrative audit logs with filtering & search',
  })
  async findAll(@Query() queryDto: AuditLogQueryDto) {
    return this.auditService.findAllAuditLogs(queryDto);
  }

  @Get('export')
  @Permissions(PermissionKeys.AUDIT_EXPORT)
  @ApiOperation({ summary: 'Export audit logs report as CSV' })
  async exportCsv(@Query() queryDto: AuditLogQueryDto, @Res() res: Response) {
    const csvData = await this.auditService.exportAuditLogsCsv(queryDto);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader(
      'Content-Disposition',
      'attachment; filename=audit_logs_export.csv',
    );
    return res.send(csvData);
  }

  @Get(':id')
  @Permissions(PermissionKeys.AUDIT_READ)
  @ApiOperation({
    summary: 'Get detailed audit log record with structured before/after diff',
  })
  async findOne(@Param('id') id: string) {
    return this.auditService.findAuditLogById(id);
  }
}

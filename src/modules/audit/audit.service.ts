import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLog } from './entities/audit-log.entity';
import { Type } from 'class-transformer';
import { IsOptional, IsInt, Min, IsString } from 'class-validator';

export class AuditLogQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 20;

  @IsOptional()
  @IsString()
  adminId?: string;

  @IsOptional()
  @IsString()
  action?: string;

  @IsOptional()
  @IsString()
  resource?: string;

  @IsOptional()
  @IsString()
  httpMethod?: string;

  @IsOptional()
  @IsString()
  correlationId?: string;

  @IsOptional()
  @IsString()
  startDate?: string;

  @IsOptional()
  @IsString()
  endDate?: string;

  @IsOptional()
  @IsString()
  search?: string;
}

@Injectable()
export class AuditService {
  constructor(
    @InjectRepository(AuditLog)
    private readonly auditLogRepository: Repository<AuditLog>,
  ) {}

  async findAllAuditLogs(queryDto: AuditLogQueryDto) {
    const page = queryDto.page || 1;
    const limit = queryDto.limit || 20;
    const skip = (page - 1) * limit;

    const qb = this.auditLogRepository.createQueryBuilder('audit');

    if (queryDto.adminId) {
      qb.andWhere('audit.adminId = :adminId', { adminId: queryDto.adminId });
    }

    if (queryDto.action) {
      qb.andWhere('audit.action ILIKE :action', {
        action: `%${queryDto.action}%`,
      });
    }

    if (queryDto.resource) {
      qb.andWhere('audit.resource ILIKE :resource', {
        resource: `%${queryDto.resource}%`,
      });
    }

    if (queryDto.httpMethod) {
      qb.andWhere('audit.httpMethod = :httpMethod', {
        httpMethod: queryDto.httpMethod,
      });
    }

    if (queryDto.correlationId) {
      qb.andWhere('audit.correlationId = :correlationId', {
        correlationId: queryDto.correlationId,
      });
    }

    if (queryDto.startDate) {
      qb.andWhere('audit.createdAt >= :startDate', {
        startDate: new Date(queryDto.startDate),
      });
    }

    if (queryDto.endDate) {
      qb.andWhere('audit.createdAt <= :endDate', {
        endDate: new Date(queryDto.endDate),
      });
    }

    if (queryDto.search) {
      qb.andWhere(
        '(audit.action ILIKE :search OR audit.resource ILIKE :search OR audit.ipAddress ILIKE :search OR audit.correlationId ILIKE :search)',
        { search: `%${queryDto.search}%` },
      );
    }

    qb.orderBy('audit.createdAt', 'DESC');
    qb.skip(skip).take(limit);

    const [data, total] = await qb.getManyAndCount();
    const totalPages = Math.ceil(total / limit);

    return {
      success: true,
      message: 'Audit logs retrieved successfully',
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    };
  }

  async findAuditLogById(id: string) {
    const log = await this.auditLogRepository.findOne({ where: { id } });
    if (!log) {
      throw new NotFoundException(`Audit log with ID '${id}' not found`);
    }

    const diff = this.computeStructuredDiff(log.beforeValue, log.afterValue);

    return {
      success: true,
      data: {
        ...log,
        diff,
      },
    };
  }

  async exportAuditLogsCsv(queryDto: AuditLogQueryDto): Promise<string> {
    const { data } = await this.findAllAuditLogs({ ...queryDto, limit: 10000 });

    const header = [
      'ID',
      'Timestamp',
      'Admin ID',
      'Action',
      'Resource',
      'Resource ID',
      'HTTP Method',
      'IP Address',
      'Correlation ID',
    ].join(',');

    const rows = data.map((log) =>
      [
        log.id,
        `"${log.createdAt.toISOString()}"`,
        `"${log.adminId || ''}"`,
        `"${log.action}"`,
        `"${log.resource}"`,
        `"${log.httpMethod}"`,
        `"${log.ipAddress}"`,
        `"${log.correlationId || ''}"`,
      ].join(','),
    );

    return [header, ...rows].join('\n');
  }

  private computeStructuredDiff(before: any, after: any) {
    if (!before && !after) return null;
    const allKeys = new Set([
      ...Object.keys(before || {}),
      ...Object.keys(after || {}),
    ]);

    const changes: Record<
      string,
      { before: any; after: any; modified: boolean }
    > = {};

    for (const key of allKeys) {
      const beforeVal = before ? before[key] : undefined;
      const afterVal = after ? after[key] : undefined;
      const modified = JSON.stringify(beforeVal) !== JSON.stringify(afterVal);

      changes[key] = {
        before: beforeVal,
        after: afterVal,
        modified,
      };
    }

    return changes;
  }
}

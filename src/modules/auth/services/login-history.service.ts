import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LoginHistory, LoginStatus } from '../entities/login-history.entity';
import { Type } from 'class-transformer';
import { IsOptional, IsInt, Min, IsString, IsEnum } from 'class-validator';

export class LoginHistoryQueryDto {
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
  userId?: string;

  @IsOptional()
  @IsString()
  adminId?: string;

  @IsOptional()
  @IsString()
  email?: string;

  @IsOptional()
  @IsEnum(LoginStatus)
  status?: LoginStatus;

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
export class LoginHistoryService {
  constructor(
    @InjectRepository(LoginHistory)
    private readonly loginHistoryRepository: Repository<LoginHistory>,
  ) {}

  async recordLogin(data: {
    userId?: string | null;
    adminId?: string | null;
    email: string;
    status: LoginStatus;
    failureReason?: string | null;
    ipAddress: string;
    userAgent?: string | null;
  }): Promise<LoginHistory> {
    const parsedAgent = this.parseUserAgent(data.userAgent || '');

    const record = this.loginHistoryRepository.create({
      userId: data.userId || null,
      adminId: data.adminId || null,
      email: data.email,
      status: data.status,
      failureReason: data.failureReason || null,
      ipAddress: data.ipAddress,
      userAgent: data.userAgent || null,
      browser: parsedAgent.browser,
      device: parsedAgent.device,
      os: parsedAgent.os,
    });

    return this.loginHistoryRepository.save(record);
  }

  async findAllLoginHistory(queryDto: LoginHistoryQueryDto) {
    const page = queryDto.page || 1;
    const limit = queryDto.limit || 20;
    const skip = (page - 1) * limit;

    const qb = this.loginHistoryRepository.createQueryBuilder('lh');

    if (queryDto.userId) {
      qb.andWhere('lh.userId = :userId', { userId: queryDto.userId });
    }

    if (queryDto.adminId) {
      qb.andWhere('lh.adminId = :adminId', { adminId: queryDto.adminId });
    }

    if (queryDto.email) {
      qb.andWhere('lh.email ILIKE :email', { email: `%${queryDto.email}%` });
    }

    if (queryDto.status) {
      qb.andWhere('lh.status = :status', { status: queryDto.status });
    }

    if (queryDto.startDate) {
      qb.andWhere('lh.createdAt >= :startDate', {
        startDate: new Date(queryDto.startDate),
      });
    }

    if (queryDto.endDate) {
      qb.andWhere('lh.createdAt <= :endDate', {
        endDate: new Date(queryDto.endDate),
      });
    }

    if (queryDto.search) {
      qb.andWhere(
        '(lh.email ILIKE :search OR lh.ipAddress ILIKE :search OR lh.browser ILIKE :search OR lh.device ILIKE :search)',
        { search: `%${queryDto.search}%` },
      );
    }

    qb.orderBy('lh.createdAt', 'DESC');
    qb.skip(skip).take(limit);

    const [data, total] = await qb.getManyAndCount();
    const totalPages = Math.ceil(total / limit);

    return {
      success: true,
      message: 'Login history retrieved successfully',
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    };
  }

  async exportLoginHistoryCsv(queryDto: LoginHistoryQueryDto): Promise<string> {
    const { data } = await this.findAllLoginHistory({
      ...queryDto,
      limit: 10000,
    });

    const header = [
      'ID',
      'Timestamp',
      'Email',
      'Status',
      'Failure Reason',
      'IP Address',
      'Browser',
      'Device',
      'OS',
    ].join(',');

    const rows = data.map((lh) =>
      [
        lh.id,
        `"${lh.createdAt.toISOString()}"`,
        `"${lh.email}"`,
        `"${lh.status}"`,
        `"${lh.failureReason || ''}"`,
        `"${lh.ipAddress}"`,
        `"${lh.browser || ''}"`,
        `"${lh.device || ''}"`,
        `"${lh.os || ''}"`,
      ].join(','),
    );

    return [header, ...rows].join('\n');
  }

  private parseUserAgent(ua: string) {
    let browser = 'Unknown';
    let device = 'Desktop';
    let os = 'Unknown';

    if (ua.includes('Firefox/')) browser = 'Firefox';
    else if (ua.includes('Chrome/')) browser = 'Chrome';
    else if (ua.includes('Safari/') && !ua.includes('Chrome/'))
      browser = 'Safari';
    else if (ua.includes('Edg/')) browser = 'Edge';

    if (
      ua.includes('Mobile') ||
      ua.includes('Android') ||
      ua.includes('iPhone')
    ) {
      device = 'Mobile';
    }

    if (ua.includes('Windows')) os = 'Windows';
    else if (ua.includes('Mac OS')) os = 'macOS';
    else if (ua.includes('Linux')) os = 'Linux';
    else if (ua.includes('Android')) os = 'Android';
    else if (ua.includes('iPhone') || ua.includes('iPad')) os = 'iOS';

    return { browser, device, os };
  }
}

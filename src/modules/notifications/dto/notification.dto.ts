import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination.dto';

export class CreateNotificationDto {
  @ApiProperty({ example: 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d' })
  @IsUUID()
  userId: string;

  @ApiProperty({ example: 'gift_received' })
  @IsString()
  @MaxLength(50)
  type: string;

  @ApiProperty({ example: 'You received a gift!' })
  @IsString()
  @MaxLength(200)
  title: string;

  @ApiPropertyOptional({ example: 'A viewer sent you a gift' })
  @IsOptional()
  @IsString()
  body?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  data?: Record<string, unknown>;

  @ApiPropertyOptional({ example: '2026-08-06T12:00:00Z' })
  @IsOptional()
  @IsDateString()
  scheduledAt?: string;
}

export class BroadcastNotificationDto {
  @ApiProperty({ example: 'system_announcement' })
  @IsString()
  @MaxLength(50)
  type: string;

  @ApiProperty({ example: 'Maintenance scheduled tonight' })
  @IsString()
  @MaxLength(200)
  title: string;

  @ApiPropertyOptional({ example: 'The platform will be under maintenance' })
  @IsOptional()
  @IsString()
  body?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  data?: Record<string, unknown>;

  @ApiPropertyOptional({ example: '2026-08-06T12:00:00Z' })
  @IsOptional()
  @IsDateString()
  scheduledAt?: string;
}

export class NotificationQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ example: 'gift_received' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  type?: string;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isRead?: boolean;
}

import {
  IsString,
  IsEnum,
  IsOptional,
  IsNumber,
  IsBoolean,
  IsUrl,
  IsDateString,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { BannerTargetType } from '../entities/banner.entity';

export class CreateBannerDto {
  @IsString()
  title: string;

  @IsString()
  imageUrl: string;

  @IsEnum(BannerTargetType)
  targetType: BannerTargetType;

  @IsOptional()
  @IsString()
  targetValue?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  sortOrder?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;
}

export class UpdateBannerDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  imageUrl?: string;

  @IsOptional()
  @IsEnum(BannerTargetType)
  targetType?: BannerTargetType;

  @IsOptional()
  @IsString()
  targetValue?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  sortOrder?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;
}

export class BannerQueryDto {
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  page?: number = 1;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  limit?: number = 20;

  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  isActiveOnly?: boolean;

  @IsOptional()
  @IsString()
  search?: string;
}

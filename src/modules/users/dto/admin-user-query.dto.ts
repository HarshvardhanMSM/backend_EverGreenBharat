import { IsOptional, IsString, IsInt, IsEnum, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { UserStatus } from '../../../common/enums/user-status.enum';
import { VerificationStatus } from '../../../common/enums/verification-status.enum';
import { AuthProvider } from '../../../common/enums/auth-provider.enum';

export class AdminUserQueryDto {
  @ApiPropertyOptional({ example: 1, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ example: 20, default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @ApiPropertyOptional({
    example: 'john',
    description: 'Free-text search query',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    enum: UserStatus,
    description: 'Filter by user status',
  })
  @IsOptional()
  @IsEnum(UserStatus)
  status?: UserStatus;

  @ApiPropertyOptional({
    enum: VerificationStatus,
    description: 'Filter by verification status',
  })
  @IsOptional()
  @IsEnum(VerificationStatus)
  verificationStatus?: VerificationStatus;

  @ApiPropertyOptional({
    example: 'US',
    description: 'Filter by ISO 2-letter country code',
  })
  @IsOptional()
  @IsString()
  country?: string;

  @ApiPropertyOptional({
    enum: AuthProvider,
    description: 'Filter by auth provider',
  })
  @IsOptional()
  @IsEnum(AuthProvider)
  authProvider?: AuthProvider;

  @ApiPropertyOptional({
    example: 'createdAt:desc',
    description: 'Sort criteria',
  })
  @IsOptional()
  @IsString()
  sort?: string = 'createdAt:desc';
}

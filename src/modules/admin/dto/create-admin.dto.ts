import {
  IsEmail,
  IsString,
  MinLength,
  IsOptional,
  IsArray,
  IsBoolean,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateAdminDto {
  @ApiProperty({ example: 'admin@stream.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'johndoe_admin' })
  @IsString()
  @MinLength(3)
  username: string;

  @ApiProperty({ example: 'AdminPass@12345' })
  @IsString()
  @MinLength(8)
  password: string;

  @ApiPropertyOptional({ example: 'John Doe' })
  @IsOptional()
  @IsString()
  displayName?: string;

  @ApiPropertyOptional({ example: 'Security & Moderation' })
  @IsOptional()
  @IsString()
  department?: string;

  @ApiPropertyOptional({
    example: 'Initial admin account for compliance officer',
  })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ example: 'https://example.com/avatar.jpg' })
  @IsOptional()
  @IsString()
  avatarUrl?: string;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  isSuperAdmin?: boolean;

  @ApiPropertyOptional({ example: ['MODERATOR'], type: [String] })
  @IsOptional()
  @IsArray()
  roleCodes?: string[];
}

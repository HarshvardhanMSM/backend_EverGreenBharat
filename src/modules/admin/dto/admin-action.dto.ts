import { IsString, MinLength, IsArray, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SuspendAdminDto {
  @ApiProperty({ example: 'Violation of security protocol' })
  @IsString()
  reason: string;
}

export class ResetAdminPasswordDto {
  @ApiProperty({ example: 'NewSecret@12345' })
  @IsString()
  @MinLength(8)
  newPassword: string;
}

export class AssignAdminRolesDto {
  @ApiProperty({ example: ['MODERATOR', 'FINANCE_MANAGER'], type: [String] })
  @IsArray()
  @IsString({ each: true })
  roleCodes: string[];
}

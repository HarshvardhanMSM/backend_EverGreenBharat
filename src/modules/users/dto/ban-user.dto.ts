import {
  IsNotEmpty,
  IsString,
  IsArray,
  ArrayNotEmpty,
  IsEnum,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class BanUserDto {
  @ApiProperty({ example: 'Severe platform abuse and spamming' })
  @IsNotEmpty()
  @IsString()
  reason: string;
}

export enum BulkActionType {
  SUSPEND = 'SUSPEND',
  BAN = 'BAN',
  ACTIVATE = 'ACTIVATE',
}

export class BulkUserActionDto {
  @ApiProperty({ example: ['123e4567-e89b-12d3-a456-426614174000'] })
  @IsArray()
  @ArrayNotEmpty()
  userIds: string[];

  @ApiProperty({ enum: BulkActionType })
  @IsEnum(BulkActionType)
  action: BulkActionType;

  @ApiProperty({ example: 'Batch security review cleanup' })
  @IsNotEmpty()
  @IsString()
  reason: string;
}

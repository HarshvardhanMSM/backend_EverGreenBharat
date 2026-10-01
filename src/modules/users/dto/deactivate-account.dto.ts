import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class DeactivateAccountDto {
  @ApiProperty({ example: 'CurrentP@ss123' })
  @IsNotEmpty()
  @IsString()
  password: string;
}

export class DeleteAccountDto {
  @ApiProperty({ example: 'CurrentP@ss123' })
  @IsNotEmpty()
  @IsString()
  password: string;
}

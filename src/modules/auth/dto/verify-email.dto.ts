import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsNotEmpty,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class VerifyEmailDto {
  @ApiProperty({
    example: 'user@example.com',
    description: 'Email address to verify',
  })
  @IsEmail()
  @IsNotEmpty({ message: 'Email address is required' })
  email: string;

  @ApiProperty({ example: '123456', description: '6-digit verification code' })
  @IsString()
  @IsNotEmpty({ message: 'Verification code is required' })
  @MinLength(6, { message: 'Code must be 6 digits' })
  @MaxLength(6, { message: 'Code must be 6 digits' })
  code: string;
}

import { IsNotEmpty, IsString, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

const PHONE_PATTERN = /^\+?[1-9]\d{7,14}$/;

export class RequestPhoneDto {
  @ApiProperty({
    example: '+15551234567',
    description: 'Phone number in E.164 format',
  })
  @IsNotEmpty()
  @IsString()
  @Matches(PHONE_PATTERN, {
    message: 'Phone number must be a valid E.164 number',
  })
  phone: string;
}

export class VerifyPhoneDto extends RequestPhoneDto {
  @ApiProperty({ example: '123456', description: '6-digit verification code' })
  @IsNotEmpty()
  @IsString()
  @Matches(/^\d{6}$/, { message: 'Code must be exactly 6 digits' })
  code: string;
}

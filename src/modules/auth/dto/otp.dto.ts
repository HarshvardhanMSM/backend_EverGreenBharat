import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { OtpPurpose } from '../entities/otp-code.entity';

export class RequestEmailOtpDto {
  @ApiProperty({ example: 'user@example.com', description: 'Email address' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({
    enum: [OtpPurpose.EMAIL_VERIFICATION, OtpPurpose.PASSWORD_RESET],
    example: OtpPurpose.EMAIL_VERIFICATION,
    description: 'Purpose of the OTP',
  })
  @IsEnum(OtpPurpose)
  purpose: OtpPurpose;
}

export class RequestPhoneOtpDto {
  @ApiProperty({
    example: '+15551234567',
    description: 'Phone number in E.164 format',
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/^\+?[1-9]\d{7,14}$/, {
    message: 'Phone number must be in a valid international format',
  })
  phone: string;
}

export class ResendEmailVerificationDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail()
  @IsNotEmpty()
  email: string;
}

export class VerifyEmailOtpDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ example: '123456', description: '6-digit verification code' })
  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  @MaxLength(6)
  code: string;
}

export class PhoneLoginDto {
  @ApiProperty({
    example: '+15551234567',
    description: 'Phone number in E.164 format',
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/^\+?[1-9]\d{7,14}$/, {
    message: 'Phone number must be in a valid international format',
  })
  phone: string;

  @ApiProperty({ example: '123456', description: '6-digit verification code' })
  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  @MaxLength(6)
  code: string;
}

export class GoogleLoginDto {
  @ApiProperty({ description: 'Google id_token from Google Sign-In SDK' })
  @IsString()
  @IsNotEmpty()
  idToken: string;
}

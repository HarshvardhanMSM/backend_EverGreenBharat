import { IsEmail, IsNotEmpty, IsString, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ChangeEmailDto {
  @ApiProperty({ example: 'newemail@domain.com' })
  @IsNotEmpty()
  @IsEmail()
  newEmail: string;
}

export class ConfirmEmailChangeDto {
  @ApiProperty({ example: 'newemail@domain.com' })
  @IsNotEmpty()
  @IsEmail()
  newEmail: string;

  @ApiProperty({ example: '123456', description: '6-digit verification code' })
  @IsNotEmpty()
  @IsString()
  @Matches(/^\d{6}$/, { message: 'Code must be exactly 6 digits' })
  code: string;
}

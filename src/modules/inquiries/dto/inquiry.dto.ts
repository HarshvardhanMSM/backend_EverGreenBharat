import {
  IsString,
  IsNotEmpty,
  IsEmail,
  IsEnum,
  IsOptional,
  IsNumber,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { InquiryStatus } from '../../../common/enums/nursery.enums';

export class CreateInquiryDto {
  @ApiProperty({ example: 'Rohan Sharma' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 'Apollo Hospital & Wellness' })
  @IsString()
  @IsNotEmpty()
  companyName: string;

  @ApiProperty({ example: 'procurement@apollo.org' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ example: '+919876543210' })
  @IsString()
  @IsNotEmpty()
  contactNumber: string;

  @ApiProperty({
    example:
      'Requirement for 250 indoor air-purifying desk plants, vertical green wall in lobby, and recurring monthly maintenance.',
  })
  @IsString()
  @IsNotEmpty()
  purpose: string;
}

export class UpdateInquiryStatusDto {
  @ApiProperty({ enum: InquiryStatus })
  @IsEnum(InquiryStatus)
  status: InquiryStatus;

  @ApiPropertyOptional({ example: 'Spoke with facilities manager, sent landscaping proposal' })
  @IsString()
  @IsOptional()
  note?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  assignedAdminId?: string;
}

export class AddInquiryNoteDto {
  @ApiProperty({ example: 'Scheduled site visit for Thursday at 11 AM.' })
  @IsString()
  @IsNotEmpty()
  text: string;
}

export class InquiryQueryDto {
  @ApiPropertyOptional({ enum: InquiryStatus })
  @IsEnum(InquiryStatus)
  @IsOptional()
  status?: InquiryStatus;

  @ApiPropertyOptional({ example: 'apollo' })
  @IsString()
  @IsOptional()
  search?: string;

  @ApiPropertyOptional({ default: 1 })
  @IsNumber()
  @IsOptional()
  page?: number = 1;

  @ApiPropertyOptional({ default: 20 })
  @IsNumber()
  @IsOptional()
  limit?: number = 20;
}

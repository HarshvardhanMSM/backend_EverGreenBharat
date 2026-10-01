import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsArray,
  IsEnum,
  IsObject,
  IsNumber,
  IsBoolean,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { ApprovalStatus } from '../../../common/enums/nursery.enums';

export class UpdateVendorStoreDto {
  @ApiProperty({ example: 'GreenThumb Organics Nursery' })
  @IsString()
  @IsNotEmpty()
  businessName: string;

  @ApiProperty({ example: 'GreenThumb Nursery' })
  @IsString()
  @IsNotEmpty()
  storeName: string;

  @ApiProperty({ example: 'greenthumb-nursery' })
  @IsString()
  @IsNotEmpty()
  storeSlug: string;

  @ApiPropertyOptional({ example: '/uploads/stores/logo.jpg' })
  @IsString()
  @IsOptional()
  storeLogo?: string;

  @ApiPropertyOptional({ example: ['/uploads/stores/banner-1.jpg'] })
  @IsArray()
  @IsOptional()
  storeBanners?: string[];

  @ApiPropertyOptional({ example: 'Specialists in indoor exotic plants, succulents, and ceramic pots.' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ example: 'contact@greenthumb.com' })
  @IsString()
  @IsNotEmpty()
  supportEmail: string;

  @ApiProperty({ example: '+919876543210' })
  @IsString()
  @IsNotEmpty()
  supportPhone: string;

  @ApiProperty({
    example: {
      street: '12 Plant Lane, HSR Layout',
      city: 'Bengaluru',
      state: 'Karnataka',
      postalCode: '560102',
      latitude: 12.9116,
      longitude: 77.6389,
    },
  })
  @IsObject()
  address: {
    street: string;
    city: string;
    state: string;
    postalCode: string;
    latitude?: number;
    longitude?: number;
  };

  @ApiProperty({
    example: {
      serviceablePincodes: ['560102', '560034', '560068', '560100'],
      radiusKm: 20,
      minOrderAmount: 299,
      freeDeliveryAbove: 999,
    },
  })
  @IsObject()
  deliveryArea: {
    serviceablePincodes: string[];
    radiusKm: number;
    minOrderAmount?: number;
    freeDeliveryAbove?: number;
  };
}

export class VendorApprovalDto {
  @ApiProperty({ enum: ApprovalStatus })
  @IsEnum(ApprovalStatus)
  status: ApprovalStatus;

  @ApiPropertyOptional({ example: 'Incomplete business documents provided' })
  @IsString()
  @IsOptional()
  rejectionReason?: string;
}

export class VendorQueryDto {
  @ApiPropertyOptional({ example: 'greenthumb' })
  @IsString()
  @IsOptional()
  search?: string;

  @ApiPropertyOptional({ enum: ApprovalStatus })
  @IsEnum(ApprovalStatus)
  @IsOptional()
  approvalStatus?: ApprovalStatus;

  @ApiPropertyOptional({ default: 1 })
  @IsNumber()
  @IsOptional()
  page?: number = 1;

  @ApiPropertyOptional({ default: 20 })
  @IsNumber()
  @IsOptional()
  limit?: number = 20;
}

export class AdminUpdateVendorDto extends PartialType(UpdateVendorStoreDto) {
  @ApiPropertyOptional({ enum: ApprovalStatus })
  @IsEnum(ApprovalStatus)
  @IsOptional()
  approvalStatus?: ApprovalStatus;

  @ApiPropertyOptional({ example: 'Documents incomplete' })
  @IsString()
  @IsOptional()
  rejectionReason?: string;

  @ApiPropertyOptional({ example: true })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}


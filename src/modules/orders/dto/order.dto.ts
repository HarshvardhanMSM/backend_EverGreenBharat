import {
  IsString,
  IsNotEmpty,
  IsEnum,
  IsObject,
  IsOptional,
  IsNumber,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  OrderStatus,
  PaymentMethod,
} from '../../../common/enums/nursery.enums';

export class PlaceOrderDto {
  @ApiProperty({
    example: {
      fullName: 'John Doe',
      phone: '+919876543210',
      addressLine1: 'Flat 402, Green Valley Apartments',
      city: 'Bengaluru',
      state: 'Karnataka',
      postalCode: '560001',
    },
  })
  @IsObject()
  @IsNotEmpty()
  shippingAddress: {
    fullName: string;
    phone: string;
    addressLine1: string;
    addressLine2?: string;
    city: string;
    state: string;
    postalCode: string;
    latitude?: number;
    longitude?: number;
  };

  @ApiProperty({ enum: PaymentMethod, example: PaymentMethod.COD })
  @IsEnum(PaymentMethod)
  paymentMethod: PaymentMethod;
}

export class UpdateOrderStatusDto {
  @ApiProperty({ enum: OrderStatus, example: OrderStatus.PROCESSING })
  @IsEnum(OrderStatus)
  status: OrderStatus;

  @ApiPropertyOptional({ example: 'Dispatched with local delivery executive' })
  @IsString()
  @IsOptional()
  note?: string;
}

export class VerifyDeliveryOtpDto {
  @ApiProperty({ example: '482910', description: '6-digit doorstep delivery OTP' })
  @IsString()
  @IsNotEmpty()
  otp: string;
}

export class OrderQueryDto {
  @ApiPropertyOptional({ example: 'ORD-2026' })
  @IsString()
  @IsOptional()
  search?: string;

  @ApiPropertyOptional({ enum: OrderStatus })
  @IsEnum(OrderStatus)
  @IsOptional()
  status?: OrderStatus;

  @ApiPropertyOptional({ default: 1 })
  @IsNumber()
  @IsOptional()
  page?: number = 1;

  @ApiPropertyOptional({ default: 20 })
  @IsNumber()
  @IsOptional()
  limit?: number = 20;
}

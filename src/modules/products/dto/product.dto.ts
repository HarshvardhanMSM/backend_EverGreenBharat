import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  IsArray,
  IsEnum,
  IsUUID,
  IsObject,
} from 'class-validator';
import {
  ApiProperty,
  ApiPropertyOptional,
  PartialType,
} from '@nestjs/swagger';
import { ProductStatus } from '../../../common/enums/nursery.enums';

export class CreateProductDto {
  @ApiPropertyOptional({
    description: 'UUID of Master Product if selected from autosuggest',
    example: 'd9b2d63d-a232-4e4b-91c2-3e28492023a1',
  })
  @IsUUID()
  @IsOptional()
  masterProductId?: string;

  @ApiPropertyOptional({
    description: 'UUID of assigned category',
    example: 'c8a1d52b-3122-4a3b-81b1-2d17381912a0',
  })
  @IsUUID()
  @IsOptional()
  categoryId?: string;

  @ApiPropertyOptional({
    description: 'UUID of assigned subcategory',
    example: 'd8a1d52b-3122-4a3b-81b1-2d17381912a1',
  })
  @IsUUID()
  @IsOptional()
  subcategoryId?: string;

  @ApiProperty({ example: 'Golden Pothos (Devil\'s Ivy)' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 'Air purifying, trailing indoor plant with variegated green-yellow leaves.' })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiPropertyOptional({ example: ['/uploads/products/pothos-1.jpg'] })
  @IsArray()
  @IsOptional()
  images?: string[];

  @ApiProperty({ example: 299.0 })
  @IsNumber()
  price: number;

  @ApiPropertyOptional({ example: 249.0 })
  @IsNumber()
  @IsOptional()
  discountPrice?: number;

  @ApiPropertyOptional({ example: 25 })
  @IsNumber()
  @IsOptional()
  stockQuantity?: number;

  @ApiPropertyOptional({ example: 25 })
  @IsNumber()
  @IsOptional()
  stock?: number;

  @ApiPropertyOptional({
    example: {
      plantHeightCm: 30,
      potIncluded: true,
      potMaterial: 'Plastic Nursery Pot',
      potColor: 'Terracotta Red',
      careLevel: 'Easy',
    },
  })
  @IsObject()
  @IsOptional()
  attributes?: Record<string, any>;

  @ApiPropertyOptional({
    example: {
      isFragile: true,
      packagingWeightGrams: 800,
      estimatedDeliveryDays: 2,
    },
  })
  @IsObject()
  @IsOptional()
  deliveryInfo?: Record<string, any>;

  @ApiPropertyOptional({
    description: 'Multilingual translations for name, description, etc. keyed by language code (e.g. hi, bn, mr)',
    example: {
      hi: {
        name: 'मनी प्लांट (गोल्डन पोथोस)',
        description: 'हवा शुद्ध करने वाला, आसानी से उगने वाला इनडोर पौधा।',
      },
    },
  })
  @IsObject()
  @IsOptional()
  translations?: Record<string, any>;
}

export class UpdateProductDto extends PartialType(CreateProductDto) {
  @ApiPropertyOptional({ enum: ProductStatus })
  @IsEnum(ProductStatus)
  @IsOptional()
  status?: ProductStatus;
}

export class ProductQueryDto {
  @ApiPropertyOptional({ example: 'indoor' })
  @IsString()
  @IsOptional()
  q?: string;

  @ApiPropertyOptional()
  @IsUUID()
  @IsOptional()
  categoryId?: string;

  @ApiPropertyOptional()
  @IsUUID()
  @IsOptional()
  subcategoryId?: string;

  @ApiPropertyOptional()
  @IsUUID()
  @IsOptional()
  vendorId?: string;

  @ApiPropertyOptional({ example: 100 })
  @IsNumber()
  @IsOptional()
  minPrice?: number;

  @ApiPropertyOptional({ example: 1500 })
  @IsNumber()
  @IsOptional()
  maxPrice?: number;

  @ApiPropertyOptional({ enum: ProductStatus })
  @IsEnum(ProductStatus)
  @IsOptional()
  status?: ProductStatus;

  @ApiPropertyOptional({ default: 1 })
  @IsNumber()
  @IsOptional()
  page?: number = 1;

  @ApiPropertyOptional({ default: 20 })
  @IsNumber()
  @IsOptional()
  limit?: number = 20;

  @ApiPropertyOptional({ example: 'price_asc' })
  @IsString()
  @IsOptional()
  sort?: string;
}

import { IsUUID, IsInt, Min, IsOptional, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AddCartItemDto {
  @ApiProperty({
    description: 'Product UUID to add to cart',
    example: 'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d',
  })
  @IsUUID()
  productId: string;

  @ApiPropertyOptional({
    description: 'Quantity of the product to add',
    default: 1,
    minimum: 1,
    example: 1,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  quantity?: number = 1;

  @ApiPropertyOptional({
    description:
      'If true and cart contains plants from another nursery, the existing cart will be replaced with this new vendor item.',
    default: false,
    example: false,
  })
  @IsOptional()
  @IsBoolean()
  replaceCart?: boolean = false;
}

export class UpdateCartItemDto {
  @ApiProperty({
    description: 'Updated quantity for the cart item (0 removes the item)',
    minimum: 0,
    example: 2,
  })
  @IsInt()
  @Min(0)
  quantity: number;
}

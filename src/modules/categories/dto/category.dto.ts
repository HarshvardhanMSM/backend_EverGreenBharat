import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  IsObject,
  IsArray,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { PaginationQueryDto } from '../../../common/dto/pagination.dto';

export class CreateCategoryDto {
  @ApiPropertyOptional({ example: 'Gaming' })
  @IsString()
  @MaxLength(50)
  name: string;

  @ApiPropertyOptional({ example: 'gaming' })
  @IsOptional()
  @IsString()
  @MaxLength(60)
  slug?: string;

  @ApiPropertyOptional({ example: 'Live gaming streams and tournaments' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  iconUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  imageUrl?: string;

  @ApiPropertyOptional({ description: 'Parent category UUID if this is a subcategory' })
  @IsOptional()
  @IsString()
  parentId?: string;

  @ApiPropertyOptional({ example: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  sortOrder?: number;

  @ApiPropertyOptional({
    description: 'Multilingual translations for category name & description',
    example: { hi: { name: 'इनडोर पौधे', description: 'घर के अंदर रखे जाने वाले पौधे' } },
  })
  @IsOptional()
  @IsObject()
  translations?: Record<string, { name?: string; description?: string }>;
}

export class UpdateCategoryDto {
  @ApiPropertyOptional({ example: 'Gaming' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  name?: string;

  @ApiPropertyOptional({ example: 'Live gaming streams and tournaments' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  iconUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  imageUrl?: string;

  @ApiPropertyOptional({ description: 'Parent category UUID if this is a subcategory' })
  @IsOptional()
  @IsString()
  parentId?: string;

  @ApiPropertyOptional({ example: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  sortOrder?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({
    description: 'Multilingual translations for category name & description',
    example: { hi: { name: 'इनडोर पौधे', description: 'घर के अंदर रखे जाने वाले पौधे' } },
  })
  @IsOptional()
  @IsObject()
  translations?: Record<string, { name?: string; description?: string }>;
}

export class CategoryQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  activeOnly?: boolean;

  @ApiPropertyOptional({ description: 'Filter only top-level categories' })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  parentOnly?: boolean;

  @ApiPropertyOptional({ description: 'Filter subcategories by parent category ID' })
  @IsOptional()
  @IsString()
  parentId?: string;
}

export class UpdateCategoryStatusDto {
  @ApiPropertyOptional({ example: true })
  @IsBoolean()
  isActive: boolean;
}

export class ReorderCategoryItemDto {
  @ApiPropertyOptional({ example: 'uuid-123' })
  @IsString()
  id: string;

  @ApiPropertyOptional({ example: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  sortOrder: number;
}

export class ReorderCategoriesDto {
  @ApiPropertyOptional({ type: [ReorderCategoryItemDto] })
  @IsArray()
  items: ReorderCategoryItemDto[];
}

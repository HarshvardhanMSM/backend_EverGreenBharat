import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsArray,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  AttributeDataType,
  AttributeRequiredLevel,
} from '../entities/category-attribute.entity';

export class CreateCategoryAttributeDto {
  @ApiProperty({ example: 'Plant Height' })
  @IsString()
  @IsNotEmpty()
  attributeName: string;

  @ApiProperty({
    enum: AttributeDataType,
    example: AttributeDataType.NUMBER_UNIT,
  })
  @IsEnum(AttributeDataType)
  dataType: AttributeDataType;

  @ApiPropertyOptional({ example: ['cm', 'inch', 'ft'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  unitOptions?: string[];

  @ApiPropertyOptional({ example: ['Bright Indirect', 'Low Light', 'Full Sun'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  dropdownOptions?: string[];

  @ApiPropertyOptional({
    enum: AttributeRequiredLevel,
    example: AttributeRequiredLevel.REQUIRED,
  })
  @IsOptional()
  @IsEnum(AttributeRequiredLevel)
  requiredLevel?: AttributeRequiredLevel;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  filterable?: boolean;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  displayOrder?: number;
}

export class UpdateCategoryAttributeDto {
  @ApiPropertyOptional({ example: 'Plant Height' })
  @IsOptional()
  @IsString()
  attributeName?: string;

  @ApiPropertyOptional({ enum: AttributeDataType })
  @IsOptional()
  @IsEnum(AttributeDataType)
  dataType?: AttributeDataType;

  @ApiPropertyOptional({ example: ['cm', 'inch', 'ft'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  unitOptions?: string[];

  @ApiPropertyOptional({ example: ['Indoor', 'Outdoor', 'Both'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  dropdownOptions?: string[];

  @ApiPropertyOptional({ enum: AttributeRequiredLevel })
  @IsOptional()
  @IsEnum(AttributeRequiredLevel)
  requiredLevel?: AttributeRequiredLevel;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  filterable?: boolean;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  displayOrder?: number;
}

export class ReorderItemDto {
  @ApiProperty({ example: 'uuid-123' })
  @IsString()
  id: string;

  @ApiProperty({ example: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  displayOrder: number;
}

export class ReorderItemsDto {
  @ApiProperty({ type: [ReorderItemDto] })
  @IsArray()
  items: ReorderItemDto[];
}

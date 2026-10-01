import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsArray,
  IsNumber,
  IsObject,
  IsUUID,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  MasterProductSource,
  MasterProductStatus,
} from '../../../common/enums/nursery.enums';

export class CreateMasterProductDto {
  @ApiProperty({ example: 'Monstera Deliciosa (Swiss Cheese Plant)' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ example: 'Monstera deliciosa' })
  @IsString()
  @IsOptional()
  scientificName?: string;

  @ApiProperty({ example: 'Iconic tropical indoor houseplant with fenestrated leaves.' })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiPropertyOptional()
  @IsUUID()
  @IsOptional()
  categoryId?: string;

  @ApiPropertyOptional()
  @IsUUID()
  @IsOptional()
  subcategoryId?: string;

  @ApiPropertyOptional({
    example: {
      careLevel: 'Easy',
      sunlightRequirement: 'Bright Indirect Light',
      wateringSchedule: 'Weekly',
      airPurifying: true,
    },
  })
  @IsObject()
  @IsOptional()
  attributes?: Record<string, any>;

  @ApiPropertyOptional({
    example: {
      plantType: 'Indoor Foliage',
      sunlight: 'Medium to Bright Indirect',
      waterRequirement: 'Every 1-2 weeks',
      careLevel: 'Easy',
      indoorOutdoor: 'Indoor',
    },
  })
  @IsOptional()
  specifications?: Record<string, any>;

  @ApiPropertyOptional({ example: 'Indoor Plants' })
  @IsString()
  @IsOptional()
  suggestedCategory?: string;

  @ApiPropertyOptional({ example: ['/uploads/products/monstera-ref.jpg'] })
  @IsArray()
  @IsOptional()
  referenceImages?: string[];

  @ApiPropertyOptional({ enum: MasterProductSource, default: MasterProductSource.ADMIN })
  @IsEnum(MasterProductSource)
  @IsOptional()
  source?: MasterProductSource;

  @ApiPropertyOptional({
    description: 'Multilingual translations for master plant catalog item',
    example: {
      hi: {
        name: 'मॉन्स्टेरा डेलिसिओसा',
        description: 'खिड़कीदार पत्तियों वाला शानदार इनडोर पौधा।',
      },
    },
  })
  @IsObject()
  @IsOptional()
  translations?: Record<string, any>;
}

export class UpdateMasterProductDto extends CreateMasterProductDto {
  @ApiPropertyOptional({ enum: MasterProductStatus })
  @IsEnum(MasterProductStatus)
  @IsOptional()
  status?: MasterProductStatus;
}

export class MasterProductQueryDto {
  @ApiPropertyOptional({ example: 'monstera' })
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

  @ApiPropertyOptional({ enum: MasterProductSource })
  @IsEnum(MasterProductSource)
  @IsOptional()
  source?: MasterProductSource;

  @ApiPropertyOptional({ enum: MasterProductStatus })
  @IsEnum(MasterProductStatus)
  @IsOptional()
  status?: MasterProductStatus;

  @ApiPropertyOptional({ default: 1 })
  @IsNumber()
  @IsOptional()
  page?: number = 1;

  @ApiPropertyOptional({ default: 20 })
  @IsNumber()
  @IsOptional()
  limit?: number = 20;
}

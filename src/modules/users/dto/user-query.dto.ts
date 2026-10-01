import { IsOptional, IsString, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UserQueryDto {
  @ApiPropertyOptional({ example: 1, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ example: 20, default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @ApiPropertyOptional({
    example: 'john',
    description: 'Free text search string',
  })
  @IsOptional()
  @IsString()
  query?: string;

  @ApiPropertyOptional({
    example: 'createdAt:desc',
    description: 'Sort criteria',
  })
  @IsOptional()
  @IsString()
  sort?: string = 'createdAt:desc';
}

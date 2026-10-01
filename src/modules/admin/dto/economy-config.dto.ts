import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsOptional, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateEconomyConfigDto {
  @ApiPropertyOptional({
    example: 100,
    description: 'Number of in-app coins per 1.00 USD',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100000)
  coinsPerUsd?: number;

  @ApiPropertyOptional({
    example: 30,
    description: 'Platform withdrawal commission rate percentage (0-100)',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(100)
  withdrawalCommissionRate?: number;

  @ApiPropertyOptional({
    example: 100,
    description: 'Minimum coins required for creator withdrawal payout',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  minimumWithdrawalCoins?: number;
}

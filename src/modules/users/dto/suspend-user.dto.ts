import { IsNotEmpty, IsString, IsInt, Min, Max } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SuspendUserDto {
  @ApiProperty({ example: 'Violation of community terms of service' })
  @IsNotEmpty()
  @IsString()
  reason: string;

  @ApiProperty({ example: 7, description: 'Suspension duration in days' })
  @IsNotEmpty()
  @IsInt()
  @Min(1)
  @Max(365)
  durationDays: number;
}

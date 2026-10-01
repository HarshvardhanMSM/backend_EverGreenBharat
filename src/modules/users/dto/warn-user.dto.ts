import { IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class WarnUserDto {
  @ApiProperty({ example: 'Repeated spam behavior in live chat' })
  @IsNotEmpty()
  @IsString()
  @MaxLength(500)
  reason: string;
}

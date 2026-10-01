import {
  IsString,
  IsNotEmpty,
  IsArray,
  IsEnum,
  IsOptional,
  IsNumber,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ApprovalStatus,
  PostMediaType,
} from '../../../common/enums/nursery.enums';

export class InfluencerOptInDto {
  @ApiProperty({ example: 'Passionate bonsai and balcony gardener from Pune.' })
  @IsString()
  @IsNotEmpty()
  bio: string;

  @ApiProperty({
    example: ['Bonsai Cultivation', 'Terrace Gardening', 'Kitchen Herbs', 'Succulents'],
  })
  @IsArray()
  gardeningInterests: string[];
}

export class CreatePostDto {
  @ApiProperty({ enum: PostMediaType, example: PostMediaType.IMAGE })
  @IsEnum(PostMediaType)
  type: PostMediaType;

  @ApiProperty({ example: ['/uploads/influencer-content/bonsai-guide-1.jpg'] })
  @IsArray()
  mediaUrls: string[];

  @ApiProperty({
    example: 'Pruning my 5-year-old Ficus Bonsai today! Swipe to see before and after branches.',
  })
  @IsString()
  @IsNotEmpty()
  caption: string;

  @ApiPropertyOptional({ example: ['bonsai', 'indoorplants', 'greenarmy'] })
  @IsArray()
  @IsOptional()
  tags?: string[];
}

export class ReportContentDto {
  @ApiProperty({ example: 'Spam promotional links or misleading plant care advice' })
  @IsString()
  @IsNotEmpty()
  reason: string;
}

export class InfluencerApprovalDto {
  @ApiProperty({ enum: ApprovalStatus })
  @IsEnum(ApprovalStatus)
  status: ApprovalStatus;

  @ApiPropertyOptional({ example: 'Approved for Green Army badge' })
  @IsString()
  @IsOptional()
  rejectionReason?: string;
}

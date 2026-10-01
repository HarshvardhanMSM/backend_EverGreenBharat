import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { InfluencersService } from './influencers.service';
import {
  InfluencerOptInDto,
  CreatePostDto,
  ReportContentDto,
  InfluencerApprovalDto,
} from './dto/influencer.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';

@ApiTags('Green Army Community')
@Controller('v1')
export class InfluencersController {
  constructor(private readonly service: InfluencersService) {}

  @Post('influencer/opt-in')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Customer applies to join Green Army gardening creators',
  })
  async optIn(
    @CurrentUser('id') userId: string,
    @Body() dto: InfluencerOptInDto,
  ) {
    return this.service.optIn(userId, dto);
  }

  @Get('influencer/profile')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get current user influencer profile and posts' })
  async getProfile(@CurrentUser('id') userId: string) {
    return this.service.getProfile(userId);
  }

  @Post('influencer/content')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Publish gardening post or video reel' })
  async createPost(
    @CurrentUser('id') userId: string,
    @Body() dto: CreatePostDto,
  ) {
    return this.service.createPost(userId, dto);
  }

  @Get('feed')
  @Public()
  @ApiOperation({ summary: 'Public paginated Green Army community feed' })
  async getFeed(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.service.getFeed(page ? Number(page) : 1, limit ? Number(limit) : 20);
  }

  @Post('content/:id/like')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Like or unlike a community post' })
  @ApiParam({ name: 'id', type: String })
  async toggleLike(
    @CurrentUser('id') userId: string,
    @Param('id') postId: string,
  ) {
    return this.service.toggleLike(userId, postId);
  }

  @Post('influencers/:id/follow')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Follow or unfollow a Green Army Influencer' })
  @ApiParam({ name: 'id', type: String })
  async toggleFollow(
    @CurrentUser('id') userId: string,
    @Param('id') influencerId: string,
  ) {
    return this.service.toggleFollow(userId, influencerId);
  }

  @Post('content/:id/report')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Report inappropriate community content for moderation' })
  @ApiParam({ name: 'id', type: String })
  async reportContent(
    @CurrentUser('id') userId: string,
    @Param('id') postId: string,
    @Body() dto: ReportContentDto,
  ) {
    return this.service.reportContent(userId, postId, dto);
  }
}

@ApiTags('Admin Green Army')
@Controller('v1/admin')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth('JWT-auth')
export class AdminInfluencersController {
  constructor(private readonly service: InfluencersService) {}

  @Get('influencers')
  @ApiOperation({ summary: 'List all Green Army influencer applications' })
  async findAll(@Query('page') page?: number, @Query('limit') limit?: number) {
    return this.service.findAllInfluencersAdmin(
      page ? Number(page) : 1,
      limit ? Number(limit) : 20,
    );
  }

  @Patch('influencers/:id/approval')
  @ApiOperation({ summary: 'Approve or reject Green Army badge application' })
  @ApiParam({ name: 'id', type: String })
  async updateApproval(
    @Param('id') id: string,
    @Body() dto: InfluencerApprovalDto,
  ) {
    return this.service.updateApprovalAdmin(id, dto);
  }

  @Get('content/reported')
  @ApiOperation({ summary: 'Get list of reported posts awaiting moderation' })
  async getReportedContent(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.service.findReportedContentAdmin(
      page ? Number(page) : 1,
      limit ? Number(limit) : 20,
    );
  }

  @Patch('content/reports/:id/resolve')
  @ApiOperation({ summary: 'Take moderation action on reported post' })
  @ApiParam({ name: 'id', type: String })
  async resolveReport(
    @Param('id') id: string,
    @Body('action') action: 'remove' | 'dismiss',
  ) {
    return this.service.resolveReportAdmin(id, action);
  }
}

import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { Public } from '../../../common/decorators/public.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { UserFollowsService } from '../services/user-follows.service';

@ApiTags('User Follows')
@Controller('v1/users')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class UserFollowsController {
  constructor(private readonly userFollowsService: UserFollowsService) {}

  @Post('follow/:creatorId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Follow a creator' })
  @ApiParam({ name: 'creatorId', type: String })
  async followCreator(
    @CurrentUser('id') userId: string,
    @Param('creatorId') creatorId: string,
  ) {
    const result = await this.userFollowsService.followCreator(
      userId,
      creatorId,
    );
    return { message: 'Successfully followed creator', data: result };
  }

  @Delete('unfollow/:creatorId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Unfollow a creator' })
  @ApiParam({ name: 'creatorId', type: String })
  async unfollowCreator(
    @CurrentUser('id') userId: string,
    @Param('creatorId') creatorId: string,
  ) {
    const result = await this.userFollowsService.unfollowCreator(
      userId,
      creatorId,
    );
    return { message: 'Successfully unfollowed creator', data: result };
  }

  @Delete('follow/:creatorId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Unfollow a creator (alias)' })
  @ApiParam({ name: 'creatorId', type: String })
  async unfollowCreatorAlias(
    @CurrentUser('id') userId: string,
    @Param('creatorId') creatorId: string,
  ) {
    const result = await this.userFollowsService.unfollowCreator(
      userId,
      creatorId,
    );
    return { message: 'Successfully unfollowed creator', data: result };
  }

  @Get('follow-status/:creatorId')
  @ApiOperation({ summary: 'Check if current user follows a creator' })
  @ApiParam({ name: 'creatorId', type: String })
  async getFollowStatus(
    @CurrentUser('id') userId: string,
    @Param('creatorId') creatorId: string,
  ) {
    const result = await this.userFollowsService.getFollowStatus(
      userId,
      creatorId,
    );
    return { message: 'Follow status retrieved', data: result };
  }

  @Get('me/following')
  @ApiOperation({ summary: 'List creators followed by current user' })
  async getMyFollowing(
    @CurrentUser('id') userId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    const pageNum = page ? Number(page) : 1;
    const limitNum = limit ? Number(limit) : 20;
    const { data, total } = await this.userFollowsService.getFollowingList(
      userId,
      pageNum,
      limitNum,
    );
    return {
      message: 'Following list retrieved',
      data,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    };
  }
}

@ApiTags('User Follows')
@Controller('v1/users')
export class CreatorFollowersController {
  constructor(private readonly userFollowsService: UserFollowsService) {}

  @Get(':id/followers')
  @Public()
  @ApiOperation({ summary: 'Get user followers list' })
  @ApiParam({ name: 'id', type: String })
  async getCreatorFollowers(
    @Param('id') id: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    const pageNum = page ? Number(page) : 1;
    const limitNum = limit ? Number(limit) : 20;
    const { data, total } = await this.userFollowsService.getFollowersList(
      id,
      pageNum,
      limitNum,
    );
    return {
      message: 'Creator followers retrieved',
      data,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    };
  }
}

@ApiTags('Admin User Moderation — Follows')
@Controller('v1/admin/users')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
@ApiBearerAuth('JWT-auth')
export class AdminUserFollowsController {
  constructor(private readonly userFollowsService: UserFollowsService) {}

  @Get(':id/following')
  @ApiOperation({ summary: 'Admin inspect creators followed by a user' })
  async getUserFollowing(
    @Param('id') id: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    const pageNum = page ? Number(page) : 1;
    const limitNum = limit ? Number(limit) : 20;
    const { data, total } = await this.userFollowsService.getFollowingList(
      id,
      pageNum,
      limitNum,
    );
    return {
      message: 'User following list retrieved',
      data,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    };
  }

  @Get(':id/followers')
  @ApiOperation({ summary: 'Admin inspect followers of a user / creator' })
  async getUserFollowers(
    @Param('id') id: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    const pageNum = page ? Number(page) : 1;
    const limitNum = limit ? Number(limit) : 20;
    const { data, total } = await this.userFollowsService.getFollowersList(
      id,
      pageNum,
      limitNum,
    );
    return {
      message: 'User followers list retrieved',
      data,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    };
  }
}

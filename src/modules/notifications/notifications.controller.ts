import {
  Controller,
  Get,
  Post,
  Patch,
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
import { NotificationsService } from './notifications.service';
import {
  CreateNotificationDto,
  BroadcastNotificationDto,
  NotificationQueryDto,
} from './dto/notification.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { PermissionKeys } from '../../common/enums/permission-keys.enum';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Notifications')
@Controller('v1')
export class NotificationsController {
  constructor(private readonly service: NotificationsService) {}

  @Get('notifications')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'List current user notifications with pagination' })
  async findAll(
    @CurrentUser('id') userId: string,
    @Query() query: NotificationQueryDto,
  ) {
    const data = await this.service.findAll(userId, query);
    return { message: 'Notifications retrieved', data };
  }

  @Get('notifications/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get a notification by ID' })
  @ApiParam({ name: 'id', type: String })
  async findOne(@CurrentUser('id') userId: string, @Param('id') id: string) {
    const data = await this.service.findOne(id);
    return { message: 'Notification retrieved', data };
  }

  @Patch('notifications/:id/read')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Mark a notification as read' })
  @ApiParam({ name: 'id', type: String })
  async markRead(@Param('id') id: string) {
    await this.service.markRead(id);
    return { message: 'Notification marked as read' };
  }

  @Patch('notifications/read-all')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Mark all notifications as read' })
  async markAllRead(@CurrentUser('id') userId: string) {
    await this.service.markAllRead(userId);
    return { message: 'All notifications marked as read' };
  }
}

@ApiTags('Admin Notifications')
@Controller('v1/admin/notifications')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth('JWT-auth')
export class AdminNotificationsController {
  constructor(private readonly service: NotificationsService) {}

  @Get()
  @Permissions(PermissionKeys.NOTIFICATIONS_SEND)
  @ApiOperation({ summary: 'List all notifications with pagination (admin)' })
  async findAll(@Query() query: NotificationQueryDto) {
    return this.service.findAll(null, query);
  }

  @Post('broadcast')
  @Permissions(PermissionKeys.NOTIFICATIONS_SEND)
  @ApiOperation({ summary: 'Broadcast a notification to all users' })
  async broadcast(@Body() dto: BroadcastNotificationDto) {
    const data = await this.service.broadcast(dto);
    return { message: 'Notification broadcast scheduled', data };
  }

  @Post()
  @Permissions(PermissionKeys.NOTIFICATIONS_SEND)
  @ApiOperation({ summary: 'Create a notification for a user (admin)' })
  async create(@Body() dto: CreateNotificationDto) {
    const data = await this.service.create(dto);
    return { message: 'Notification created successfully', data };
  }
}

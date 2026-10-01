import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Notification } from './entities/notification.entity';
import { NotificationTemplate } from './entities/notification-template.entity';
import { User } from '../users/entities/user.entity';
import { NotificationsRepository } from './repositories/notifications.repository';
import { NotificationsService } from './notifications.service';
import { EmailService } from './email.service';
import {
  NotificationsController,
  AdminNotificationsController,
} from './notifications.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([Notification, NotificationTemplate, User]),
  ],
  controllers: [NotificationsController, AdminNotificationsController],
  providers: [NotificationsRepository, NotificationsService, EmailService],
  exports: [
    NotificationsService,
    NotificationsRepository,
    EmailService,
    TypeOrmModule,
  ],
})
export class NotificationsModule {}

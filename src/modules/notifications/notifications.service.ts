import {
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotificationsRepository } from './repositories/notifications.repository';
import {
  CreateNotificationDto,
  BroadcastNotificationDto,
  NotificationQueryDto,
} from './dto/notification.dto';
import { Notification } from './entities/notification.entity';
import { User } from '../users/entities/user.entity';
import { I18nService } from '../../common/i18n/i18n.service';

export interface LocalizedNotificationPayload {
  type: string;
  templateKey: string; // e.g. 'order_created', 'order_confirmed', 'out_for_delivery', 'delivered'
  params?: Record<string, any>;
  data?: Record<string, unknown>;
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private readonly notificationsRepository: NotificationsRepository,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly i18nService: I18nService,
  ) {}

  /**
   * Directly creates a notification (e.g. from Admin Panel)
   */
  async create(dto: CreateNotificationDto): Promise<Notification> {
    const notification = await this.notificationsRepository.create({
      userId: dto.userId,
      type: dto.type,
      title: dto.title,
      body: dto.body ?? null,
      data: dto.data ?? null,
      isRead: false,
      scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : null,
    });

    const saved = await this.notificationsRepository.save(notification);
    this.logger.log(`Created notification ${saved.id} for user ${dto.userId}`);
    return saved;
  }

  /**
   * Sends a multilingual localized notification based on the user's preferred language.
   * Templates and titles/bodies are translated using the i18n engine in English, Hindi, or added languages.
   */
  async sendLocalizedNotification(
    userId: string,
    payload: LocalizedNotificationPayload,
  ): Promise<Notification> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      select: { id: true, language: true, phone: true, email: true },
    });

    const userLang = user?.language || 'en';
    const titleKey = `notifications.${payload.templateKey}_title`;
    const bodyKey = `notifications.${payload.templateKey}_body`;

    const title = this.i18nService.t(titleKey, userLang, payload.params);
    const body = this.i18nService.t(bodyKey, userLang, payload.params);

    const notification = await this.notificationsRepository.create({
      userId,
      type: payload.type,
      title,
      body,
      data: payload.data ?? null,
      isRead: false,
      scheduledAt: null,
    });

    const saved = await this.notificationsRepository.save(notification);
    this.logger.log(
      `[i18n Notification] Sent [${payload.templateKey}] to user ${userId} in [${userLang}]: "${title}"`,
    );
    return saved;
  }

  /**
   * Broadcasts a notification to all active users
   */
  async broadcast(dto: BroadcastNotificationDto) {
    const users = await this.userRepository.find({
      select: { id: true, language: true },
      take: 1000,
    });

    let count = 0;
    for (const u of users) {
      const userLang = u.language || 'en';
      const title = this.i18nService.t(dto.title, userLang);
      const body = dto.body ? this.i18nService.t(dto.body, userLang) : null;

      const n = await this.notificationsRepository.create({
        userId: u.id,
        type: dto.type,
        title,
        body,
        data: dto.data ?? null,
        isRead: false,
        scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : null,
      });
      await this.notificationsRepository.save(n);
      count++;
    }

    return { totalSent: count, type: dto.type };
  }

  /**
   * List paginated notifications for a user or admin
   */
  async findAll(userId: string | null, query: NotificationQueryDto) {
    const { page = 1, limit = 20, type, isRead } = query;
    const qb = this.notificationsRepository.repository.createQueryBuilder('n');

    if (userId) {
      qb.where('n.userId = :userId', { userId });
    }
    if (type) {
      qb.andWhere('n.type = :type', { type });
    }
    if (isRead !== undefined) {
      qb.andWhere('n.isRead = :isRead', { isRead });
    }

    qb.orderBy('n.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [data, total] = await qb.getManyAndCount();

    return {
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string): Promise<Notification> {
    const notification = await this.notificationsRepository.findById(id);
    if (!notification) {
      throw new NotFoundException(`Notification ${id} not found`);
    }
    return notification;
  }

  async markRead(id: string): Promise<void> {
    const notification = await this.findOne(id);
    await this.notificationsRepository.markRead(notification.id);
  }

  async markAllRead(userId: string): Promise<void> {
    await this.notificationsRepository.markAllRead(userId);
  }

  async remove(id: string): Promise<void> {
    await this.findOne(id);
    await this.notificationsRepository.softDelete(id);
  }
}

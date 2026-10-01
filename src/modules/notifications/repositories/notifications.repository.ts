import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification } from '../entities/notification.entity';

@Injectable()
export class NotificationsRepository {
  constructor(
    @InjectRepository(Notification)
    private readonly repo: Repository<Notification>,
  ) {}

  get repository(): Repository<Notification> {
    return this.repo;
  }

  async findById(id: string): Promise<Notification | null> {
    return this.repo.findOne({ where: { id } });
  }

  async findByUser(userId: string): Promise<Notification[]> {
    return this.repo.find({ where: { userId } });
  }

  async findUnread(userId: string): Promise<Notification[]> {
    return this.repo.find({ where: { userId, isRead: false } });
  }

  async create(data: Partial<Notification>): Promise<Notification> {
    return this.repo.create(data);
  }

  async save(notification: Notification): Promise<Notification> {
    return this.repo.save(notification);
  }

  async markRead(id: string): Promise<void> {
    await this.repo.update(id, { isRead: true, readAt: new Date() });
  }

  async markAllRead(userId: string): Promise<void> {
    await this.repo.update(
      { userId, isRead: false },
      { isRead: true, readAt: new Date() },
    );
  }

  async softDelete(id: string): Promise<void> {
    await this.repo.softDelete(id);
  }
}

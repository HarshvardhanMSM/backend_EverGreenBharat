import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';

@Entity('notifications')
export class Notification extends BaseEntity {
  @Index('IDX_notifications_user_id')
  @Column({ type: 'uuid' })
  userId: string;

  @Index('IDX_notifications_type')
  @Column({ type: 'varchar', length: 50 })
  type: string;

  @Column({ type: 'varchar', length: 200 })
  title: string;

  @Column({ type: 'text', nullable: true })
  body: string | null;

  @Column({ type: 'jsonb', nullable: true })
  data: Record<string, unknown> | null;

  @Index('IDX_notifications_is_read')
  @Column({ type: 'boolean', default: false })
  isRead: boolean;

  @Column({ type: 'timestamp', nullable: true })
  readAt: Date | null;

  @Index('IDX_notifications_scheduled_at')
  @Column({ type: 'timestamp', nullable: true })
  scheduledAt: Date | null;
}

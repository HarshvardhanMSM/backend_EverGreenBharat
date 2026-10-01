import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';

@Entity('notification_templates')
export class NotificationTemplate extends BaseEntity {
  @Index('IDX_notification_templates_key')
  @Column({ type: 'varchar', length: 80, unique: true })
  templateKey: string;

  @Column({ type: 'varchar', length: 150 })
  name: string;

  @Column({ type: 'varchar', length: 50, default: 'email' })
  channel: 'email' | 'sms' | 'push';

  @Column({ type: 'varchar', length: 255 })
  subject: string;

  @Column({ type: 'text' })
  bodyHtml: string;

  @Column({ type: 'text', nullable: true })
  bodyText: string | null;

  @Column({ type: 'jsonb', default: () => "'[]'::jsonb" })
  availableVariables: string[];

  @Column({ type: 'boolean', default: true })
  isActive: boolean;
}

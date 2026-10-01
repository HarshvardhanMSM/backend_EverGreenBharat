import { Entity, Column, Index, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { User } from '../../users/entities/user.entity';
import { Admin } from '../../admin/entities/admin.entity';

@Entity('moderation_events')
export class ModerationEvent extends BaseEntity {
  @Index('IDX_moderation_events_admin_id')
  @Column({ type: 'uuid', nullable: true })
  adminId: string | null;

  @Index('IDX_moderation_events_user_id')
  @Column({ type: 'uuid' })
  userId: string;

  @Index('IDX_moderation_events_action')
  @Column({ type: 'varchar', length: 40 })
  action: string;

  @Column({ type: 'text', nullable: true })
  reason: string | null;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user?: User;

  @ManyToOne(() => Admin, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'admin_id' })
  admin?: Admin | null;
}

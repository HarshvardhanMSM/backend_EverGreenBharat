import { Entity, Column, Index, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { ReportStatus } from '../../../common/enums/nursery.enums';
import { User } from '../../users/entities/user.entity';
import { Post } from './post.entity';

@Entity('content_reports')
export class Report extends BaseEntity {
  @Index('IDX_reports_reported_by')
  @Column({ type: 'uuid' })
  reportedBy: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'reportedBy' })
  reporter: User;

  @Index('IDX_reports_post_id')
  @Column({ type: 'uuid', nullable: true })
  postId: string | null;

  @ManyToOne(() => Post, (post) => post.reports, {
    nullable: true,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'postId' })
  post: Post | null;

  @Column({ type: 'uuid', nullable: true })
  reportedUserId: string | null;

  @Column({ type: 'text' })
  reason: string;

  @Column({
    type: 'enum',
    enum: ReportStatus,
    default: ReportStatus.PENDING,
  })
  status: ReportStatus;

  @Column({ type: 'text', nullable: true })
  adminActionNote: string | null;
}

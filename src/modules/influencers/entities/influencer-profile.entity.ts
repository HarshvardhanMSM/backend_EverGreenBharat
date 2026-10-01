import {
  Entity,
  Column,
  Index,
  OneToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { ApprovalStatus } from '../../../common/enums/nursery.enums';
import { User } from '../../users/entities/user.entity';
import { Post } from './post.entity';

@Entity('influencer_profiles')
export class InfluencerProfile extends BaseEntity {
  @Index('IDX_influencer_profiles_user_id')
  @Column({ type: 'uuid', unique: true })
  userId: string;

  @OneToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ type: 'text', nullable: true })
  bio: string | null;

  @Column({ type: 'jsonb', default: () => "'[]'::jsonb" })
  gardeningInterests: string[];

  @Column({ type: 'boolean', default: false })
  isBadgeGranted: boolean;

  @Column({ type: 'timestamp', nullable: true })
  badgeGrantedAt: Date | null;

  @Column({ type: 'int', default: 0 })
  followersCount: number;

  @Column({ type: 'int', default: 0 })
  followingCount: number;

  @Column({
    type: 'enum',
    enum: ApprovalStatus,
    default: ApprovalStatus.PENDING,
  })
  approvalStatus: ApprovalStatus;

  @Column({ type: 'text', nullable: true })
  rejectionReason: string | null;

  @OneToMany(() => Post, (post) => post.influencer)
  posts?: Post[];
}

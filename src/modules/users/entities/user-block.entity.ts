import {
  Entity,
  PrimaryColumn,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from './user.entity';

@Entity('user_blocks')
@Index('IDX_user_blocks_blocker_blocked', ['blockerId', 'blockedId'], {
  unique: true,
})
export class UserBlock {
  @PrimaryColumn({ name: 'blocker_id', type: 'uuid' })
  blockerId: string;

  @PrimaryColumn({ name: 'blocked_id', type: 'uuid' })
  blockedId: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;

  @ManyToOne(() => User, (user) => user.blockedUsers, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'blocker_id' })
  blocker: User;

  @ManyToOne(() => User, (user) => user.blockedByUsers, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'blocked_id' })
  blocked: User;
}

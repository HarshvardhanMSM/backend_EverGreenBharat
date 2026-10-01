import { Entity, Column, Index, Unique } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';

@Entity('user_follows')
@Unique(['followerId', 'followingId'])
export class UserFollow extends BaseEntity {
  @Index('IDX_user_follows_follower')
  @Column({ type: 'uuid' })
  followerId: string;

  @Index('IDX_user_follows_following')
  @Column({ type: 'uuid' })
  followingId: string;
}

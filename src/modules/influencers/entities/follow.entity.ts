import { Entity, Column, Index, ManyToOne, JoinColumn, Unique } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { User } from '../../users/entities/user.entity';
import { InfluencerProfile } from './influencer-profile.entity';

@Entity('influencer_follows')
@Unique(['followerUserId', 'followingInfluencerId'])
export class Follow extends BaseEntity {
  @Index('IDX_follows_follower')
  @Column({ type: 'uuid' })
  followerUserId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'followerUserId' })
  follower: User;

  @Index('IDX_follows_influencer')
  @Column({ type: 'uuid' })
  followingInfluencerId: string;

  @ManyToOne(() => InfluencerProfile, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'followingInfluencerId' })
  influencer: InfluencerProfile;
}

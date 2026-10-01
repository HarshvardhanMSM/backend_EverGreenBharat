import {
  Entity,
  Column,
  Index,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import {
  PostMediaType,
  PostStatus,
} from '../../../common/enums/nursery.enums';
import { InfluencerProfile } from './influencer-profile.entity';
import { Like } from './like.entity';
import { Report } from './report.entity';

@Entity('influencer_posts')
export class Post extends BaseEntity {
  @Index('IDX_influencer_posts_influencer_id')
  @Column({ type: 'uuid' })
  influencerId: string;

  @ManyToOne(() => InfluencerProfile, (ip) => ip.posts, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'influencerId' })
  influencer: InfluencerProfile;

  @Column({
    type: 'enum',
    enum: PostMediaType,
    default: PostMediaType.IMAGE,
  })
  type: PostMediaType;

  @Column({ type: 'jsonb', default: () => "'[]'::jsonb" })
  mediaUrls: string[];

  @Column({ type: 'text' })
  caption: string;

  @Column({ type: 'jsonb', default: () => "'[]'::jsonb" })
  tags: string[];

  @Column({ type: 'int', default: 0 })
  likeCount: number;

  @Column({ type: 'int', default: 0 })
  reportCount: number;

  @Index('IDX_influencer_posts_status')
  @Column({
    type: 'enum',
    enum: PostStatus,
    default: PostStatus.APPROVED,
  })
  status: PostStatus;

  @OneToMany(() => Like, (like) => like.post)
  likes?: Like[];

  @OneToMany(() => Report, (report) => report.post)
  reports?: Report[];
}

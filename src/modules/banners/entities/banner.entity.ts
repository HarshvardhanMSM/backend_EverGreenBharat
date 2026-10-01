import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';

export enum BannerTargetType {
  CREATOR = 'CREATOR',
  STREAM = 'STREAM',
  CATEGORY = 'CATEGORY',
  EXTERNAL_LINK = 'EXTERNAL_LINK',
}

@Entity('home_banners')
export class Banner extends BaseEntity {
  @Column({ type: 'varchar', length: 150 })
  title: string;

  @Column({ type: 'text' })
  imageUrl: string;

  @Column({
    type: 'enum',
    enum: BannerTargetType,
    default: BannerTargetType.EXTERNAL_LINK,
  })
  targetType: BannerTargetType;

  @Column({ type: 'varchar', length: 255, nullable: true })
  targetValue: string | null;

  @Column({ type: 'int', default: 0 })
  sortOrder: number;

  @Index('IDX_home_banners_is_active')
  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @Column({ type: 'timestamp', nullable: true })
  startDate: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  endDate: Date | null;

  @Column({ type: 'int', default: 0 })
  clickCount: number;

  @Column({ type: 'int', default: 0 })
  impressionCount: number;
}

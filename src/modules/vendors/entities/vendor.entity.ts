import { Entity, Column, Index, OneToOne, JoinColumn, OneToMany } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { User } from '../../users/entities/user.entity';
import { ApprovalStatus } from '../../../common/enums/nursery.enums';
import { Product } from '../../products/entities/product.entity';

@Entity('vendors')
export class Vendor extends BaseEntity {
  @Index('IDX_vendors_user_id')
  @Column({ type: 'uuid', unique: true })
  userId: string;

  @OneToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ type: 'varchar', length: 150 })
  businessName: string;

  @Column({ type: 'varchar', length: 150 })
  storeName: string;

  @Index('IDX_vendors_store_slug')
  @Column({ type: 'varchar', length: 150, unique: true })
  storeSlug: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  storeLogo: string | null;

  @Column({ type: 'jsonb', default: () => "'[]'::jsonb" })
  storeBanners: string[];

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'varchar', length: 255 })
  supportEmail: string;

  @Column({ type: 'varchar', length: 20 })
  supportPhone: string;

  @Column({ type: 'jsonb' })
  address: {
    street: string;
    city: string;
    state: string;
    postalCode: string;
    latitude?: number;
    longitude?: number;
  };

  @Column({ type: 'jsonb', default: () => "'{\"serviceablePincodes\":[],\"radiusKm\":25}'::jsonb" })
  deliveryArea: {
    serviceablePincodes: string[];
    radiusKm: number;
    minOrderAmount?: number;
    freeDeliveryAbove?: number;
  };

  @Column({
    type: 'enum',
    enum: ApprovalStatus,
    default: ApprovalStatus.PENDING,
  })
  approvalStatus: ApprovalStatus;

  @Column({ type: 'text', nullable: true })
  rejectionReason: string | null;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @Column({ type: 'decimal', precision: 3, scale: 2, default: 5.0 })
  rating: number;

  @Column({ type: 'int', default: 0 })
  ratingCount: number;

  @OneToMany(() => Product, (product) => product.vendor)
  products?: Product[];
}

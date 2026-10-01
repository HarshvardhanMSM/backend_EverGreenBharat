import {
  Entity,
  Column,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { ProductStatus } from '../../../common/enums/nursery.enums';
import { Vendor } from '../../vendors/entities/vendor.entity';
import { MasterProduct } from '../../master-products/entities/master-product.entity';
import { Category } from '../../categories/entities/category.entity';

@Entity('products')
export class Product extends BaseEntity {
  @Index('IDX_products_vendor_id')
  @Column({ type: 'uuid' })
  vendorId: string;

  @ManyToOne(() => Vendor, (vendor) => vendor.products, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'vendorId' })
  vendor: Vendor;

  @Index('IDX_products_master_product_id')
  @Column({ type: 'uuid', nullable: true })
  masterProductId: string | null;

  @ManyToOne(() => MasterProduct, (mp) => mp.vendorProducts, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'masterProductId' })
  masterProduct: MasterProduct | null;

  @Index('IDX_products_category_id')
  @Column({ type: 'uuid', nullable: true })
  categoryId: string | null;

  @ManyToOne(() => Category, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'categoryId' })
  category: Category | null;

  @Index('IDX_products_subcategory_id')
  @Column({ type: 'uuid', nullable: true })
  subcategoryId: string | null;

  @ManyToOne(() => Category, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'subcategoryId' })
  subcategory: Category | null;

  @Index('IDX_products_name')
  @Column({ type: 'varchar', length: 200 })
  name: string;

  @Column({ type: 'text' })
  description: string;

  @Column({ type: 'jsonb', default: () => "'[]'::jsonb" })
  images: string[];

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  price: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  discountPrice: number | null;

  @Column({ type: 'int', default: 0 })
  stockQuantity: number;

  @Column({ type: 'jsonb', default: () => "'{}'::jsonb" })
  attributes: {
    plantHeightCm?: number;
    potIncluded?: boolean;
    potMaterial?: string;
    potColor?: string;
    floweringSeason?: string;
    careLevel?: string;
    customTags?: string[];
  };

  @Column({ type: 'jsonb', default: () => "'{}'::jsonb" })
  deliveryInfo: {
    isFragile?: boolean;
    packagingWeightGrams?: number;
    estimatedDeliveryDays?: number;
    shippingCharge?: number;
  };

  @Column({
    type: 'enum',
    enum: ProductStatus,
    default: ProductStatus.PENDING_APPROVAL,
  })
  status: ProductStatus;

  @Column({ type: 'jsonb', default: () => "'{}'::jsonb" })
  translations: Record<
    string,
    {
      name?: string;
      description?: string;
      attributes?: Record<string, any>;
    }
  >;
}

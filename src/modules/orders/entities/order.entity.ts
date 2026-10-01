import {
  Entity,
  Column,
  Index,
  ManyToOne,
  OneToMany,
  OneToOne,
  JoinColumn,
} from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import {
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
} from '../../../common/enums/nursery.enums';
import { User } from '../../users/entities/user.entity';
import { Vendor } from '../../vendors/entities/vendor.entity';
import { OrderItem } from './order-item.entity';
import { Payment } from '../../payments/entities/payment.entity';

@Entity('orders')
export class Order extends BaseEntity {
  @Index('IDX_orders_order_number')
  @Column({ type: 'varchar', length: 40, unique: true })
  orderNumber: string;

  @Index('IDX_orders_user_id')
  @Column({ type: 'uuid' })
  userId: string;

  @ManyToOne(() => User, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Index('IDX_orders_parent_order_id')
  @Column({ type: 'uuid', nullable: true })
  parentOrderId: string | null;

  @Index('IDX_orders_vendor_id')
  @Column({ type: 'uuid', nullable: true })
  vendorId: string | null;

  @ManyToOne(() => Vendor, { nullable: true, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'vendorId' })
  vendor: Vendor | null;

  @Column({ type: 'jsonb' })
  shippingAddress: {
    fullName: string;
    phone: string;
    addressLine1: string;
    addressLine2?: string;
    city: string;
    state: string;
    postalCode: string;
    latitude?: number;
    longitude?: number;
  };

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  subtotal: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  discount: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  deliveryCharge: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  total: number;

  @Column({
    type: 'enum',
    enum: PaymentMethod,
    default: PaymentMethod.COD,
  })
  paymentMethod: PaymentMethod;

  @Column({
    type: 'enum',
    enum: PaymentStatus,
    default: PaymentStatus.PENDING,
  })
  paymentStatus: PaymentStatus;

  @Column({
    type: 'enum',
    enum: OrderStatus,
    default: OrderStatus.PLACED,
  })
  orderStatus: OrderStatus;

  // Doorstep OTP Verification fields (Section 5.1)
  @Column({ type: 'varchar', length: 255, nullable: true })
  deliveryOtp: string | null; // Bcrypt hash

  @Column({ type: 'timestamp', nullable: true })
  deliveryOtpGeneratedAt: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  deliveryOtpExpiresAt: Date | null;

  @Column({ type: 'int', default: 0 })
  deliveryOtpAttempts: number;

  @Column({ type: 'timestamp', nullable: true })
  deliveredAt: Date | null;

  @Column({ type: 'jsonb', default: () => "'[]'::jsonb" })
  statusHistory: Array<{
    status: OrderStatus;
    timestamp: Date;
    note?: string;
    updatedBy?: string;
  }>;

  @OneToMany(() => OrderItem, (item) => item.order, { cascade: true })
  items: OrderItem[];

  @OneToOne(() => Payment, (payment) => payment.order)
  payment?: Payment;
}

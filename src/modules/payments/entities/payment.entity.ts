import {
  Entity,
  Column,
  Index,
  OneToOne,
  JoinColumn,
} from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import {
  PaymentMethod,
  PaymentStatus,
} from '../../../common/enums/nursery.enums';
import { Order } from '../../orders/entities/order.entity';

@Entity('payments')
export class Payment extends BaseEntity {
  @Index('IDX_payments_order_id')
  @Column({ type: 'uuid', unique: true })
  orderId: string;

  @OneToOne(() => Order, (order) => order.payment, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'orderId' })
  order: Order;

  @Column({
    type: 'enum',
    enum: PaymentMethod,
  })
  method: PaymentMethod;

  @Index('IDX_payments_gateway_order_id')
  @Column({ type: 'varchar', length: 100, nullable: true })
  gatewayOrderId: string | null;

  @Index('IDX_payments_gateway_payment_id')
  @Column({ type: 'varchar', length: 100, nullable: true })
  gatewayPaymentId: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  transactionId: string | null;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  amount: number;

  @Column({
    type: 'enum',
    enum: PaymentStatus,
    default: PaymentStatus.PENDING,
  })
  status: PaymentStatus;

  @Column({ type: 'jsonb', nullable: true })
  rawGatewayResponse: Record<string, any> | null;
}

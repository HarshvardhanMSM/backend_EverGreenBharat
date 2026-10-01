import { Order } from '../orders/entities/order.entity';
import { Payment } from './entities/payment.entity';

export interface PaymentInitiationResult {
  requiresGateway: boolean;
  gatewayOrderId?: string;
  razorpayKeyId?: string;
  amount: number;
  currency: string;
}

export interface PaymentProvider {
  initiate(order: Order, amount: number): Promise<PaymentInitiationResult>;
  verify(payload: Record<string, any>): Promise<boolean>;
  handleWebhook(rawBody: any, signature: string): Promise<{ success: boolean; paymentId?: string; orderId?: string }>;
}

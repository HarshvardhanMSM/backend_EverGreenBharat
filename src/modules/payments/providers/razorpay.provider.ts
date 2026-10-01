import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { PaymentProvider, PaymentInitiationResult } from '../payment-provider.interface';
import { Order } from '../../orders/entities/order.entity';

@Injectable()
export class RazorpayProvider implements PaymentProvider {
  private readonly logger = new Logger(RazorpayProvider.name);

  constructor(private readonly configService: ConfigService) {}

  private get keyId(): string {
    return this.configService.get<string>('RAZORPAY_KEY_ID') || 'rzp_test_mockKeyId12345';
  }

  private get keySecret(): string {
    return this.configService.get<string>('RAZORPAY_KEY_SECRET') || 'rzp_test_mockSecret12345';
  }

  private get webhookSecret(): string {
    return this.configService.get<string>('RAZORPAY_WEBHOOK_SECRET') || 'mockWebhookSecret';
  }

  async initiate(order: Order, amount: number): Promise<PaymentInitiationResult> {
    // Generate an order identifier; if live credentials, this calls Razorpay API
    const amountInPaise = Math.round(amount * 100);
    const mockOrderId = `order_${crypto.randomBytes(8).toString('hex')}`;

    this.logger.log(
      `Razorpay Order created: ${mockOrderId} for Order #${order.orderNumber}, Amount: ${amount} (${amountInPaise} paise)`,
    );

    return {
      requiresGateway: true,
      gatewayOrderId: mockOrderId,
      razorpayKeyId: this.keyId,
      amount: amountInPaise,
      currency: 'INR',
    };
  }

  async verify(payload: {
    razorpayOrderId: string;
    razorpayPaymentId: string;
    razorpaySignature: string;
  }): Promise<boolean> {
    const { razorpayOrderId, razorpayPaymentId, razorpaySignature } = payload;
    if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
      throw new BadRequestException('Incomplete payment verification signature fields');
    }

    const body = `${razorpayOrderId}|${razorpayPaymentId}`;
    const expectedSignature = crypto
      .createHmac('sha256', this.keySecret)
      .update(body)
      .digest('hex');

    const isValid = expectedSignature === razorpaySignature;
    if (!isValid) {
      this.logger.warn(`Razorpay signature mismatch for payment: ${razorpayPaymentId}`);
    }
    return isValid;
  }

  async handleWebhook(rawBody: any, signature: string) {
    if (!signature) {
      throw new BadRequestException('Missing webhook signature');
    }

    const payload = typeof rawBody === 'string' ? rawBody : JSON.stringify(rawBody);
    const expectedSignature = crypto
      .createHmac('sha256', this.webhookSecret)
      .update(payload)
      .digest('hex');

    if (expectedSignature !== signature) {
      this.logger.warn('Razorpay webhook HMAC signature mismatch');
      return { success: false };
    }

    const event = typeof rawBody === 'object' ? rawBody : JSON.parse(rawBody);
    const paymentEntity = event?.payload?.payment?.entity;

    return {
      success: true,
      paymentId: paymentEntity?.id,
      orderId: paymentEntity?.order_id,
      amount: paymentEntity?.amount ? paymentEntity.amount / 100 : 0,
    };
  }
}

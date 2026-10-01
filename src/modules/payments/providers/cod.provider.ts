import { Injectable, Logger } from '@nestjs/common';
import { PaymentProvider, PaymentInitiationResult } from '../payment-provider.interface';
import { Order } from '../../orders/entities/order.entity';

@Injectable()
export class CODProvider implements PaymentProvider {
  private readonly logger = new Logger(CODProvider.name);

  async initiate(order: Order, amount: number): Promise<PaymentInitiationResult> {
    this.logger.log(`COD order initiated for Order #${order.orderNumber}, Amount: ${amount}`);
    return {
      requiresGateway: false,
      amount,
      currency: 'INR',
    };
  }

  async verify(_payload: Record<string, any>): Promise<boolean> {
    // Cash on delivery does not require digital gateway verification
    return true;
  }

  async handleWebhook(_rawBody: any, _signature: string) {
    return { success: true };
  }
}

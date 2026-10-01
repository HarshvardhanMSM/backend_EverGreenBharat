import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Payment } from './entities/payment.entity';
import { Order } from '../orders/entities/order.entity';
import { CODProvider } from './providers/cod.provider';
import { RazorpayProvider } from './providers/razorpay.provider';
import { PaymentMethod, PaymentStatus, OrderStatus } from '../../common/enums/nursery.enums';

@Injectable()
export class PaymentsService {
  constructor(
    @InjectRepository(Payment)
    private readonly paymentRepository: Repository<Payment>,
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    private readonly codProvider: CODProvider,
    private readonly razorpayProvider: RazorpayProvider,
  ) {}

  getProvider(method: PaymentMethod) {
    if (method === PaymentMethod.COD) return this.codProvider;
    if (method === PaymentMethod.RAZORPAY) return this.razorpayProvider;
    throw new BadRequestException(`Unsupported payment method: ${method}`);
  }

  async verifyRazorpayPayment(payload: {
    orderId: string;
    razorpayOrderId: string;
    razorpayPaymentId: string;
    razorpaySignature: string;
  }) {
    const order = await this.orderRepository.findOne({
      where: { id: payload.orderId },
      relations: { payment: true },
    });
    if (!order) throw new NotFoundException('Order not found');

    const isValid = await this.razorpayProvider.verify({
      razorpayOrderId: payload.razorpayOrderId,
      razorpayPaymentId: payload.razorpayPaymentId,
      razorpaySignature: payload.razorpaySignature,
    });

    if (!isValid) {
      order.paymentStatus = PaymentStatus.FAILED;
      await this.orderRepository.save(order);
      throw new BadRequestException('Invalid payment signature verification');
    }

    // Success! Move order to Confirmed and payment to Success
    order.orderStatus = OrderStatus.CONFIRMED;
    order.paymentStatus = PaymentStatus.SUCCESS;
    await this.orderRepository.save(order);

    if (order.payment) {
      order.payment.gatewayOrderId = payload.razorpayOrderId;
      order.payment.gatewayPaymentId = payload.razorpayPaymentId;
      order.payment.status = PaymentStatus.SUCCESS;
      await this.paymentRepository.save(order.payment);
    }

    return {
      success: true,
      message: 'Payment verified and order confirmed successfully',
      orderId: order.id,
      orderNumber: order.orderNumber,
    };
  }

  async handleRazorpayWebhook(rawBody: any, signature: string) {
    const result = await this.razorpayProvider.handleWebhook(rawBody, signature);
    if (!result.success || !result.orderId) {
      return { status: 'ignored' };
    }

    // Idempotent order update
    const payment = await this.paymentRepository.findOne({
      where: { gatewayOrderId: result.orderId },
      relations: { order: true },
    });

    if (payment && payment.status !== PaymentStatus.SUCCESS) {
      payment.status = PaymentStatus.SUCCESS;
      payment.gatewayPaymentId = result.paymentId || null;
      await this.paymentRepository.save(payment);

      if (payment.order) {
        payment.order.paymentStatus = PaymentStatus.SUCCESS;
        payment.order.orderStatus = OrderStatus.CONFIRMED;
        await this.orderRepository.save(payment.order);
      }
    }

    return { status: 'processed' };
  }

  async getPaymentStatus(orderId: string) {
    const payment = await this.paymentRepository.findOne({
      where: { orderId },
    });
    if (!payment) throw new NotFoundException('Payment record not found for order');
    return payment;
  }
}

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Payment } from './entities/payment.entity';
import { Order } from '../orders/entities/order.entity';
import { PaymentsService } from './payments.service';
import { PaymentsController } from './payments.controller';
import { CODProvider } from './providers/cod.provider';
import { RazorpayProvider } from './providers/razorpay.provider';

@Module({
  imports: [TypeOrmModule.forFeature([Payment, Order])],
  controllers: [PaymentsController],
  providers: [PaymentsService, CODProvider, RazorpayProvider],
  exports: [PaymentsService, CODProvider, RazorpayProvider],
})
export class PaymentsModule {}

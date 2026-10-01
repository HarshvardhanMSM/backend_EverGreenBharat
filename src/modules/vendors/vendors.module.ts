import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Vendor } from './entities/vendor.entity';
import { Product } from '../products/entities/product.entity';
import { Order } from '../orders/entities/order.entity';
import { VendorsService } from './vendors.service';
import {
  VendorsController,
  AdminVendorsController,
} from './vendors.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Vendor, Product, Order])],
  controllers: [VendorsController, AdminVendorsController],
  providers: [VendorsService],
  exports: [VendorsService],
})
export class VendorsModule {}

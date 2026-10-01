import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Product } from './entities/product.entity';
import { MasterProduct } from '../master-products/entities/master-product.entity';
import { Vendor } from '../vendors/entities/vendor.entity';
import { ProductsService } from './products.service';
import {
  VendorProductsController,
  MarketplaceProductsController,
  AdminVendorProductsController,
} from './products.controller';
import { VendorsModule } from '../vendors/vendors.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Product, MasterProduct, Vendor]),
    VendorsModule,
  ],
  controllers: [
    VendorProductsController,
    MarketplaceProductsController,
    AdminVendorProductsController,
  ],
  providers: [ProductsService],
  exports: [ProductsService],
})
export class ProductsModule {}

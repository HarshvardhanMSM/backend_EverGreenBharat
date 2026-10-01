import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MasterProduct } from './entities/master-product.entity';
import { Product } from '../products/entities/product.entity';
import { MasterProductsService } from './master-products.service';
import {
  MasterProductsController,
  AdminMasterProductsController,
} from './master-products.controller';

@Module({
  imports: [TypeOrmModule.forFeature([MasterProduct, Product])],
  controllers: [MasterProductsController, AdminMasterProductsController],
  providers: [MasterProductsService],
  exports: [MasterProductsService],
})
export class MasterProductsModule {}

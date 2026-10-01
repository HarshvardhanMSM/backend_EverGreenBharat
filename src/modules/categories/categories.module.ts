import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Category } from './entities/category.entity';
import { CategoryAttribute } from './entities/category-attribute.entity';
import { CategoryRepository } from './repositories/category.repository';
import { CategoriesService } from './categories.service';
import {
  CategoriesController,
  AdminCategoriesController,
} from './categories.controller';
import { CategorySeeder } from './category.seeder';

@Module({
  imports: [TypeOrmModule.forFeature([Category, CategoryAttribute])],
  controllers: [CategoriesController, AdminCategoriesController],
  providers: [CategoryRepository, CategoriesService, CategorySeeder],
  exports: [CategoriesService, CategoryRepository, TypeOrmModule],
})
export class CategoriesModule {}

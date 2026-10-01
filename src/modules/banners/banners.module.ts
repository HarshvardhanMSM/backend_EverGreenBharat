import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Banner } from './entities/banner.entity';
import { BannersRepository } from './repositories/banners.repository';
import { BannersService } from './banners.service';
import { BannersController } from './banners.controller';
import { AdminBannersController } from './admin-banners.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Banner])],
  controllers: [BannersController, AdminBannersController],
  providers: [BannersRepository, BannersService],
  exports: [BannersService],
})
export class BannersModule {}

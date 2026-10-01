import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InstitutionalInquiry } from './entities/institutional-inquiry.entity';
import { InquiriesService } from './inquiries.service';
import {
  InquiriesController,
  AdminInquiriesController,
} from './inquiries.controller';

@Module({
  imports: [TypeOrmModule.forFeature([InstitutionalInquiry])],
  controllers: [InquiriesController, AdminInquiriesController],
  providers: [InquiriesService],
  exports: [InquiriesService],
})
export class InquiriesModule {}

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ModerationEvent } from './entities/moderation-event.entity';
import { ModerationService } from './moderation.service';

@Module({
  imports: [TypeOrmModule.forFeature([ModerationEvent])],
  providers: [ModerationService],
  exports: [ModerationService],
})
export class ModerationModule {}

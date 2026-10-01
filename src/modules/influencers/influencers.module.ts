import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InfluencerProfile } from './entities/influencer-profile.entity';
import { Post } from './entities/post.entity';
import { Like } from './entities/like.entity';
import { Follow } from './entities/follow.entity';
import { Report } from './entities/report.entity';
import { User } from '../users/entities/user.entity';
import { InfluencersService } from './influencers.service';
import {
  InfluencersController,
  AdminInfluencersController,
} from './influencers.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      InfluencerProfile,
      Post,
      Like,
      Follow,
      Report,
      User,
    ]),
  ],
  controllers: [InfluencersController, AdminInfluencersController],
  providers: [InfluencersService],
  exports: [InfluencersService],
})
export class InfluencersModule {}

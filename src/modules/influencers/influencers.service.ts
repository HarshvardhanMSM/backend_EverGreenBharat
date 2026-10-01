import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { InfluencerProfile } from './entities/influencer-profile.entity';
import { Post } from './entities/post.entity';
import { Like } from './entities/like.entity';
import { Follow } from './entities/follow.entity';
import { Report } from './entities/report.entity';
import { User } from '../users/entities/user.entity';
import {
  InfluencerOptInDto,
  CreatePostDto,
  ReportContentDto,
  InfluencerApprovalDto,
} from './dto/influencer.dto';
import {
  ApprovalStatus,
  PostStatus,
  ReportStatus,
} from '../../common/enums/nursery.enums';

@Injectable()
export class InfluencersService {
  constructor(
    @InjectRepository(InfluencerProfile)
    private readonly profileRepository: Repository<InfluencerProfile>,
    @InjectRepository(Post)
    private readonly postRepository: Repository<Post>,
    @InjectRepository(Like)
    private readonly likeRepository: Repository<Like>,
    @InjectRepository(Follow)
    private readonly followRepository: Repository<Follow>,
    @InjectRepository(Report)
    private readonly reportRepository: Repository<Report>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly configService: ConfigService,
  ) {}

  async optIn(userId: string, dto: InfluencerOptInDto) {
    let profile = await this.profileRepository.findOne({ where: { userId } });
    if (profile) {
      if (profile.approvalStatus === ApprovalStatus.APPROVED) {
        throw new BadRequestException('You are already a verified Green Army Influencer');
      }
      profile.bio = dto.bio;
      profile.gardeningInterests = dto.gardeningInterests;
      profile.approvalStatus = ApprovalStatus.PENDING;
    } else {
      profile = this.profileRepository.create({
        userId,
        bio: dto.bio,
        gardeningInterests: dto.gardeningInterests,
        approvalStatus: ApprovalStatus.PENDING,
      });
    }

    await this.userRepository.update({ id: userId }, { isInfluencer: true });
    return this.profileRepository.save(profile);
  }

  async getProfile(userId: string) {
    const profile = await this.profileRepository.findOne({
      where: { userId },
      relations: { user: true, posts: true },
    });
    if (!profile) throw new NotFoundException('Influencer profile not found');
    return profile;
  }

  async createPost(userId: string, dto: CreatePostDto) {
    const profile = await this.profileRepository.findOne({ where: { userId } });
    if (!profile || profile.approvalStatus !== ApprovalStatus.APPROVED) {
      throw new ForbiddenException(
        'Only approved Green Army Influencers can publish content',
      );
    }

    const moderationMode =
      this.configService.get<string>('CONTENT_MODERATION_MODE') || 'post-publish';

    const initialStatus =
      moderationMode === 'pre-approval' ? PostStatus.PENDING : PostStatus.APPROVED;

    const post = this.postRepository.create({
      influencerId: profile.id,
      type: dto.type,
      mediaUrls: dto.mediaUrls,
      caption: dto.caption,
      tags: dto.tags || [],
      status: initialStatus,
    });

    return this.postRepository.save(post);
  }

  async getFeed(page = 1, limit = 20) {
    const [posts, total] = await this.postRepository.findAndCount({
      where: { status: PostStatus.APPROVED },
      relations: { influencer: { user: true } },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      data: posts,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async toggleLike(userId: string, postId: string) {
    const post = await this.postRepository.findOne({ where: { id: postId } });
    if (!post) throw new NotFoundException('Post not found');

    const existingLike = await this.likeRepository.findOne({
      where: { userId, postId },
    });

    if (existingLike) {
      await this.likeRepository.remove(existingLike);
      post.likeCount = Math.max(0, post.likeCount - 1);
      await this.postRepository.save(post);
      return { liked: false, likeCount: post.likeCount };
    } else {
      const like = this.likeRepository.create({ userId, postId });
      await this.likeRepository.save(like);
      post.likeCount += 1;
      await this.postRepository.save(post);
      return { liked: true, likeCount: post.likeCount };
    }
  }

  async toggleFollow(userId: string, influencerId: string) {
    const profile = await this.profileRepository.findOne({
      where: { id: influencerId },
    });
    if (!profile) throw new NotFoundException('Influencer profile not found');

    const existingFollow = await this.followRepository.findOne({
      where: { followerUserId: userId, followingInfluencerId: influencerId },
    });

    if (existingFollow) {
      await this.followRepository.remove(existingFollow);
      profile.followersCount = Math.max(0, profile.followersCount - 1);
      await this.profileRepository.save(profile);
      return { following: false, followersCount: profile.followersCount };
    } else {
      const follow = this.followRepository.create({
        followerUserId: userId,
        followingInfluencerId: influencerId,
      });
      await this.followRepository.save(follow);
      profile.followersCount += 1;
      await this.profileRepository.save(profile);
      return { following: true, followersCount: profile.followersCount };
    }
  }

  async reportContent(userId: string, postId: string, dto: ReportContentDto) {
    const post = await this.postRepository.findOne({ where: { id: postId } });
    if (!post) throw new NotFoundException('Post not found');

    post.reportCount += 1;
    await this.postRepository.save(post);

    const report = this.reportRepository.create({
      reportedBy: userId,
      postId,
      reason: dto.reason,
      status: ReportStatus.PENDING,
    });

    await this.reportRepository.save(report);

    return {
      message: 'Content reported to Green Army moderation team for review',
    };
  }

  // ─── Admin Moderation & Approval Operations ──────────────────────────────────

  async findAllInfluencersAdmin(page = 1, limit = 20) {
    const [data, total] = await this.profileRepository.findAndCount({
      relations: { user: true },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async updateApprovalAdmin(profileId: string, dto: InfluencerApprovalDto) {
    const profile = await this.profileRepository.findOne({
      where: { id: profileId },
      relations: { user: true },
    });
    if (!profile) throw new NotFoundException('Influencer application not found');

    profile.approvalStatus = dto.status;
    profile.rejectionReason = dto.rejectionReason || null;

    if (dto.status === ApprovalStatus.APPROVED) {
      profile.isBadgeGranted = true;
      profile.badgeGrantedAt = new Date();
    } else {
      profile.isBadgeGranted = false;
    }

    return this.profileRepository.save(profile);
  }

  async findReportedContentAdmin(page = 1, limit = 20) {
    const [data, total] = await this.reportRepository.findAndCount({
      relations: {
        post: { influencer: { user: true } },
        reporter: true,
      },
      where: { status: ReportStatus.PENDING },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async resolveReportAdmin(reportId: string, action: 'remove' | 'dismiss') {
    const report = await this.reportRepository.findOne({
      where: { id: reportId },
      relations: { post: true },
    });
    if (!report) throw new NotFoundException('Report not found');

    if (action === 'remove' && report.post) {
      report.post.status = PostStatus.REMOVED;
      await this.postRepository.save(report.post);
      report.status = ReportStatus.ACTIONED;
    } else {
      report.status = ReportStatus.DISMISSED;
    }

    return this.reportRepository.save(report);
  }
}

import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { DataSource, In } from 'typeorm';
import { UserFollowsRepository } from '../repositories/user-follows.repository';
import { User } from '../entities/user.entity';

@Injectable()
export class UserFollowsService {
  constructor(
    private readonly userFollowsRepository: UserFollowsRepository,
    private readonly dataSource: DataSource,
  ) {}

  async followCreator(followerId: string, targetId: string) {
    const userRepo = this.dataSource.getRepository(User);
    const targetUser = await userRepo.findOne({ where: { id: targetId } });

    if (!targetUser) {
      throw new NotFoundException('User not found');
    }

    if (targetUser.id === followerId) {
      throw new BadRequestException('You cannot follow yourself');
    }

    const existing = await this.userFollowsRepository.findOne({
      where: { followerId, followingId: targetUser.id },
    });

    if (existing) {
      return { isFollowing: true };
    }

    const follow = this.userFollowsRepository.create({
      followerId,
      followingId: targetUser.id,
    });
    await this.userFollowsRepository.save(follow);

    return { isFollowing: true };
  }

  async unfollowCreator(followerId: string, targetId: string) {
    const userRepo = this.dataSource.getRepository(User);
    const targetUser = await userRepo.findOne({ where: { id: targetId } });

    if (!targetUser) {
      throw new NotFoundException('User not found');
    }

    const existing = await this.userFollowsRepository.findOne({
      where: { followerId, followingId: targetUser.id },
    });

    if (!existing) {
      return { isFollowing: false };
    }

    await this.userFollowsRepository.remove(existing);

    return { isFollowing: false };
  }

  async getFollowStatus(followerId: string, targetId: string) {
    const existing = await this.userFollowsRepository.findOne({
      where: { followerId, followingId: targetId },
    });

    return { isFollowing: !!existing };
  }

  async getFollowingList(followerId: string, page = 1, limit = 20) {
    const { data: follows, total } =
      await this.userFollowsRepository.findFollowing(followerId, page, limit);
    if (follows.length === 0) {
      return { data: [], total: 0 };
    }

    const followingUserIds = follows.map((f) => f.followingId);
    const userRepo = this.dataSource.getRepository(User);
    const users = await userRepo.find({
      where: { id: In(followingUserIds) },
    });

    const userMap = new Map(users.map((u) => [u.id, u]));
    const data = follows.map((f) => {
      const user = userMap.get(f.followingId);
      return {
        id: f.id,
        followedAt: f.createdAt,
        user: user
          ? {
              id: user.id,
              displayName: user.displayName,
              username: user.username,
              avatarUrl: user.avatarUrl,
            }
          : null,
      };
    });

    return { data, total };
  }

  async getFollowersList(targetId: string, page = 1, limit = 20) {
    const userRepo = this.dataSource.getRepository(User);
    const targetUser = await userRepo.findOne({ where: { id: targetId } });
    if (!targetUser) {
      throw new NotFoundException('User not found');
    }

    const { data: follows, total } =
      await this.userFollowsRepository.findFollowers(targetUser.id, page, limit);
    if (follows.length === 0) {
      return { data: [], total: 0 };
    }

    const followerUserIds = follows.map((f) => f.followerId);
    const users = await userRepo.find({
      where: { id: In(followerUserIds) },
    });

    const userMap = new Map(users.map((u) => [u.id, u]));
    const data = follows.map((f) => {
      const user = userMap.get(f.followerId);
      return {
        id: f.id,
        followedAt: f.createdAt,
        user: user
          ? {
              id: user.id,
              displayName: user.displayName,
              username: user.username,
              avatarUrl: user.avatarUrl,
            }
          : null,
      };
    });

    return { data, total };
  }
}

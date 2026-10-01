import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { UserFollow } from '../entities/user-follow.entity';

@Injectable()
export class UserFollowsRepository extends Repository<UserFollow> {
  constructor(private readonly dataSource: DataSource) {
    super(UserFollow, dataSource.createEntityManager());
  }

  async isFollowing(followerId: string, followingId: string): Promise<boolean> {
    const count = await this.count({
      where: { followerId, followingId },
    });
    return count > 0;
  }

  async findFollowing(
    followerId: string,
    page = 1,
    limit = 20,
  ): Promise<{ data: UserFollow[]; total: number }> {
    const [data, total] = await this.findAndCount({
      where: { followerId },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return { data, total };
  }

  async findFollowers(
    followingId: string,
    page = 1,
    limit = 20,
  ): Promise<{ data: UserFollow[]; total: number }> {
    const [data, total] = await this.findAndCount({
      where: { followingId },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return { data, total };
  }
}

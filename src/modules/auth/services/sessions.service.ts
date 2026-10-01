import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';
import { RefreshToken } from '../entities/refresh-token.entity';
import { User } from '../../users/entities/user.entity';

@Injectable()
export class SessionsService {
  constructor(
    @InjectRepository(RefreshToken)
    private readonly refreshTokenRepository: Repository<RefreshToken>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async findAllSessions(page = 1, limit = 20, search?: string) {
    const skip = (page - 1) * limit;

    const qb = this.refreshTokenRepository
      .createQueryBuilder('session')
      .where('session.isRevoked = :isRevoked', { isRevoked: false })
      .andWhere('session.expiresAt > :now', { now: new Date() });

    if (search) {
      qb.andWhere('session.ipAddress ILIKE :search', {
        search: `%${search}%`,
      });
    }

    qb.orderBy('session.createdAt', 'DESC');
    qb.skip(skip).take(limit);

    const [data, total] = await qb.getManyAndCount();
    const totalPages = Math.ceil(total / limit);

    return {
      success: true,
      message: 'Active sessions retrieved successfully',
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    };
  }

  async getUserSessions(userId: string) {
    const sessions = await this.refreshTokenRepository.find({
      where: {
        userId,
        isRevoked: false,
        expiresAt: MoreThan(new Date()),
      },
      order: { createdAt: 'DESC' },
    });

    return {
      success: true,
      data: sessions,
    };
  }

  async revokeSession(
    sessionId: string,
  ): Promise<{ success: boolean; message: string }> {
    const session = await this.refreshTokenRepository.findOne({
      where: { id: sessionId },
    });

    if (!session) {
      throw new NotFoundException(`Session with ID '${sessionId}' not found`);
    }

    session.isRevoked = true;
    await this.refreshTokenRepository.save(session);

    return {
      success: true,
      message: `Session '${sessionId}' revoked successfully`,
    };
  }

  async revokeAllUserSessions(
    userId: string,
  ): Promise<{ success: boolean; message: string }> {
    await this.refreshTokenRepository.update({ userId }, { isRevoked: true });

    return {
      success: true,
      message: `All active sessions revoked for target user/admin`,
    };
  }
}

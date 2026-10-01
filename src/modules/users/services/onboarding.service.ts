import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OnEvent } from '@nestjs/event-emitter';
import { User } from '../entities/user.entity';
import { OnboardingStatus } from '../../../common/enums/onboarding-status.enum';

export interface OnboardingProgress {
  status: OnboardingStatus;
  percent: number;
}

@Injectable()
export class OnboardingService {
  private readonly logger = new Logger(OnboardingService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  private isProfileComplete(user: User): boolean {
    return Boolean(user.displayName && user.avatarUrl);
  }

  async computeProgress(userId: string): Promise<OnboardingProgress> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      return { status: OnboardingStatus.ACCOUNT_CREATED, percent: 0 };
    }

    const profileComplete = this.isProfileComplete(user);
    const emailVerified = user.isEmailVerified;
    const phoneVerified = user.isPhoneVerified;

    let status = OnboardingStatus.ACCOUNT_CREATED;
    if (profileComplete && (emailVerified || phoneVerified)) {
      status = OnboardingStatus.READY;
    } else if (emailVerified || phoneVerified) {
      status = OnboardingStatus.EMAIL_VERIFIED;
    } else if (profileComplete) {
      status = OnboardingStatus.PROFILE_COMPLETED;
    }

    const checks = [
      Boolean(user.displayName),
      Boolean(user.phone),
      Boolean(user.avatarUrl),
      emailVerified || phoneVerified,
    ];
    const percent = Math.round(
      (checks.filter(Boolean).length / checks.length) * 100,
    );

    return { status, percent };
  }

  async advance(userId: string): Promise<void> {
    const progress = await this.computeProgress(userId);
    await this.userRepository.update(userId, {
      onboardingStatus: progress.status,
    });
    this.logger.log(`Onboarding status for user ${userId}: ${progress.status}`);
  }

  @OnEvent('user.email_verified')
  async onEmailVerified(payload: { userId: string }): Promise<void> {
    if (!payload?.userId) return;
    await this.advance(payload.userId);
  }
}

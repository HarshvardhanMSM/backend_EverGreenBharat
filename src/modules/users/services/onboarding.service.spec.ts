import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { OnboardingService } from './onboarding.service';
import { User } from '../entities/user.entity';
import { OnboardingStatus } from '../../../common/enums/onboarding-status.enum';

describe('OnboardingService', () => {
  let service: OnboardingService;
  let userRepo: any;

  const baseUser = {
    id: 'user-123',
    displayName: null,
    avatarUrl: null,
    isEmailVerified: false,
    isPhoneVerified: false,
    phone: null,
  };

  beforeEach(async () => {
    userRepo = {
      findOne: jest.fn().mockResolvedValue({ ...baseUser }),
      update: jest.fn().mockResolvedValue({ affected: 1 }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OnboardingService,
        { provide: getRepositoryToken(User), useValue: userRepo },
      ],
    }).compile();

    service = module.get<OnboardingService>(OnboardingService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('computeProgress', () => {
    it('returns ACCOUNT_CREATED with 0% for a fresh account', async () => {
      const result = await service.computeProgress('user-123');

      expect(result.status).toBe(OnboardingStatus.ACCOUNT_CREATED);
      expect(result.percent).toBe(0);
    });

    it('returns PROFILE_COMPLETED when profile fields are filled', async () => {
      userRepo.findOne.mockResolvedValue({
        ...baseUser,
        displayName: 'John Doe',
        avatarUrl: 'https://example.com/avatar.jpg',
      });

      const result = await service.computeProgress('user-123');

      expect(result.status).toBe(OnboardingStatus.PROFILE_COMPLETED);
    });
  });

  describe('event listeners', () => {
    it('recomputes status on user.email_verified', async () => {
      await service.onEmailVerified({ userId: 'user-123' });

      expect(userRepo.update).toHaveBeenCalled();
    });

    it('ignores malformed payloads', async () => {
      await service.onEmailVerified({} as never);

      expect(userRepo.update).not.toHaveBeenCalled();
    });
  });
});

import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { User } from './entities/user.entity';
import { UserBlock } from './entities/user-block.entity';
import { RefreshToken } from '../auth/entities/refresh-token.entity';
import { AuditLog } from '../audit/entities/audit-log.entity';
import { OtpService } from '../auth/services/otp.service';
import { OtpPurpose, OtpChannel } from '../auth/entities/otp-code.entity';
import { ModerationService } from '../moderation/moderation.service';
import { ModerationAction } from '../../common/enums/moderation-action.enum';
import { BulkActionType } from './dto/ban-user.dto';
import { OnboardingService } from './services/onboarding.service';
import { UserStatus } from '../../common/enums/user-status.enum';
import { VerificationStatus } from '../../common/enums/verification-status.enum';
import { HashUtil } from '../../common/utils/hash.util';

describe('UsersService', () => {
  let service: UsersService;
  let userRepo: any;
  let userBlockRepo: any;
  let refreshTokenRepo: any;
  let auditLogRepo: any;
  let otpService: any;
  let moderationService: any;
  let onboardingService: any;
  let hashedPassword: string;

  const baseUser = {
    id: 'user-123',
    email: 'user@example.com',
    username: 'user1',
    phone: null,
    password: '',
    displayName: null,
    firstName: null,
    lastName: null,
    avatarUrl: null,
    coverImageUrl: null,
    bio: null,
    gender: null,
    dateOfBirth: null,
    country: null,
    language: 'en',
    timezone: 'UTC',
    preferredContentLanguages: [],
    socialLinks: null,
    isPrivateProfile: false,
    status: UserStatus.ACTIVE,
    verificationStatus: VerificationStatus.NONE,
    isEmailVerified: true,
    isPhoneVerified: false,
    failedLoginAttempts: 0,
    lockoutUntil: null,
    lastLoginAt: null,
    lastSeenAt: null,
    lastUsernameChangedAt: null,
    deactivatedAt: null,
    admin: null,
    createdAt: new Date(),
    deletedAt: null,
  };

  const makeUser = (overrides: Record<string, unknown> = {}) => ({
    ...baseUser,
    ...overrides,
  });

  beforeAll(async () => {
    hashedPassword = await HashUtil.hashPassword('password123');
  });

  beforeEach(async () => {
    userRepo = {
      findOne: jest.fn().mockResolvedValue(null),
      find: jest.fn().mockResolvedValue([]),
      create: jest
        .fn()
        .mockImplementation((data) => ({ ...baseUser, ...data })),
      save: jest.fn().mockImplementation((entity) => Promise.resolve(entity)),
      update: jest.fn().mockResolvedValue({ affected: 1 }),
      softDelete: jest.fn().mockResolvedValue({ affected: 1 }),
      createQueryBuilder: jest.fn(),
      manager: { save: jest.fn().mockResolvedValue({}) },
    };

    userBlockRepo = {
      findOne: jest.fn().mockResolvedValue(null),
      findAndCount: jest.fn().mockResolvedValue([[], 0]),
      create: jest
        .fn()
        .mockImplementation((data) => ({ id: 'block-1', ...data })),
      save: jest.fn().mockImplementation((entity) => Promise.resolve(entity)),
      delete: jest.fn().mockResolvedValue({ affected: 1 }),
    };

    refreshTokenRepo = {
      find: jest.fn().mockResolvedValue([]),
      update: jest.fn().mockResolvedValue({ affected: 1 }),
      createQueryBuilder: jest.fn(),
    };

    auditLogRepo = {
      create: jest
        .fn()
        .mockImplementation((data) => ({ id: 'audit-1', ...data })),
      save: jest.fn().mockImplementation((entity) => Promise.resolve(entity)),
    };

    otpService = {
      requestOtp: jest.fn().mockResolvedValue(undefined),
      verifyOtp: jest.fn().mockResolvedValue(undefined),
    };

    moderationService = {
      record: jest.fn().mockResolvedValue({ id: 'mod-1' }),
      listByUser: jest
        .fn()
        .mockResolvedValue({ data: [], pagination: { total: 0 } }),
    };

    onboardingService = {
      computeProgress: jest
        .fn()
        .mockResolvedValue({ status: 'PROFILE_COMPLETED', percent: 60 }),
      advance: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: getRepositoryToken(User), useValue: userRepo },
        { provide: getRepositoryToken(UserBlock), useValue: userBlockRepo },
        {
          provide: getRepositoryToken(RefreshToken),
          useValue: refreshTokenRepo,
        },
        { provide: getRepositoryToken(AuditLog), useValue: auditLogRepo },
        { provide: OtpService, useValue: otpService },
        { provide: ModerationService, useValue: moderationService },
        { provide: OnboardingService, useValue: onboardingService },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getOwnProfile', () => {
    it('returns the full profile with onboarding status', async () => {
      userRepo.findOne.mockResolvedValue(makeUser());

      const profile = await service.getOwnProfile('user-123');

      expect(profile.username).toBe('user1');
      expect(profile.onboardingStatus).toBe('PROFILE_COMPLETED');
      expect(profile.profileCompletionPercent).toBe(60);
      expect(profile).not.toHaveProperty('password');
      expect(onboardingService.computeProgress).toHaveBeenCalledWith(
        'user-123',
      );
    });

    it('throws NotFoundException when the user does not exist', async () => {
      await expect(service.getOwnProfile('ghost')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('updateOwnProfile', () => {
    it('updates fields and advances onboarding', async () => {
      userRepo.findOne.mockResolvedValue(makeUser());

      const result = await service.updateOwnProfile('user-123', {
        displayName: 'John',
        preferredContentLanguages: ['en', 'ar'],
      });

      expect(result.displayName).toBe('John');
      expect(userRepo.save).toHaveBeenCalled();
      expect(onboardingService.advance).toHaveBeenCalledWith('user-123');
    });

    it('rejects duplicate content languages', async () => {
      userRepo.findOne.mockResolvedValue(makeUser());

      await expect(
        service.updateOwnProfile('user-123', {
          preferredContentLanguages: ['en', 'en'],
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects unsupported social platforms', async () => {
      userRepo.findOne.mockResolvedValue(makeUser());

      await expect(
        service.updateOwnProfile('user-123', {
          socialLinks: { myspace: 'https://myspace.com/x' },
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('checkUsernameAvailability', () => {
    it('reports available when no match exists', async () => {
      userRepo.findOne.mockResolvedValue(null);

      const result = await service.checkUsernameAvailability('free_handle');

      expect(result).toEqual({ username: 'free_handle', available: true });
    });

    it('reports taken when a match exists', async () => {
      userRepo.findOne.mockResolvedValue(makeUser());

      const result = await service.checkUsernameAvailability('user1');

      expect(result.available).toBe(false);
    });

    it('excludes the current user when excludeId is provided', async () => {
      userRepo.findOne.mockImplementation(({ where }: any) => {
        if (where?.id?._type === 'not' && where.id._value === 'user-123') {
          return Promise.resolve(null);
        }
        return Promise.resolve(makeUser({ id: 'user-123' }));
      });

      const result = await service.checkUsernameAvailability(
        'user1',
        'user-123',
      );

      expect(result.available).toBe(true);
    });
  });

  describe('changeUsername', () => {
    it('changes the username and writes an audit log', async () => {
      userRepo.findOne.mockResolvedValue(makeUser());

      const result = await service.changeUsername(
        'user-123',
        { newUsername: 'new_handle' },
        '127.0.0.1',
        'jest',
      );

      expect(result.username).toBe('new_handle');
      expect(userRepo.save).toHaveBeenCalled();
      expect(auditLogRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'USERNAME_CHANGE',
          resource: 'users',
          adminId: null,
        }),
      );
    });

    it('rejects changes within the 14-day cooldown window', async () => {
      userRepo.findOne.mockResolvedValue(
        makeUser({ lastUsernameChangedAt: new Date() }),
      );

      await expect(
        service.changeUsername(
          'user-123',
          { newUsername: 'new_handle' },
          'ip',
          'ua',
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects a username that is already taken by another user', async () => {
      userRepo.findOne.mockResolvedValueOnce(makeUser());
      userRepo.findOne.mockResolvedValueOnce(
        makeUser({ id: 'other-user', username: 'taken_handle' }),
      );

      await expect(
        service.changeUsername(
          'user-123',
          { newUsername: 'taken_handle' },
          'ip',
          'ua',
        ),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('requestEmailChange', () => {
    it('requests an EMAIL_CHANGE OTP for the new address', async () => {
      userRepo.findOne.mockResolvedValueOnce(makeUser());

      const result = await service.requestEmailChange(
        'user-123',
        { newEmail: 'new@example.com' },
        'ip',
        'ua',
      );

      expect(otpService.requestOtp).toHaveBeenCalledWith(
        expect.objectContaining({
          purpose: OtpPurpose.EMAIL_CHANGE,
          channel: OtpChannel.EMAIL,
          destination: 'new@example.com',
          userId: 'user-123',
        }),
      );
      expect(result.message).toContain('Verification code sent');
    });

    it('rejects changing to the current email', async () => {
      userRepo.findOne.mockResolvedValue(makeUser());

      await expect(
        service.requestEmailChange(
          'user-123',
          { newEmail: 'user@example.com' },
          'ip',
          'ua',
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects an email already used by another account', async () => {
      userRepo.findOne.mockResolvedValueOnce(makeUser());
      userRepo.findOne.mockResolvedValueOnce(
        makeUser({ id: 'other-user', email: 'new@example.com' }),
      );

      await expect(
        service.requestEmailChange(
          'user-123',
          { newEmail: 'new@example.com' },
          'ip',
          'ua',
        ),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('confirmEmailChange', () => {
    it('verifies the OTP and updates the email', async () => {
      userRepo.findOne.mockResolvedValue(makeUser());

      const result = await service.confirmEmailChange(
        'user-123',
        { newEmail: 'new@example.com', code: '123456' },
        'ip',
        'ua',
      );

      expect(otpService.verifyOtp).toHaveBeenCalledWith(
        expect.objectContaining({
          purpose: OtpPurpose.EMAIL_CHANGE,
          destination: 'new@example.com',
        }),
      );
      expect(userRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ email: 'new@example.com' }),
      );
      expect(onboardingService.advance).toHaveBeenCalledWith('user-123');
      expect(result.message).toContain('updated successfully');
    });

    it('propagates OTP verification failures', async () => {
      userRepo.findOne.mockResolvedValue(makeUser());
      otpService.verifyOtp.mockRejectedValue(
        new BadRequestException('Invalid verification code'),
      );

      await expect(
        service.confirmEmailChange(
          'user-123',
          { newEmail: 'new@example.com', code: '000000' },
          'ip',
          'ua',
        ),
      ).rejects.toThrow(BadRequestException);
      expect(userRepo.save).not.toHaveBeenCalled();
    });
  });

  describe('phone binding', () => {
    it('requests a PHONE_VERIFICATION OTP', async () => {
      userRepo.findOne.mockResolvedValue(makeUser());

      await service.requestPhoneBind('user-123', { phone: '+15551234567' });

      expect(otpService.requestOtp).toHaveBeenCalledWith(
        expect.objectContaining({
          purpose: OtpPurpose.PHONE_VERIFICATION,
          channel: OtpChannel.PHONE,
          destination: '+15551234567',
        }),
      );
    });

    it('verifies and persists the phone number', async () => {
      userRepo.findOne.mockResolvedValue(makeUser());

      const result = await service.confirmPhoneBind(
        'user-123',
        { phone: '+15551234567', code: '123456' },
        'ip',
        'ua',
      );

      expect(otpService.verifyOtp).toHaveBeenCalled();
      expect(userRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          phone: '+15551234567',
          isPhoneVerified: true,
        }),
      );
      expect(result.message).toContain('verified successfully');
    });
  });

  describe('heartbeat', () => {
    it('updates lastSeenAt and reports online', async () => {
      const result = await service.heartbeat('user-123');

      expect(userRepo.update).toHaveBeenCalledWith('user-123', {
        lastSeenAt: expect.any(Date),
      });
      expect(result.isOnline).toBe(true);
    });
  });

  describe('getPublicProfile', () => {
    it('returns public data for a guest viewer', async () => {
      userRepo.findOne.mockResolvedValue(makeUser());

      const result = await service.getPublicProfile('user1');

      expect(result.username).toBe('user1');
      expect(result).not.toHaveProperty('email');
      expect(result.isBlockedByMe).toBe(false);
    });

    it('throws NotFoundException for unknown usernames', async () => {
      await expect(service.getPublicProfile('ghost')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('blocks access when the account is banned', async () => {
      userRepo.findOne.mockResolvedValue(
        makeUser({ status: UserStatus.BANNED }),
      );

      await expect(service.getPublicProfile('user1')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('hides bio and social links for private profiles', async () => {
      userRepo.findOne.mockResolvedValue(
        makeUser({
          isPrivateProfile: true,
          bio: 'secret bio',
          socialLinks: { twitter: 'https://twitter.com/x' },
        }),
      );

      const result = await service.getPublicProfile('user1', 'other-user');

      expect((result as any).isPrivate).toBe(true);
      expect(result.bio).toBeNull();
      expect(result.socialLinks).toBeNull();
    });

    it('marks the profile as blocked by the requesting user', async () => {
      userRepo.findOne.mockResolvedValue(makeUser());
      userBlockRepo.findOne
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ id: 'block-1' });

      const result = await service.getPublicProfile('user1', 'me-user');

      expect(result.isBlockedByMe).toBe(true);
    });

    it('denies access when the target blocked the requester', async () => {
      userRepo.findOne.mockResolvedValue(makeUser());
      userBlockRepo.findOne
        .mockResolvedValueOnce({ id: 'blocked-me' })
        .mockResolvedValueOnce(null);

      await expect(
        service.getPublicProfile('user1', 'me-user'),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('blocking system', () => {
    it('blocks a target user', async () => {
      userRepo.findOne.mockResolvedValue(makeUser());
      userBlockRepo.findOne.mockResolvedValue(null);

      const result = await service.blockUser('me-user', 'user-123');

      expect(userBlockRepo.save).toHaveBeenCalled();
      expect(result.message).toContain('Blocked user');
    });

    it('does not allow blocking yourself', async () => {
      await expect(service.blockUser('user-123', 'user-123')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('unblocks a target user', async () => {
      const result = await service.unblockUser('me-user', 'user-123');

      expect(userBlockRepo.delete).toHaveBeenCalledWith({
        blockerId: 'me-user',
        blockedId: 'user-123',
      });
      expect(result.message).toContain('Unblocked');
    });
  });

  describe('session management', () => {
    it('lists active sessions', async () => {
      refreshTokenRepo.find.mockResolvedValue([
        {
          id: 's1',
          deviceInfo: 'jest',
          ipAddress: '127.0.0.1',
          createdAt: new Date(),
          expiresAt: new Date(),
        },
      ]);

      const sessions = await service.getUserSessions('user-123');

      expect(refreshTokenRepo.find).toHaveBeenCalledWith({
        where: { userId: 'user-123', isRevoked: false },
        order: { createdAt: 'DESC' },
      });
      expect(sessions).toHaveLength(1);
    });

    it('revokes a single session', async () => {
      const result = await service.revokeSession('user-123', 's1');

      expect(refreshTokenRepo.update).toHaveBeenCalledWith(
        { id: 's1', userId: 'user-123' },
        { isRevoked: true },
      );
      expect(result.message).toContain('Session revoked');
    });

    it('revokes other sessions excluding the current one', async () => {
      const qb = {
        update: jest.fn().mockReturnThis(),
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        execute: jest.fn().mockResolvedValue({ affected: 2 }),
      };
      refreshTokenRepo.createQueryBuilder.mockReturnValue(qb);

      await service.revokeOtherSessions('user-123', 'current-session');

      expect(qb.andWhere).toHaveBeenCalledWith('id != :currentSessionId', {
        currentSessionId: 'current-session',
      });
      expect(qb.execute).toHaveBeenCalled();
    });
  });

  describe('changePassword', () => {
    it('rejects an incorrect current password', async () => {
      userRepo.findOne.mockResolvedValue(
        makeUser({ password: hashedPassword }),
      );

      await expect(
        service.changePassword('user-123', {
          currentPassword: 'wrong-password',
          newPassword: 'newpassword123',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('updates the password and revokes all sessions', async () => {
      userRepo.findOne.mockResolvedValue(
        makeUser({ password: hashedPassword }),
      );

      const result = await service.changePassword('user-123', {
        currentPassword: 'password123',
        newPassword: 'newpassword123',
      });

      expect(userRepo.save).toHaveBeenCalled();
      expect(refreshTokenRepo.update).toHaveBeenCalledWith(
        { userId: 'user-123' },
        { isRevoked: true },
      );
      expect(result.message).toContain('updated successfully');
    });
  });

  describe('deactivateAccount', () => {
    it('suspends the account and records a DEACTIVATE moderation event', async () => {
      userRepo.findOne.mockResolvedValue(
        makeUser({ password: hashedPassword }),
      );

      const result = await service.deactivateAccount(
        'user-123',
        { password: 'password123' },
        'ip',
        'ua',
      );

      expect(userRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ status: UserStatus.SUSPENDED }),
      );
      expect(moderationService.record).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-123',
          action: ModerationAction.DEACTIVATE,
          adminId: null,
        }),
      );
      expect(result.message).toContain('deactivated');
    });

    it('rejects an incorrect password', async () => {
      userRepo.findOne.mockResolvedValue(
        makeUser({ password: hashedPassword }),
      );

      await expect(
        service.deactivateAccount(
          'user-123',
          { password: 'wrong' },
          'ip',
          'ua',
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('deleteAccount', () => {
    it('soft deletes the account and records a DELETE moderation event', async () => {
      userRepo.findOne.mockResolvedValue(
        makeUser({ password: hashedPassword }),
      );

      const result = await service.deleteAccount(
        'user-123',
        { password: 'password123' },
        'ip',
        'ua',
      );

      expect(userRepo.softDelete).toHaveBeenCalledWith('user-123');
      expect(moderationService.record).toHaveBeenCalledWith(
        expect.objectContaining({
          action: ModerationAction.DELETE,
          adminId: null,
        }),
      );
      expect(result.message).toContain('deleted');
    });
  });

  describe('admin user management', () => {
    it('findOneAdmin sanitizes sensitive fields', async () => {
      userRepo.findOne.mockResolvedValue(
        makeUser({ password: 'super-secret-hash', googleId: 'google-1' }),
      );

      const result = await service.findOneAdmin('user-123');

      expect(result.username).toBe('user1');
      expect(result).not.toHaveProperty('password');
      expect(result).not.toHaveProperty('googleId');
    });

    it('updateUserAdmin rejects duplicate emails', async () => {
      userRepo.findOne
        .mockResolvedValueOnce(makeUser())
        .mockResolvedValueOnce(
          makeUser({ id: 'other-user', email: 'taken@example.com' }),
        );

      await expect(
        service.updateUserAdmin('user-123', { email: 'taken@example.com' }),
      ).rejects.toThrow(ConflictException);
    });

    it('updateUserAdmin rejects duplicate usernames', async () => {
      userRepo.findOne
        .mockResolvedValueOnce(makeUser())
        .mockResolvedValueOnce(
          makeUser({ id: 'other-user', username: 'taken_handle' }),
        );

      await expect(
        service.updateUserAdmin('user-123', { username: 'taken_handle' }),
      ).rejects.toThrow(ConflictException);
    });

    it('suspendUser records a SUSPEND moderation event', async () => {
      userRepo.findOne.mockResolvedValue(makeUser());
      userRepo.save.mockResolvedValue(makeUser());

      const result = await service.suspendUser(
        'user-123',
        { reason: 'ToS violation', durationDays: 7 },
        'admin-1',
      );

      expect(userRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ status: UserStatus.SUSPENDED }),
      );
      expect(moderationService.record).toHaveBeenCalledWith(
        expect.objectContaining({
          action: ModerationAction.SUSPEND,
          adminId: 'admin-1',
          reason: 'ToS violation',
        }),
      );
      expect(result.message).toContain('suspended for 7 days');
    });

    it('warnUser records a WARN moderation event', async () => {
      userRepo.findOne.mockResolvedValue(makeUser());

      const result = await service.warnUser(
        'user-123',
        { reason: 'Spam behavior' },
        'admin-1',
      );

      expect(moderationService.record).toHaveBeenCalledWith(
        expect.objectContaining({
          action: ModerationAction.WARN,
          adminId: 'admin-1',
          reason: 'Spam behavior',
        }),
      );
      expect(result.message).toContain('warned');
    });

    it('banUser records a BAN moderation event', async () => {
      userRepo.findOne.mockResolvedValue(makeUser());

      const result = await service.banUser(
        'user-123',
        { reason: 'Permanent abuse' },
        'admin-1',
      );

      expect(userRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ status: UserStatus.BANNED }),
      );
      expect(moderationService.record).toHaveBeenCalledWith(
        expect.objectContaining({ action: ModerationAction.BAN }),
      );
      expect(result.message).toContain('permanently banned');
    });

    it('activateUser resets lockout state and records ACTIVATE', async () => {
      userRepo.findOne.mockResolvedValue(
        makeUser({ status: UserStatus.SUSPENDED }),
      );

      const result = await service.activateUser('user-123', 'admin-1');

      expect(userRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ status: UserStatus.ACTIVE }),
      );
      expect(moderationService.record).toHaveBeenCalledWith(
        expect.objectContaining({ action: ModerationAction.ACTIVATE }),
      );
      expect(result.message).toContain('activated');
    });

    it('prevents admins from banning their own account', async () => {
      userRepo.findOne.mockResolvedValue(makeUser({ id: 'admin-1' }));

      await expect(
        service.banUser('admin-1', { reason: 'x' }, 'admin-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('softDeleteUserAdmin records a DELETE moderation event', async () => {
      userRepo.findOne.mockResolvedValue(makeUser());

      const result = await service.softDeleteUserAdmin('user-123', 'admin-1');

      expect(userRepo.softDelete).toHaveBeenCalledWith('user-123');
      expect(moderationService.record).toHaveBeenCalledWith(
        expect.objectContaining({ action: ModerationAction.DELETE }),
      );
      expect(result.message).toContain('soft-deleted');
    });

    it('bulkUserAction records events for each non-admin user', async () => {
      userRepo.update.mockResolvedValue({ affected: 2 });

      const result = await service.bulkUserAction(
        {
          userIds: ['u1', 'u2', 'admin-1'],
          action: BulkActionType.SUSPEND,
          reason: 'batch',
        },
        'admin-1',
      );

      expect(userRepo.update).toHaveBeenCalledWith(['u1', 'u2'], {
        status: UserStatus.SUSPENDED,
      });
      expect(moderationService.record).toHaveBeenCalledTimes(2);
      expect(result.message).toContain('2 users');
    });

    it('getModerationHistory delegates to the moderation service', async () => {
      await service.getModerationHistory('user-123', 1, 20);

      expect(moderationService.listByUser).toHaveBeenCalledWith(
        'user-123',
        1,
        20,
      );
    });

    it('exportUsersCsv produces a CSV header with Phase 2 columns', async () => {
      const qb = {
        leftJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        withDeleted: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([makeUser()]),
      };
      userRepo.createQueryBuilder.mockReturnValue(qb);

      const csv = await service.exportUsersCsv();

      expect(csv).toContain('OnboardingStatus');
      expect(csv).toContain('AuthProvider');
      expect(csv).toContain('user1');
    });
  });
});

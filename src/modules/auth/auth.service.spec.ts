import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  BadRequestException,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { User } from '../users/entities/user.entity';
import { RefreshToken } from './entities/refresh-token.entity';
import { LoginHistoryService } from './services/login-history.service';
import { OtpService } from './services/otp.service';
import { GoogleOAuthProvider } from './providers/google-oauth.provider';
import { RbacService } from '../rbac/rbac.service';
import { UserStatus } from '../../common/enums/user-status.enum';
import { AuthProvider } from '../../common/enums/auth-provider.enum';
import { OtpPurpose } from './entities/otp-code.entity';
import { HashUtil } from '../../common/utils/hash.util';

describe('AuthService', () => {
  let service: AuthService;
  let userRepo: any;
  let refreshTokenRepo: any;
  let otpService: any;
  let googleOAuthProvider: any;
  let loginHistoryService: any;
  let eventEmitter: any;
  let hashedPassword: string;

  const baseUser = {
    id: 'user-123',
    email: 'user@example.com',
    username: 'user1',
    password: '',
    displayName: null,
    avatarUrl: null,
    status: UserStatus.ACTIVE,
    authProvider: AuthProvider.LOCAL,
    isEmailVerified: false,
    isPhoneVerified: false,
    failedLoginAttempts: 0,
    lockoutUntil: null,
    lastLoginAt: null,
    admin: null,
    createdAt: new Date(),
  };

  beforeAll(async () => {
    hashedPassword = await HashUtil.hashPassword('password123');
  });

  beforeEach(async () => {
    userRepo = {
      findOne: jest.fn().mockResolvedValue(null),
      create: jest
        .fn()
        .mockImplementation((data) => ({ ...baseUser, ...data })),
      save: jest.fn().mockImplementation((entity) => Promise.resolve(entity)),
      manager: { save: jest.fn().mockResolvedValue({}) },
    };

    refreshTokenRepo = {
      findOne: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockImplementation((data) => ({ id: 'rt-1', ...data })),
      save: jest.fn().mockResolvedValue({ id: 'rt-1' }),
      update: jest.fn().mockResolvedValue({ affected: 1 }),
    };

    otpService = {
      requestOtp: jest.fn().mockResolvedValue(undefined),
      verifyOtp: jest.fn().mockResolvedValue(undefined),
    };

    googleOAuthProvider = {
      verifyIdToken: jest.fn(),
    };

    loginHistoryService = {
      recordLogin: jest.fn().mockResolvedValue(undefined),
    };

    eventEmitter = {
      emit: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: getRepositoryToken(User), useValue: userRepo },
        {
          provide: getRepositoryToken(RefreshToken),
          useValue: refreshTokenRepo,
        },
        {
          provide: JwtService,
          useValue: { signAsync: jest.fn().mockResolvedValue('signed-token') },
        },
        {
          provide: ConfigService,
          useValue: { get: jest.fn().mockReturnValue(null) },
        },
        {
          provide: RbacService,
          useValue: {
            getAdminPermissions: jest
              .fn()
              .mockResolvedValue({ roles: [], permissions: [] }),
          },
        },
        { provide: LoginHistoryService, useValue: loginHistoryService },
        { provide: OtpService, useValue: otpService },
        { provide: GoogleOAuthProvider, useValue: googleOAuthProvider },
        { provide: EventEmitter2, useValue: eventEmitter },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('register', () => {
    const registerDto = {
      email: 'new@example.com',
      username: 'newuser',
      password: 'password123',
    };

    it('registers an active LOCAL account, sends OTP and creates a wallet', async () => {
      const result = await service.register(registerDto);

      const created = userRepo.create.mock.calls[0][0];
      expect(created.status).toBe(UserStatus.ACTIVE);
      expect(created.authProvider).toBe(AuthProvider.LOCAL);
      expect(created.isEmailVerified).toBe(false);
      expect(created.password).not.toBe(registerDto.password);

      expect(otpService.requestOtp).toHaveBeenCalledWith(
        expect.objectContaining({ purpose: OtpPurpose.EMAIL_VERIFICATION }),
      );

      expect(result).toHaveProperty('id');
      expect(result).not.toHaveProperty('password');
    });

    it('rejects a duplicate email', async () => {
      userRepo.findOne.mockResolvedValueOnce({
        id: 'existing',
        email: registerDto.email,
      });

      await expect(service.register(registerDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('rejects a duplicate username', async () => {
      userRepo.findOne.mockResolvedValueOnce(null);
      userRepo.findOne.mockResolvedValueOnce({
        id: 'existing',
        username: registerDto.username,
      });

      await expect(service.register(registerDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('persists dateOfBirth when provided', async () => {
      const result = await service.register({
        ...registerDto,
        dateOfBirth: '2005-03-14',
      });

      const created = userRepo.create.mock.calls[0][0];
      expect(created.dateOfBirth).toEqual(new Date('2005-03-14'));
      expect(result).toHaveProperty('id');
    });

    it('rejects registration for users under 13 years old', async () => {
      await expect(
        service.register({
          ...registerDto,
          dateOfBirth: '2020-01-01',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('accepts registration for users 13 or older', async () => {
      const result = await service.register({
        ...registerDto,
        dateOfBirth: '2005-01-01',
      });

      const created = userRepo.create.mock.calls[0][0];
      expect(created.dateOfBirth).toEqual(new Date('2005-01-01'));
      expect(result).toHaveProperty('id');
    });
  });

  describe('loginUser', () => {
    const loginDto = { email: 'user@example.com', password: 'password123' };
    const loginUser = () => ({ ...baseUser, password: hashedPassword });

    it('authenticates with valid credentials and issues a session', async () => {
      userRepo.findOne.mockResolvedValue(loginUser());

      const result = await service.loginUser(loginDto, '127.0.0.1', 'jest');

      expect(loginHistoryService.recordLogin).toHaveBeenCalledWith(
        expect.objectContaining({ status: expect.any(String) }),
      );
      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(result.user.username).toBe('user1');
    });

    it('rejects invalid password and increments failed attempts', async () => {
      const user = loginUser();
      userRepo.findOne.mockResolvedValue(user);

      await expect(
        service.loginUser(
          { ...loginDto, password: 'wrong-password' },
          '127.0.0.1',
          'jest',
        ),
      ).rejects.toThrow(UnauthorizedException);
      expect(user.failedLoginAttempts).toBe(1);
      expect(userRepo.save).toHaveBeenCalled();
    });

    it('locks the account after reaching max failed attempts', async () => {
      const user = { ...loginUser(), failedLoginAttempts: 4 };
      userRepo.findOne.mockResolvedValue(user);

      await expect(
        service.loginUser(
          { ...loginDto, password: 'wrong-password' },
          '127.0.0.1',
          'jest',
        ),
      ).rejects.toThrow(UnauthorizedException);
      expect(user.lockoutUntil).not.toBeNull();
      expect(user.failedLoginAttempts).toBe(0);
    });

    it('blocks login while the account is locked', async () => {
      const user = {
        ...loginUser(),
        lockoutUntil: new Date(Date.now() + 10 * 60 * 1000),
      };
      userRepo.findOne.mockResolvedValue(user);

      await expect(
        service.loginUser(loginDto, '127.0.0.1', 'jest'),
      ).rejects.toThrow(expect.objectContaining({ status: 429 }));
    });

    it('rejects login for suspended accounts', async () => {
      userRepo.findOne.mockResolvedValue({
        ...loginUser(),
        status: UserStatus.SUSPENDED,
      });

      await expect(
        service.loginUser(loginDto, '127.0.0.1', 'jest'),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('verifyEmail', () => {
    it('verifies the email via OTP and saves the user', async () => {
      userRepo.findOne.mockResolvedValue({ ...baseUser });

      const result = await service.verifyEmail({
        email: 'user@example.com',
        code: '123456',
      });

      expect(otpService.verifyOtp).toHaveBeenCalledWith(
        expect.objectContaining({ purpose: OtpPurpose.EMAIL_VERIFICATION }),
      );
      expect(userRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ isEmailVerified: true }),
      );
      expect(eventEmitter.emit).toHaveBeenCalledWith('user.email_verified', {
        userId: 'user-123',
      });
      expect(result.message).toBeDefined();
    });

    it('rejects when the account does not exist', async () => {
      await expect(
        service.verifyEmail({ email: 'ghost@example.com', code: '123456' }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('forgotPassword / resetPassword', () => {
    it('returns a generic message without requesting OTP for unknown emails', async () => {
      const result = await service.forgotPassword({
        email: 'ghost@example.com',
      });

      expect(otpService.requestOtp).not.toHaveBeenCalled();
      expect(result.message).toContain('password reset');
    });

    it('requests a password reset OTP for known emails', async () => {
      userRepo.findOne.mockResolvedValue({ ...baseUser });

      await service.forgotPassword({ email: 'user@example.com' });

      expect(otpService.requestOtp).toHaveBeenCalledWith(
        expect.objectContaining({
          purpose: OtpPurpose.PASSWORD_RESET,
          userId: 'user-123',
        }),
      );
    });

    it('resets the password and revokes all refresh tokens', async () => {
      userRepo.findOne.mockResolvedValue({ ...baseUser });

      const result = await service.resetPassword({
        email: 'user@example.com',
        code: '123456',
        newPassword: 'newpassword123',
      });

      expect(otpService.verifyOtp).toHaveBeenCalledWith(
        expect.objectContaining({ purpose: OtpPurpose.PASSWORD_RESET }),
      );
      expect(refreshTokenRepo.update).toHaveBeenCalledWith(
        { userId: 'user-123' },
        { isRevoked: true },
      );
      expect(userRepo.save).toHaveBeenCalled();
      expect(result.message).toBeDefined();
    });
  });

  describe('phoneLogin', () => {
    const dto = { phone: '+15551234567', code: '123456' };

    it('auto-registers a new PHONE user with a wallet and issues a session', async () => {
      userRepo.findOne.mockResolvedValueOnce(null);
      userRepo.findOne.mockResolvedValueOnce(null);

      const result = await service.phoneLogin(dto, '127.0.0.1', 'jest');

      const created = userRepo.create.mock.calls[0][0];
      expect(created.authProvider).toBe(AuthProvider.PHONE);
      expect(created.isPhoneVerified).toBe(true);
      expect(created.username).toContain('user_');
      expect(otpService.verifyOtp).toHaveBeenCalledWith(
        expect.objectContaining({ purpose: OtpPurpose.PHONE_LOGIN }),
      );
      expect(result).toHaveProperty('accessToken');
    });

    it('logs in an existing phone user without creating a new account', async () => {
      userRepo.findOne.mockResolvedValue({
        ...baseUser,
        authProvider: AuthProvider.PHONE,
      });

      const result = await service.phoneLogin(dto, '127.0.0.1', 'jest');

      expect(userRepo.create).not.toHaveBeenCalled();
      expect(result).toHaveProperty('accessToken');
    });
  });

  describe('googleLogin', () => {
    const profile = {
      googleId: 'google-1',
      email: 'google@example.com',
      emailVerified: true,
      name: 'Google User',
      pictureUrl: 'https://example.com/pic.png',
    };

    it('links an existing account by email', async () => {
      googleOAuthProvider.verifyIdToken.mockResolvedValue(profile);
      const existing = { ...baseUser, email: profile.email };
      userRepo.findOne.mockResolvedValueOnce(null);
      userRepo.findOne.mockResolvedValueOnce(existing);

      const result = await service.googleLogin(
        { idToken: 'token' },
        '127.0.0.1',
        'jest',
      );

      expect(userRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          googleId: 'google-1',
          authProvider: AuthProvider.GOOGLE,
        }),
      );
      expect(result).toHaveProperty('accessToken');
    });

    it('auto-registers a new GOOGLE user', async () => {
      googleOAuthProvider.verifyIdToken.mockResolvedValue(profile);
      userRepo.findOne.mockResolvedValueOnce(null);
      userRepo.findOne.mockResolvedValueOnce(null);
      userRepo.findOne.mockResolvedValueOnce(null);

      const result = await service.googleLogin(
        { idToken: 'token' },
        '127.0.0.1',
        'jest',
      );

      const created = userRepo.create.mock.calls[0][0];
      expect(created.authProvider).toBe(AuthProvider.GOOGLE);
      expect(created.googleId).toBe('google-1');
      expect(created.isEmailVerified).toBe(true);
      expect(result).toHaveProperty('accessToken');
    });
  });

  describe('refreshTokens', () => {
    it('rejects an unknown refresh token', async () => {
      await expect(
        service.refreshTokens('unknown', 'ip', 'ua'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('rejects an expired refresh token', async () => {
      refreshTokenRepo.findOne.mockResolvedValue({
        tokenHash: 'hash',
        isRevoked: false,
        expiresAt: new Date(Date.now() - 1000),
        familyId: 'family-1',
        userId: 'user-123',
      });

      await expect(service.refreshTokens('token', 'ip', 'ua')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('revokes the whole family when a revoked token is reused', async () => {
      refreshTokenRepo.findOne.mockResolvedValue({
        tokenHash: 'hash',
        isRevoked: true,
        familyId: 'family-1',
        userId: 'user-123',
      });

      await expect(service.refreshTokens('token', 'ip', 'ua')).rejects.toThrow(
        UnauthorizedException,
      );
      expect(refreshTokenRepo.update).toHaveBeenCalledWith(
        { familyId: 'family-1' },
        { isRevoked: true },
      );
    });

    it('rotates tokens for a valid refresh token', async () => {
      refreshTokenRepo.findOne.mockResolvedValue({
        tokenHash: 'hash',
        isRevoked: false,
        expiresAt: new Date(Date.now() + 1000 * 60),
        familyId: 'family-1',
        userId: 'user-123',
      });
      userRepo.findOne.mockResolvedValue({ ...baseUser });

      const result = await service.refreshTokens('token', 'ip', 'ua');

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(refreshTokenRepo.save).toHaveBeenCalled();
    });
  });

  describe('logout', () => {
    it('revokes the given refresh token when provided', async () => {
      await service.logout('user-123', 'refresh-token');

      expect(refreshTokenRepo.update).toHaveBeenCalledWith(
        { userId: 'user-123', tokenHash: expect.any(String) },
        { isRevoked: true },
      );
    });

    it('revokes all refresh tokens when no token is provided', async () => {
      await service.logout('user-123');

      expect(refreshTokenRepo.update).toHaveBeenCalledWith(
        { userId: 'user-123' },
        { isRevoked: true },
      );
    });
  });
});

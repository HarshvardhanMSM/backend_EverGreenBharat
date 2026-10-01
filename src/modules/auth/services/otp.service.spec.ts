import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  HttpException,
  HttpStatus,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OtpService } from './otp.service';
import { OtpCodesRepository } from '../repositories/otp-codes.repository';
import { OTP_PROVIDER_TOKEN } from '../providers/otp-provider.interface';
import { OtpPurpose, OtpChannel } from '../entities/otp-code.entity';

describe('OtpService', () => {
  let service: OtpService;
  let repository: any;
  let provider: any;
  let configService: any;

  const configValues: Record<string, string> = {
    'otp.ttlMinutes': '10',
    'otp.cooldownSeconds': '60',
    'otp.maxAttempts': '5',
  };

  const latestRecord = {
    id: 'otp-1',
    purpose: OtpPurpose.EMAIL_VERIFICATION,
    channel: OtpChannel.EMAIL,
    destination: 'user@example.com',
    userId: null,
    codeHash: '',
    expiresAt: new Date(Date.now() + 10 * 60 * 1000),
    attempts: 0,
    maxAttempts: 5,
    isUsed: false,
    createdAt: new Date(),
  };

  beforeEach(async () => {
    repository = {
      findLatest: jest.fn().mockResolvedValue(null),
      create: jest
        .fn()
        .mockImplementation((data) => ({ id: 'otp-new', ...data })),
      save: jest.fn().mockResolvedValue({ id: 'otp-new' }),
      incrementAttempts: jest.fn().mockResolvedValue({ affected: 1 }),
      markUsed: jest.fn().mockResolvedValue({ affected: 1 }),
    };

    provider = {
      sendOtp: jest.fn().mockResolvedValue(undefined),
      isDevelopmentBypassCode: jest.fn().mockReturnValue(false),
    };

    configService = {
      get: jest.fn((key: string) => configValues[key] ?? null),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OtpService,
        { provide: OtpCodesRepository, useValue: repository },
        { provide: OTP_PROVIDER_TOKEN, useValue: provider },
        { provide: ConfigService, useValue: configService },
      ],
    }).compile();

    service = module.get<OtpService>(OtpService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('requestOtp', () => {
    const params = {
      purpose: OtpPurpose.EMAIL_VERIFICATION,
      channel: OtpChannel.EMAIL,
      destination: 'User@Example.com',
    };

    it('creates a hashed OTP record and delivers via provider', async () => {
      await service.requestOtp(params);

      expect(repository.findLatest).toHaveBeenCalledWith(
        params.purpose,
        params.channel,
        'user@example.com',
      );
      expect(repository.create).toHaveBeenCalled();
      expect(repository.save).toHaveBeenCalled();
      expect(provider.sendOtp).toHaveBeenCalled();

      const created = repository.create.mock.calls[0][0];
      expect(created.destination).toBe('user@example.com');
      expect(created.codeHash).toMatch(/^[a-f0-9]{64}$/);
      expect(created.isUsed).toBe(false);
    });

    it('throws 429 when requesting within the cooldown window', async () => {
      repository.findLatest.mockResolvedValue({
        ...latestRecord,
        createdAt: new Date(Date.now() - 10 * 1000),
      });

      let caught: HttpException | undefined;
      try {
        await service.requestOtp(params);
      } catch (error) {
        caught = error as HttpException;
      }

      expect(caught).toBeDefined();
      expect(caught?.getStatus()).toBe(HttpStatus.TOO_MANY_REQUESTS);
      expect(provider.sendOtp).not.toHaveBeenCalled();
    });

    it('allows requesting again after the cooldown window', async () => {
      repository.findLatest.mockResolvedValue({
        ...latestRecord,
        createdAt: new Date(Date.now() - 120 * 1000),
      });

      await expect(service.requestOtp(params)).resolves.toBeUndefined();
      expect(provider.sendOtp).toHaveBeenCalled();
    });

    it('throws ServiceUnavailableException when delivery fails', async () => {
      provider.sendOtp.mockRejectedValue(new Error('SMTP down'));

      await expect(service.requestOtp(params)).rejects.toThrow(
        ServiceUnavailableException,
      );
    });
  });

  describe('verifyOtp', () => {
    const params = {
      purpose: OtpPurpose.EMAIL_VERIFICATION,
      channel: OtpChannel.EMAIL,
      destination: 'user@example.com',
      code: '123456',
      userId: null,
    };

    const matchingRecord = () => ({
      ...latestRecord,
      codeHash:
        '8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92',
    });

    it('marks the code as used on success', async () => {
      repository.findLatest.mockResolvedValue(matchingRecord());

      await service.verifyOtp(params);

      expect(repository.markUsed).toHaveBeenCalledWith('otp-1');
    });

    it('throws BadRequestException when no code was requested', async () => {
      repository.findLatest.mockResolvedValue(null);

      await expect(service.verifyOtp(params)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('throws BadRequestException when the code was already used', async () => {
      repository.findLatest.mockResolvedValue({
        ...matchingRecord(),
        isUsed: true,
      });

      await expect(service.verifyOtp(params)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('throws BadRequestException when the code is expired', async () => {
      repository.findLatest.mockResolvedValue({
        ...matchingRecord(),
        expiresAt: new Date(Date.now() - 1000),
      });

      await expect(service.verifyOtp(params)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('throws BadRequestException when max attempts are exhausted', async () => {
      repository.findLatest.mockResolvedValue({
        ...matchingRecord(),
        attempts: 5,
        maxAttempts: 5,
      });

      await expect(service.verifyOtp(params)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('increments attempts on an invalid code', async () => {
      repository.findLatest.mockResolvedValue(matchingRecord());

      await expect(
        service.verifyOtp({ ...params, code: '000000' }),
      ).rejects.toThrow(BadRequestException);
      expect(repository.incrementAttempts).toHaveBeenCalledWith('otp-1', 1);
    });

    it('accepts the development bypass code when provided by the provider', async () => {
      repository.findLatest.mockResolvedValue(matchingRecord());
      provider.isDevelopmentBypassCode.mockReturnValue(true);

      await service.verifyOtp({ ...params, code: '123456' });

      expect(repository.markUsed).toHaveBeenCalled();
    });

    it('does not treat the bypass code as valid when disabled', async () => {
      repository.findLatest.mockResolvedValue({
        ...matchingRecord(),
        codeHash: '0'.repeat(64),
      });
      provider.isDevelopmentBypassCode.mockReturnValue(false);

      await expect(
        service.verifyOtp({ ...params, code: '123456' }),
      ).rejects.toThrow(BadRequestException);
      expect(repository.incrementAttempts).toHaveBeenCalled();
    });
  });
});

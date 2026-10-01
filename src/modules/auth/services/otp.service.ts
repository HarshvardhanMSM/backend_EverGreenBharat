import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { OtpChannel, OtpPurpose } from '../entities/otp-code.entity';
import { OtpCodesRepository } from '../repositories/otp-codes.repository';
import { OTP_PROVIDER_TOKEN } from '../providers/otp-provider.interface';
import type { OtpProvider } from '../providers/otp-provider.interface';

export interface RequestOtpParams {
  purpose: OtpPurpose;
  channel: OtpChannel;
  destination: string;
  userId?: string | null;
}

export interface VerifyOtpParams {
  purpose: OtpPurpose;
  channel: OtpChannel;
  destination: string;
  code: string;
  userId?: string | null;
}

@Injectable()
export class OtpService {
  private readonly logger = new Logger(OtpService.name);

  constructor(
    private readonly otpCodesRepository: OtpCodesRepository,
    @Inject(OTP_PROVIDER_TOKEN) private readonly otpProvider: OtpProvider,
    private readonly configService: ConfigService,
  ) {}

  private get ttlMinutes(): number {
    return parseInt(
      this.configService.get<string>('otp.ttlMinutes') || '10',
      10,
    );
  }

  private get cooldownSeconds(): number {
    return parseInt(
      this.configService.get<string>('otp.cooldownSeconds') || '60',
      10,
    );
  }

  private get maxAttempts(): number {
    return parseInt(
      this.configService.get<string>('otp.maxAttempts') || '5',
      10,
    );
  }

  private generateCode(): string {
    return crypto.randomInt(100000, 1000000).toString();
  }

  async requestOtp(params: RequestOtpParams): Promise<void> {
    const normalizedDestination = params.destination.trim().toLowerCase();

    const latest = await this.otpCodesRepository.findLatest(
      params.purpose,
      params.channel,
      normalizedDestination,
    );

    if (latest) {
      const secondsSinceLast =
        (new Date().getTime() - latest.createdAt.getTime()) / 1000;
      if (secondsSinceLast < this.cooldownSeconds) {
        throw new HttpException(
          `Please wait ${Math.ceil(this.cooldownSeconds - secondsSinceLast)} second(s) before requesting a new code`,
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }
    }

    const code = this.generateCode();
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + this.ttlMinutes);

    const record = this.otpCodesRepository.create({
      purpose: params.purpose,
      channel: params.channel,
      destination: normalizedDestination,
      userId: params.userId || null,
      codeHash: this.hashCode(code),
      expiresAt,
      attempts: 0,
      maxAttempts: this.maxAttempts,
      isUsed: false,
    });
    await this.otpCodesRepository.save(record);

    try {
      await this.otpProvider.sendOtp({
        purpose: params.purpose,
        channel: params.channel,
        destination: normalizedDestination,
        code,
        expiresAt,
      });
    } catch (error) {
      this.logger.error(`OTP delivery failed: ${(error as Error).message}`);
      throw new ServiceUnavailableException(
        'Unable to deliver verification code',
      );
    }
  }

  async verifyOtp(params: VerifyOtpParams): Promise<void> {
    const normalizedDestination = params.destination.trim().toLowerCase();

    const record = await this.otpCodesRepository.findLatest(
      params.purpose,
      params.channel,
      normalizedDestination,
    );

    if (!record) {
      throw new BadRequestException('No verification code was requested');
    }

    if (record.isUsed) {
      throw new BadRequestException('Verification code has already been used');
    }

    if (new Date() > new Date(record.expiresAt)) {
      throw new BadRequestException('Verification code has expired');
    }

    if (record.attempts >= record.maxAttempts) {
      throw new BadRequestException(
        'Too many invalid attempts. Request a new code',
      );
    }

    const bypass =
      this.otpProvider.isDevelopmentBypassCode?.(params.code) ?? false;
    const codeValid = bypass || this.hashCode(params.code) === record.codeHash;

    if (!codeValid) {
      const attempts = record.attempts + 1;
      await this.otpCodesRepository.incrementAttempts(record.id, attempts);
      throw new BadRequestException('Invalid verification code');
    }

    await this.otpCodesRepository.markUsed(record.id);
  }

  private hashCode(code: string): string {
    return crypto.createHash('sha256').update(code).digest('hex');
  }
}

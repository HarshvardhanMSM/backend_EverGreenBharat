import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OtpProvider, OtpDeliveryPayload } from './otp-provider.interface';

@Injectable()
export class MockOtpProvider implements OtpProvider {
  private readonly logger = new Logger(MockOtpProvider.name);

  constructor(private readonly configService: ConfigService) {}

  sendOtp(payload: OtpDeliveryPayload): Promise<void> {
    this.logger.warn(
      `[MOCK OTP] ${payload.channel} -> ${payload.destination} | purpose=${payload.purpose} | code=${payload.code} | expires=${payload.expiresAt.toISOString()}`,
    );
    return Promise.resolve();
  }

  isDevelopmentBypassCode(code: string): boolean {
    if (!this.isEnabled()) {
      return false;
    }
    return code === '123456';
  }

  isEnabled(): boolean {
    return this.configService.get<string>('otp.mockEnabled') === 'true';
  }
}

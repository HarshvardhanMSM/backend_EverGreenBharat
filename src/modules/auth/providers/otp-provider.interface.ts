import { OtpChannel, OtpPurpose } from '../entities/otp-code.entity';

export const OTP_PROVIDER_TOKEN = 'OTP_PROVIDER';

export interface OtpDeliveryPayload {
  purpose: OtpPurpose;
  channel: OtpChannel;
  destination: string;
  code: string;
  expiresAt: Date;
}

export interface OtpProvider {
  sendOtp(payload: OtpDeliveryPayload): Promise<void>;
  isDevelopmentBypassCode?(code: string): boolean;
}

import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';

export enum OtpPurpose {
  EMAIL_VERIFICATION = 'EMAIL_VERIFICATION',
  PASSWORD_RESET = 'PASSWORD_RESET',
  PHONE_LOGIN = 'PHONE_LOGIN',
  EMAIL_CHANGE = 'EMAIL_CHANGE',
  PHONE_VERIFICATION = 'PHONE_VERIFICATION',
}

export enum OtpChannel {
  EMAIL = 'EMAIL',
  PHONE = 'PHONE',
}

@Entity('otp_codes')
export class OtpCode extends BaseEntity {
  @Index('IDX_otp_codes_purpose_channel_destination')
  @Column({ type: 'varchar', length: 30 })
  purpose: OtpPurpose;

  @Column({ type: 'varchar', length: 10 })
  channel: OtpChannel;

  @Column({ type: 'varchar', length: 255 })
  destination: string;

  @Index('IDX_otp_codes_user_id')
  @Column({ type: 'uuid', nullable: true })
  userId: string | null;

  @Column({ type: 'varchar', length: 64 })
  codeHash: string;

  @Column({ type: 'timestamp' })
  expiresAt: Date;

  @Column({ type: 'int', default: 0 })
  attempts: number;

  @Column({ type: 'int', default: 5 })
  maxAttempts: number;

  @Column({ type: 'boolean', default: false })
  isUsed: boolean;

  @Column({ type: 'timestamp', nullable: true })
  usedAt: Date | null;
}

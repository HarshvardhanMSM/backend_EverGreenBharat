import { Entity, Column, Index, OneToOne, OneToMany } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { UserStatus } from '../../../common/enums/user-status.enum';
import { VerificationStatus } from '../../../common/enums/verification-status.enum';
import { Gender } from '../../../common/enums/gender.enum';
import { AuthProvider } from '../../../common/enums/auth-provider.enum';
import { OnboardingStatus } from '../../../common/enums/onboarding-status.enum';
import { UserBlock } from './user-block.entity';

@Entity('users')
export class User extends BaseEntity {
  @Index('IDX_users_email')
  @Column({
    type: 'varchar',
    length: 150,
    unique: true,
  })
  email: string;

  @Index('IDX_users_username')
  @Column({
    type: 'varchar',
    length: 50,
    unique: true,
  })
  username: string;

  @Index('IDX_users_phone')
  @Column({
    type: 'varchar',
    length: 20,
    unique: true,
    nullable: true,
  })
  phone: string | null;

  @Index('IDX_users_google_id')
  @Column({
    type: 'varchar',
    length: 128,
    unique: true,
    nullable: true,
  })
  googleId: string | null;

  @Column({
    type: 'varchar',
    length: 20,
    default: AuthProvider.LOCAL,
  })
  authProvider: AuthProvider;

  @Column({
    type: 'boolean',
    default: false,
  })
  isPhoneVerified: boolean;

  @Column({
    type: 'varchar',
    length: 255,
  })
  password: string;

  @Index('IDX_users_status')
  @Column({
    type: 'enum',
    enum: UserStatus,
    default: UserStatus.PENDING_VERIFICATION,
  })
  status: UserStatus;

  @Column({
    type: 'varchar',
    length: 100,
    nullable: true,
  })
  displayName: string | null;

  @Column({
    type: 'varchar',
    length: 50,
    nullable: true,
  })
  firstName: string | null;

  @Column({
    type: 'varchar',
    length: 50,
    nullable: true,
  })
  lastName: string | null;

  @Column({
    type: 'text',
    nullable: true,
  })
  avatarUrl: string | null;

  @Column({
    type: 'text',
    nullable: true,
  })
  coverImageUrl: string | null;

  @Column({
    type: 'text',
    nullable: true,
  })
  bio: string | null;

  @Column({
    type: 'enum',
    enum: Gender,
    nullable: true,
  })
  gender: Gender | null;

  @Column({
    type: 'date',
    nullable: true,
  })
  dateOfBirth: Date | null;

  @Index('IDX_users_country')
  @Column({
    type: 'varchar',
    length: 2,
    nullable: true,
  })
  country: string | null;

  @Column({
    type: 'varchar',
    length: 10,
    default: 'en',
  })
  language: string;

  @Column({
    type: 'varchar',
    length: 50,
    default: 'UTC',
  })
  timezone: string;

  @Column({
    type: 'jsonb',
    default: () => "'[]'::jsonb",
  })
  preferredContentLanguages: string[];

  @Index('IDX_users_onboarding_status')
  @Column({
    type: 'varchar',
    length: 30,
    default: OnboardingStatus.ACCOUNT_CREATED,
  })
  onboardingStatus: OnboardingStatus;

  @Column({
    type: 'jsonb',
    nullable: true,
  })
  socialLinks: Record<string, string> | null;

  @Column({
    type: 'boolean',
    default: false,
  })
  isPrivateProfile: boolean;

  @Column({
    type: 'boolean',
    default: false,
  })
  isInfluencer: boolean;

  @Column({
    type: 'boolean',
    default: false,
  })
  isVendor: boolean;

  @Column({
    type: 'jsonb',
    default: () => "'[]'::jsonb",
  })
  addresses: Array<{
    id: string;
    fullName: string;
    phone: string;
    addressLine1: string;
    addressLine2?: string;
    city: string;
    state: string;
    postalCode: string;
    isDefault: boolean;
    latitude?: number;
    longitude?: number;
  }>;

  @Index('IDX_users_verification_status')
  @Column({
    type: 'enum',
    enum: VerificationStatus,
    default: VerificationStatus.NONE,
  })
  verificationStatus: VerificationStatus;

  @Column({
    type: 'boolean',
    default: false,
  })
  isEmailVerified: boolean;

  @Column({
    type: 'int',
    default: 0,
  })
  failedLoginAttempts: number;

  @Column({
    type: 'timestamp',
    nullable: true,
  })
  lockoutUntil: Date | null;

  @Column({
    type: 'timestamp',
    nullable: true,
  })
  lastLoginAt: Date | null;

  @Column({
    type: 'timestamp',
    nullable: true,
  })
  lastSeenAt: Date | null;

  @Column({
    type: 'timestamp',
    nullable: true,
  })
  lastUsernameChangedAt: Date | null;

  @Column({
    type: 'timestamp',
    nullable: true,
  })
  deactivatedAt: Date | null;

  admin?: any;

  @OneToMany(() => UserBlock, (block) => block.blocker)
  blockedUsers?: UserBlock[];

  @OneToMany(() => UserBlock, (block) => block.blocked)
  blockedByUsers?: UserBlock[];
}

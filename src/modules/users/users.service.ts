import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, Not, Repository, ILike } from 'typeorm';
import { User } from './entities/user.entity';
import { Admin } from '../admin/entities/admin.entity';
import { UserBlock } from './entities/user-block.entity';
import { RefreshToken } from '../auth/entities/refresh-token.entity';
import { AuditLog } from '../audit/entities/audit-log.entity';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { ChangeEmailDto, ConfirmEmailChangeDto } from './dto/change-email.dto';
import { ChangeUsernameDto } from './dto/change-username.dto';
import { VerifyPhoneDto, RequestPhoneDto } from './dto/verify-phone.dto';
import {
  DeactivateAccountDto,
  DeleteAccountDto,
} from './dto/deactivate-account.dto';
import { UserQueryDto } from './dto/user-query.dto';
import { AdminUserQueryDto } from './dto/admin-user-query.dto';
import { AdminUpdateUserDto } from './dto/admin-update-user.dto';
import { SuspendUserDto } from './dto/suspend-user.dto';
import { WarnUserDto } from './dto/warn-user.dto';
import {
  BanUserDto,
  BulkUserActionDto,
  BulkActionType,
} from './dto/ban-user.dto';
import { HashUtil } from '../../common/utils/hash.util';
import { UserStatus } from '../../common/enums/user-status.enum';
import { ModerationAction } from '../../common/enums/moderation-action.enum';
import { OtpService } from '../auth/services/otp.service';
import { OtpPurpose, OtpChannel } from '../auth/entities/otp-code.entity';
import { ModerationService } from '../moderation/moderation.service';
import { OnboardingService } from './services/onboarding.service';
import {
  ONLINE_WINDOW_MINUTES,
  USERNAME_CHANGE_COOLDOWN_DAYS,
  SUPPORTED_SOCIAL_PLATFORMS,
} from '../../common/constants/system.constants';

const LANGUAGE_PATTERN = /^[a-z]{2,3}$/;
const SORTABLE_FIELDS = new Set([
  'createdAt',
  'lastLoginAt',
  'lastSeenAt',
  'username',
  'email',
  'onboardingStatus',
]);

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Admin)
    private readonly adminRepository: Repository<Admin>,
    @InjectRepository(UserBlock)
    private readonly userBlockRepository: Repository<UserBlock>,
    @InjectRepository(RefreshToken)
    private readonly refreshTokenRepository: Repository<RefreshToken>,
    @InjectRepository(AuditLog)
    private readonly auditLogRepository: Repository<AuditLog>,
    private readonly otpService: OtpService,
    private readonly moderationService: ModerationService,
    private readonly onboardingService: OnboardingService,
  ) {}

  // --- Public Profile Sanitizer ---
  private sanitizePublicUser(user: User) {
    return {
      id: user.id,
      username: user.username,
      displayName: user.displayName || user.username,
      avatarUrl: user.avatarUrl,
      coverImageUrl: user.coverImageUrl,
      bio: user.bio,
      country: user.country,
      socialLinks: user.socialLinks,
      verificationStatus: user.verificationStatus,
      isOnline: this.isOnline(user),
      lastSeenAt: user.lastSeenAt,
      createdAt: user.createdAt,
    };
  }

  private isOnline(user: User): boolean {
    if (!user.lastSeenAt) {
      return false;
    }
    const windowMs = ONLINE_WINDOW_MINUTES * 60 * 1000;
    return Date.now() - new Date(user.lastSeenAt).getTime() < windowMs;
  }

  private async writeAuditLog(params: {
    adminId?: string | null;
    action: string;
    resource: string;
    resourceId?: string | null;
    httpMethod: string;
    beforeValue?: Record<string, any> | null;
    afterValue?: Record<string, any> | null;
    ipAddress: string;
    userAgent: string;
  }) {
    try {
      const log = this.auditLogRepository.create({
        adminId: params.adminId ?? null,
        action: params.action,
        resource: params.resource,
        resourceId: params.resourceId ?? null,
        httpMethod: params.httpMethod,
        beforeValue: params.beforeValue ?? null,
        afterValue: params.afterValue ?? null,
        ipAddress: params.ipAddress,
        userAgent: params.userAgent,
      });
      await this.auditLogRepository.save(log);
    } catch (error) {
      this.logger.error(`Audit log write failed: ${(error as Error).message}`);
    }
  }

  private validateContentLanguages(languages: string[]) {
    const unique = new Set(languages);
    if (unique.size !== languages.length) {
      throw new BadRequestException(
        'Preferred content languages must be unique',
      );
    }
    for (const language of languages) {
      if (!LANGUAGE_PATTERN.test(language)) {
        throw new BadRequestException(
          `Invalid language code: '${language}' (expected ISO-639 2-3 letter lowercase)`,
        );
      }
    }
  }

  private validateSocialLinks(links: Record<string, string>) {
    for (const [platform, url] of Object.entries(links)) {
      if (!SUPPORTED_SOCIAL_PLATFORMS.includes(platform as never)) {
        throw new BadRequestException(
          `Unsupported social platform: '${platform}'`,
        );
      }
      if (!/^https:\/\//.test(url)) {
        throw new BadRequestException(
          `Social link for '${platform}' must be a valid https URL`,
        );
      }
    }
  }

  private parseSort(sort?: string): {
    field: string;
    direction: 'ASC' | 'DESC';
  } {
    const [field = 'createdAt', direction = 'DESC'] = (
      sort || 'createdAt:desc'
    ).split(':');
    const normalized = field.replace(/user\./g, '').replace(/[^a-zA-Z]/g, '');
    if (!SORTABLE_FIELDS.has(normalized)) {
      throw new BadRequestException(`Unsupported sort field '${field}'`);
    }
    const order = direction.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
    return { field: `user.${normalized}`, direction: order };
  }

  // --- User Profile Endpoints ---
  async getOwnProfile(userId: string) {
    const admin = await this.adminRepository.findOne({
      where: { id: userId },
      relations: { adminRoles: { role: true } },
    });
    if (admin) {
      return {
        id: admin.id,
        email: admin.email,
        username: admin.username,
        displayName: admin.displayName || admin.username,
        avatarUrl: admin.avatarUrl,
        bio: admin.notes || admin.department,
        phone: admin.phone,
        status: admin.status,
        isAdmin: true,
        isSuperAdmin: admin.isSuperAdmin,
        roles: admin.adminRoles?.map((ar) => ar.role?.code).filter(Boolean) || [],
      };
    }

    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User profile not found');
    }

    const onboarding = await this.onboardingService.computeProgress(userId);

    return {
      id: user.id,
      email: user.email,
      username: user.username,
      displayName: user.displayName,
      firstName: user.firstName,
      lastName: user.lastName,
      avatarUrl: user.avatarUrl,
      coverImageUrl: user.coverImageUrl,
      bio: user.bio,
      gender: user.gender,
      dateOfBirth: user.dateOfBirth,
      country: user.country,
      language: user.language,
      timezone: user.timezone,
      preferredContentLanguages: user.preferredContentLanguages,
      socialLinks: user.socialLinks,
      isPrivateProfile: user.isPrivateProfile,
      phone: user.phone,
      isPhoneVerified: user.isPhoneVerified,
      authProvider: user.authProvider,
      status: user.status,
      verificationStatus: user.verificationStatus,
      isEmailVerified: user.isEmailVerified,
      onboardingStatus: onboarding.status,
      profileCompletionPercent: onboarding.percent,
      isOnline: this.isOnline(user),
      lastLoginAt: user.lastLoginAt,
      lastSeenAt: user.lastSeenAt,
      lastUsernameChangedAt: user.lastUsernameChangedAt,
      deactivatedAt: user.deactivatedAt,
      createdAt: user.createdAt,
    };
  }

  async updateOwnProfile(userId: string, updateDto: UpdateProfileDto) {
    const admin = await this.adminRepository.findOne({ where: { id: userId } });
    if (admin) {
      if (updateDto.displayName !== undefined) admin.displayName = updateDto.displayName;
      if ((updateDto as any).username !== undefined) admin.username = (updateDto as any).username;
      if (updateDto.bio !== undefined) admin.notes = updateDto.bio;
      await this.adminRepository.save(admin);
      return this.getOwnProfile(userId);
    }

    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User profile not found');
    }

    if (updateDto.preferredContentLanguages !== undefined) {
      this.validateContentLanguages(updateDto.preferredContentLanguages);
    }
    if (updateDto.socialLinks !== undefined) {
      this.validateSocialLinks(updateDto.socialLinks);
    }

    Object.assign(user, updateDto);
    user.lastSeenAt = new Date();
    await this.userRepository.save(user);

    await this.onboardingService.advance(userId);

    return this.getOwnProfile(userId);
  }

  async updateAvatarUrl(userId: string, avatarUrl: string) {
    const admin = await this.adminRepository.findOne({ where: { id: userId } });
    if (admin) {
      admin.avatarUrl = avatarUrl;
      await this.adminRepository.save(admin);
      return { avatarUrl };
    }

    await this.userRepository.update(userId, {
      avatarUrl,
      lastSeenAt: new Date(),
    });
    await this.onboardingService.advance(userId);
    return { avatarUrl };
  }

  async updateCoverImageUrl(userId: string, coverImageUrl: string) {
    await this.userRepository.update(userId, {
      coverImageUrl,
      lastSeenAt: new Date(),
    });
    return { coverImageUrl };
  }

  async checkUsernameAvailability(username: string, excludeId?: string) {
    const where: FindOptionsWhere<User> = { username: ILike(username) };
    if (excludeId) {
      where.id = Not(excludeId);
    }
    const existing = await this.userRepository.findOne({ where });
    return { username, available: !existing };
  }

  async getOnboardingProgress(userId: string) {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User profile not found');
    }
    return this.onboardingService.computeProgress(userId);
  }

  async changeUsername(
    userId: string,
    dto: ChangeUsernameDto,
    ipAddress: string,
    userAgent: string,
  ) {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User profile not found');
    }

    if (
      user.lastUsernameChangedAt &&
      Date.now() - new Date(user.lastUsernameChangedAt).getTime() <
        USERNAME_CHANGE_COOLDOWN_DAYS * 24 * 60 * 60 * 1000
    ) {
      const nextChange = new Date(user.lastUsernameChangedAt);
      nextChange.setDate(nextChange.getDate() + USERNAME_CHANGE_COOLDOWN_DAYS);
      const remainingDays = Math.ceil(
        (nextChange.getTime() - Date.now()) / (24 * 60 * 60 * 1000),
      );
      throw new BadRequestException(
        `Username can be changed again in ${remainingDays} day(s)`,
      );
    }

    const existing = await this.userRepository.findOne({
      where: { username: ILike(dto.newUsername) },
    });
    if (existing && existing.id !== userId) {
      throw new ConflictException('Username is already taken');
    }

    const previousUsername = user.username;
    user.username = dto.newUsername;
    user.lastUsernameChangedAt = new Date();
    user.lastSeenAt = new Date();
    await this.userRepository.save(user);

    await this.writeAuditLog({
      action: 'USERNAME_CHANGE',
      resource: 'users',
      resourceId: userId,
      httpMethod: 'POST',
      beforeValue: { username: previousUsername },
      afterValue: { username: user.username },
      ipAddress,
      userAgent,
    });

    return {
      message: 'Username updated successfully',
      username: user.username,
    };
  }

  async requestEmailChange(
    userId: string,
    dto: ChangeEmailDto,
    ipAddress: string,
    userAgent: string,
  ) {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User profile not found');
    }
    if (user.email.toLowerCase() === dto.newEmail.toLowerCase()) {
      throw new BadRequestException('New email must differ from current email');
    }

    const existing = await this.userRepository.findOne({
      where: { email: dto.newEmail },
    });
    if (existing) {
      throw new ConflictException('Email address is already in use');
    }

    await this.otpService.requestOtp({
      purpose: OtpPurpose.EMAIL_CHANGE,
      channel: OtpChannel.EMAIL,
      destination: dto.newEmail,
      userId,
    });

    await this.writeAuditLog({
      action: 'EMAIL_CHANGE_REQUEST',
      resource: 'users',
      resourceId: userId,
      httpMethod: 'POST',
      afterValue: { newEmail: dto.newEmail },
      ipAddress,
      userAgent,
    });

    return { message: 'Verification code sent to your new email address.' };
  }

  async confirmEmailChange(
    userId: string,
    dto: ConfirmEmailChangeDto,
    ipAddress: string,
    userAgent: string,
  ) {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User profile not found');
    }

    await this.otpService.verifyOtp({
      purpose: OtpPurpose.EMAIL_CHANGE,
      channel: OtpChannel.EMAIL,
      destination: dto.newEmail,
      code: dto.code,
      userId,
    });

    const existing = await this.userRepository.findOne({
      where: { email: dto.newEmail },
    });
    if (existing && existing.id !== userId) {
      throw new ConflictException('Email address is already in use');
    }

    const previousEmail = user.email;
    user.email = dto.newEmail;
    user.isEmailVerified = true;
    await this.userRepository.save(user);

    await this.writeAuditLog({
      action: 'EMAIL_CHANGE_CONFIRMED',
      resource: 'users',
      resourceId: userId,
      httpMethod: 'POST',
      beforeValue: { email: previousEmail },
      afterValue: { email: user.email },
      ipAddress,
      userAgent,
    });

    await this.onboardingService.advance(userId);

    return { message: 'Email address updated successfully.' };
  }

  async requestPhoneBind(userId: string, dto: RequestPhoneDto) {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User profile not found');
    }

    const existing = await this.userRepository.findOne({
      where: { phone: dto.phone },
    });
    if (existing && existing.id !== userId) {
      throw new ConflictException('Phone number is already in use');
    }

    await this.otpService.requestOtp({
      purpose: OtpPurpose.PHONE_VERIFICATION,
      channel: OtpChannel.PHONE,
      destination: dto.phone,
      userId,
    });

    return { message: 'Verification code sent to your phone number.' };
  }

  async confirmPhoneBind(
    userId: string,
    dto: VerifyPhoneDto,
    ipAddress: string,
    userAgent: string,
  ) {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User profile not found');
    }

    await this.otpService.verifyOtp({
      purpose: OtpPurpose.PHONE_VERIFICATION,
      channel: OtpChannel.PHONE,
      destination: dto.phone,
      code: dto.code,
      userId,
    });

    const existing = await this.userRepository.findOne({
      where: { phone: dto.phone },
    });
    if (existing && existing.id !== userId) {
      throw new ConflictException('Phone number is already in use');
    }

    const previousPhone = user.phone;
    user.phone = dto.phone;
    user.isPhoneVerified = true;
    await this.userRepository.save(user);

    await this.writeAuditLog({
      action: 'PHONE_VERIFIED',
      resource: 'users',
      resourceId: userId,
      httpMethod: 'POST',
      beforeValue: { phone: previousPhone },
      afterValue: { phone: user.phone },
      ipAddress,
      userAgent,
    });

    return { message: 'Phone number verified successfully.' };
  }

  async heartbeat(userId: string) {
    const lastSeenAt = new Date();
    await this.userRepository.update(userId, { lastSeenAt });
    return { isOnline: true, lastSeenAt };
  }

  async searchUsers(queryDto: UserQueryDto) {
    const page = queryDto.page || 1;
    const limit = queryDto.limit || 20;
    const query = queryDto.query?.trim() || '';
    const { field, direction } = this.parseSort(queryDto.sort);

    const qb = this.userRepository
      .createQueryBuilder('user')
      .where('user.status = :status', { status: UserStatus.ACTIVE })
      .andWhere('user.deletedAt IS NULL');

    if (query) {
      qb.andWhere('(user.username ILIKE :q OR user.displayName ILIKE :q)', {
        q: `%${query}%`,
      });
    }

    qb.orderBy(field, direction)
      .skip((page - 1) * limit)
      .take(limit);

    const [users, total] = await qb.getManyAndCount();
    const data = users.map((u) => this.sanitizePublicUser(u));

    return {
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getPublicProfile(targetUsername: string, requestingUserId?: string) {
    const user = await this.userRepository.findOne({
      where: { username: ILike(targetUsername) },
    });

    if (!user || user.deletedAt) {
      throw new NotFoundException(`User @${targetUsername} not found`);
    }

    if (
      user.status === UserStatus.BANNED ||
      user.status === UserStatus.SUSPENDED
    ) {
      throw new ForbiddenException('This account is not available');
    }

    if (requestingUserId) {
      const isBlocked = await this.userBlockRepository.findOne({
        where: { blockerId: user.id, blockedId: requestingUserId },
      });
      if (isBlocked) {
        throw new ForbiddenException('You cannot view this profile');
      }
    }

    const publicData = this.sanitizePublicUser(user);
    let isBlockedByMe = false;
    if (requestingUserId && requestingUserId !== user.id) {
      const block = await this.userBlockRepository.findOne({
        where: { blockerId: requestingUserId, blockedId: user.id },
      });
      isBlockedByMe = Boolean(block);
    }

    const response = { ...publicData, isBlockedByMe };

    if (user.isPrivateProfile && requestingUserId !== user.id) {
      return {
        ...response,
        bio: null,
        socialLinks: null,
        isPrivate: true,
      };
    }

    return response;
  }

  // --- Blocking System ---
  async blockUser(blockerId: string, targetUserId: string) {
    if (blockerId === targetUserId) {
      throw new BadRequestException('You cannot block your own account');
    }

    const targetUser = await this.userRepository.findOne({
      where: { id: targetUserId },
    });
    if (!targetUser) {
      throw new NotFoundException('Target user not found');
    }

    let block = await this.userBlockRepository.findOne({
      where: { blockerId, blockedId: targetUserId },
    });

    if (!block) {
      block = this.userBlockRepository.create({
        blockerId,
        blockedId: targetUserId,
      });
      await this.userBlockRepository.save(block);
    }

    return { message: `Blocked user @${targetUser.username} successfully` };
  }

  async unblockUser(blockerId: string, targetUserId: string) {
    await this.userBlockRepository.delete({
      blockerId,
      blockedId: targetUserId,
    });
    return { message: 'Unblocked user successfully' };
  }

  async getBlockedUsers(userId: string, queryDto: UserQueryDto) {
    const page = queryDto.page || 1;
    const limit = queryDto.limit || 20;

    const [blocks, total] = await this.userBlockRepository.findAndCount({
      where: { blockerId: userId },
      relations: { blocked: true },
      skip: (page - 1) * limit,
      take: limit,
    });

    const data = blocks.map((b) => this.sanitizePublicUser(b.blocked));

    return {
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // --- Session Management ---
  async getUserSessions(userId: string) {
    const sessions = await this.refreshTokenRepository.find({
      where: { userId, isRevoked: false },
      order: { createdAt: 'DESC' },
    });

    return sessions.map((s) => ({
      id: s.id,
      deviceInfo: s.deviceInfo,
      ipAddress: s.ipAddress,
      createdAt: s.createdAt,
      expiresAt: s.expiresAt,
    }));
  }

  async revokeSession(userId: string, sessionId: string) {
    await this.refreshTokenRepository.update(
      { id: sessionId, userId },
      { isRevoked: true },
    );
    return { message: 'Session revoked successfully' };
  }

  async revokeOtherSessions(userId: string, currentSessionId?: string) {
    const qb = this.refreshTokenRepository
      .createQueryBuilder()
      .update(RefreshToken)
      .set({ isRevoked: true })
      .where('userId = :userId', { userId });

    if (currentSessionId) {
      qb.andWhere('id != :currentSessionId', { currentSessionId });
    }

    await qb.execute();
    return { message: 'All other sessions revoked successfully' };
  }

  // --- Security & Account Management ---
  async changePassword(userId: string, dto: ChangePasswordDto) {
    const admin = await this.adminRepository.findOne({ where: { id: userId } });
    if (admin) {
      const isValid = await HashUtil.comparePassword(
        dto.currentPassword,
        admin.password,
      );
      if (!isValid) {
        throw new BadRequestException('Current password is incorrect');
      }
      admin.password = await HashUtil.hashPassword(dto.newPassword);
      await this.adminRepository.save(admin);
      await this.refreshTokenRepository.update({ userId }, { isRevoked: true });
      return { message: 'Password updated successfully. Please log in again.' };
    }

    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const isValid = await HashUtil.comparePassword(
      dto.currentPassword,
      user.password,
    );
    if (!isValid) {
      throw new BadRequestException('Current password is incorrect');
    }

    user.password = await HashUtil.hashPassword(dto.newPassword);
    await this.userRepository.save(user);

    await this.refreshTokenRepository.update({ userId }, { isRevoked: true });

    return { message: 'Password updated successfully. Please log in again.' };
  }

  async deactivateAccount(
    userId: string,
    dto: DeactivateAccountDto,
    ipAddress: string,
    userAgent: string,
  ) {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const isValid = await HashUtil.comparePassword(dto.password, user.password);
    if (!isValid) {
      throw new BadRequestException('Password is incorrect');
    }

    user.status = UserStatus.SUSPENDED;
    user.deactivatedAt = new Date();
    await this.userRepository.save(user);

    await this.refreshTokenRepository.update({ userId }, { isRevoked: true });
    await this.moderationService.record({
      userId,
      action: ModerationAction.DEACTIVATE,
      reason: 'User self-deactivation',
      adminId: null,
    });
    await this.writeAuditLog({
      action: 'ACCOUNT_DEACTIVATED',
      resource: 'users',
      resourceId: userId,
      httpMethod: 'POST',
      ipAddress,
      userAgent,
    });
    return { message: 'Account deactivated successfully.' };
  }

  async deleteAccount(
    userId: string,
    dto: DeleteAccountDto,
    ipAddress: string,
    userAgent: string,
  ) {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const isValid = await HashUtil.comparePassword(dto.password, user.password);
    if (!isValid) {
      throw new BadRequestException('Password is incorrect');
    }

    await this.userRepository.softDelete(userId);
    await this.refreshTokenRepository.update({ userId }, { isRevoked: true });
    await this.moderationService.record({
      userId,
      action: ModerationAction.DELETE,
      reason: 'User self-deletion',
      adminId: null,
    });
    await this.writeAuditLog({
      action: 'ACCOUNT_DELETED',
      resource: 'users',
      resourceId: userId,
      httpMethod: 'DELETE',
      ipAddress,
      userAgent,
    });

    return { message: 'Account deleted successfully.' };
  }

  // --- Admin User Management Endpoints ---
  async findAllAdmin(queryDto: AdminUserQueryDto) {
    const page = queryDto.page || 1;
    const limit = queryDto.limit || 20;
    const search = queryDto.search?.trim() || '';
    const { field, direction } = this.parseSort(queryDto.sort);

    const qb = this.userRepository
      .createQueryBuilder('user')
      .withDeleted();

    if (search) {
      qb.andWhere(
        '(user.username ILIKE :s OR user.email ILIKE :s OR user.displayName ILIKE :s)',
        { s: `%${search}%` },
      );
    }

    if (queryDto.status) {
      qb.andWhere('user.status = :status', { status: queryDto.status });
    }

    if (queryDto.verificationStatus) {
      qb.andWhere('user.verificationStatus = :vStatus', {
        vStatus: queryDto.verificationStatus,
      });
    }

    if (queryDto.country) {
      qb.andWhere('user.country = :country', { country: queryDto.country });
    }

    if (queryDto.authProvider) {
      qb.andWhere('user.authProvider = :authProvider', {
        authProvider: queryDto.authProvider,
      });
    }

    qb.orderBy(field, direction)
      .skip((page - 1) * limit)
      .take(limit);

    const [users, total] = await qb.getManyAndCount();

    const data = users.map((u) => ({
      id: u.id,
      username: u.username,
      email: u.email,
      phone: u.phone,
      displayName: u.displayName,
      avatarUrl: u.avatarUrl,
      status: u.status,
      verificationStatus: u.verificationStatus,
      authProvider: u.authProvider,
      onboardingStatus: u.onboardingStatus,
      country: u.country,
      isEmailVerified: u.isEmailVerified,
      isPhoneVerified: u.isPhoneVerified,
      isAdmin: false,
      lastLoginAt: u.lastLoginAt,
      lastSeenAt: u.lastSeenAt,
      createdAt: u.createdAt,
      deletedAt: u.deletedAt,
    }));

    return {
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOneAdmin(id: string) {
    const user = await this.userRepository.findOne({
      where: { id },
      relations: { admin: true },
      withDeleted: true,
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    return {
      id: user.id,
      email: user.email,
      username: user.username,
      phone: user.phone,
      displayName: user.displayName,
      firstName: user.firstName,
      lastName: user.lastName,
      avatarUrl: user.avatarUrl,
      coverImageUrl: user.coverImageUrl,
      bio: user.bio,
      gender: user.gender,
      dateOfBirth: user.dateOfBirth,
      country: user.country,
      language: user.language,
      timezone: user.timezone,
      preferredContentLanguages: user.preferredContentLanguages,
      socialLinks: user.socialLinks,
      isPrivateProfile: user.isPrivateProfile,
      authProvider: user.authProvider,
      isPhoneVerified: user.isPhoneVerified,
      isEmailVerified: user.isEmailVerified,
      status: user.status,
      verificationStatus: user.verificationStatus,
      onboardingStatus: user.onboardingStatus,
      failedLoginAttempts: user.failedLoginAttempts,
      lockoutUntil: user.lockoutUntil,
      lastLoginAt: user.lastLoginAt,
      lastSeenAt: user.lastSeenAt,
      lastUsernameChangedAt: user.lastUsernameChangedAt,
      deactivatedAt: user.deactivatedAt,
      isAdmin: !!user.admin,
      createdAt: user.createdAt,
      deletedAt: user.deletedAt,
    };
  }

  async updateUserAdmin(id: string, adminUpdateDto: AdminUpdateUserDto) {
    const user = await this.userRepository.findOne({
      where: { id },
      withDeleted: true,
    });
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    if (adminUpdateDto.email) {
      const existing = await this.userRepository.findOne({
        where: { email: adminUpdateDto.email },
        withDeleted: true,
      });
      if (existing && existing.id !== id) {
        throw new ConflictException('Email address is already in use');
      }
    }

    if (adminUpdateDto.username) {
      const existing = await this.userRepository.findOne({
        where: { username: adminUpdateDto.username },
        withDeleted: true,
      });
      if (existing && existing.id !== id) {
        throw new ConflictException('Username is already taken');
      }
    }

    if (adminUpdateDto.phone) {
      const existing = await this.userRepository.findOne({
        where: { phone: adminUpdateDto.phone },
        withDeleted: true,
      });
      if (existing && existing.id !== id) {
        throw new ConflictException('Phone number is already in use');
      }
    }

    if (adminUpdateDto.socialLinks !== undefined) {
      this.validateSocialLinks(adminUpdateDto.socialLinks);
    }
    if (adminUpdateDto.preferredContentLanguages !== undefined) {
      this.validateContentLanguages(adminUpdateDto.preferredContentLanguages);
    }

    Object.assign(user, adminUpdateDto);
    return this.userRepository.save(user);
  }

  async suspendUser(id: string, dto: SuspendUserDto, currentAdminId: string) {
    const user = await this.findOneAdmin(id);

    if (user.id === currentAdminId) {
      throw new BadRequestException('Admins cannot suspend their own account');
    }

    const lockoutTime = new Date();
    lockoutTime.setDate(lockoutTime.getDate() + dto.durationDays);

    user.status = UserStatus.SUSPENDED;
    user.lockoutUntil = lockoutTime;
    await this.userRepository.save(user);

    await this.refreshTokenRepository.update(
      { userId: id },
      { isRevoked: true },
    );
    await this.moderationService.record({
      userId: id,
      action: ModerationAction.SUSPEND,
      reason: dto.reason,
      adminId: currentAdminId,
    });
    return {
      message: `User @${user.username} suspended for ${dto.durationDays} days. Reason: ${dto.reason}`,
    };
  }

  async warnUser(id: string, dto: WarnUserDto, currentAdminId: string) {
    const user = await this.findOneAdmin(id);

    if (user.id === currentAdminId) {
      throw new BadRequestException('Admins cannot warn their own account');
    }

    await this.moderationService.record({
      userId: id,
      action: ModerationAction.WARN,
      reason: dto.reason,
      adminId: currentAdminId,
    });
    return { message: `User @${user.username} warned. Reason: ${dto.reason}` };
  }

  async banUser(id: string, dto: BanUserDto, currentAdminId: string) {
    const user = await this.findOneAdmin(id);

    if (user.id === currentAdminId) {
      throw new BadRequestException('Admins cannot ban their own account');
    }

    user.status = UserStatus.BANNED;
    await this.userRepository.save(user);

    await this.refreshTokenRepository.update(
      { userId: id },
      { isRevoked: true },
    );
    await this.moderationService.record({
      userId: id,
      action: ModerationAction.BAN,
      reason: dto.reason,
      adminId: currentAdminId,
    });
    return {
      message: `User @${user.username} has been permanently banned. Reason: ${dto.reason}`,
    };
  }

  async activateUser(id: string, currentAdminId: string) {
    const user = await this.findOneAdmin(id);
    user.status = UserStatus.ACTIVE;
    user.lockoutUntil = null;
    user.failedLoginAttempts = 0;
    user.deactivatedAt = null;
    await this.userRepository.save(user);

    await this.moderationService.record({
      userId: id,
      action: ModerationAction.ACTIVATE,
      reason: 'Account reactivated by admin',
      adminId: currentAdminId,
    });

    return { message: `User @${user.username} activated successfully` };
  }

  async softDeleteUserAdmin(id: string, currentAdminId: string) {
    const user = await this.findOneAdmin(id);

    if (user.id === currentAdminId) {
      throw new BadRequestException('Admins cannot delete their own account');
    }

    await this.userRepository.softDelete(id);
    await this.refreshTokenRepository.update(
      { userId: id },
      { isRevoked: true },
    );
    await this.moderationService.record({
      userId: id,
      action: ModerationAction.DELETE,
      reason: 'Deleted by admin',
      adminId: currentAdminId,
    });
    return { message: `User @${user.username} soft-deleted successfully` };
  }

  async bulkUserAction(dto: BulkUserActionDto, currentAdminId: string) {
    const filteredUserIds = dto.userIds.filter((id) => id !== currentAdminId);

    if (dto.action === BulkActionType.SUSPEND) {
      await this.userRepository.update(filteredUserIds, {
        status: UserStatus.SUSPENDED,
      });
    } else if (dto.action === BulkActionType.BAN) {
      await this.userRepository.update(filteredUserIds, {
        status: UserStatus.BANNED,
      });
    } else if (dto.action === BulkActionType.ACTIVATE) {
      await this.userRepository.update(filteredUserIds, {
        status: UserStatus.ACTIVE,
        lockoutUntil: null,
      });
    }

    for (const userId of filteredUserIds) {
      await this.moderationService.record({
        userId,
        action: dto.action as unknown as ModerationAction,
        reason: dto.reason,
        adminId: currentAdminId,
      });
    }

    return {
      message: `Bulk ${dto.action} completed for ${filteredUserIds.length} users.`,
    };
  }

  async getModerationHistory(id: string, page = 1, limit = 20) {
    return this.moderationService.listByUser(id, page, limit);
  }

  async exportUsersCsv() {
    const qb = this.userRepository
      .createQueryBuilder('user')
      .withDeleted();

    const users = await qb.getMany();
    const header =
      'ID,Username,Email,Phone,Status,VerificationStatus,OnboardingStatus,AuthProvider,EmailVerified,CreatedAt\n';
    const rows = users
      .map(
        (u) =>
          `"${u.id}","${u.username}","${u.email}","${u.phone || ''}","${u.status}","${u.verificationStatus}","${u.onboardingStatus}","${u.authProvider}","${u.isEmailVerified}","${u.createdAt.toISOString()}"`,
      )
      .join('\n');

    return header + rows;
  }

  // --- Address Management (Nursery Marketplace) ---
  async getAddresses(userId: string) {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');
    return user.addresses || [];
  }

  async addAddress(userId: string, dto: any) {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    const addresses = user.addresses || [];
    const newAddress = {
      id: crypto.randomUUID(),
      ...dto,
      isDefault: dto.isDefault ?? addresses.length === 0,
    };

    if (newAddress.isDefault) {
      addresses.forEach((a) => (a.isDefault = false));
    }

    addresses.push(newAddress);
    user.addresses = addresses;
    await this.userRepository.save(user);

    return newAddress;
  }

  async updateAddress(userId: string, addressId: string, dto: any) {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    const addresses = user.addresses || [];
    const index = addresses.findIndex((a) => a.id === addressId);
    if (index === -1) throw new NotFoundException('Address not found');

    if (dto.isDefault) {
      addresses.forEach((a) => (a.isDefault = false));
    }

    addresses[index] = { ...addresses[index], ...dto, id: addressId };
    user.addresses = addresses;
    await this.userRepository.save(user);

    return addresses[index];
  }

  async deleteAddress(userId: string, addressId: string) {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    const addresses = (user.addresses || []).filter((a) => a.id !== addressId);
    user.addresses = addresses;
    await this.userRepository.save(user);

    return { message: 'Address deleted successfully' };
  }
}

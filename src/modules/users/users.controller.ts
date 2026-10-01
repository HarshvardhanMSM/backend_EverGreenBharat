import {
  Controller,
  Get,
  Patch,
  Post,
  Delete,
  Body,
  Param,
  Query,
  Inject,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiConsumes,
} from '@nestjs/swagger';
import { UsersService } from './users.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { ChangeEmailDto, ConfirmEmailChangeDto } from './dto/change-email.dto';
import { ChangeUsernameDto } from './dto/change-username.dto';
import { RequestPhoneDto, VerifyPhoneDto } from './dto/verify-phone.dto';
import { CreateAddressDto, UpdateAddressDto } from './dto/address.dto';
import {
  DeactivateAccountDto,
  DeleteAccountDto,
} from './dto/deactivate-account.dto';
import { UserQueryDto } from './dto/user-query.dto';
import { Public } from '../../common/decorators/public.decorator';
import { OptionalAuth } from '../../common/decorators/optional-auth.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { IpAddress } from '../../common/decorators/ip-address.decorator';
import { UserAgent } from '../../common/decorators/user-agent.decorator';
import { STORAGE_PROVIDER_TOKEN } from '../../common/storage/storage-provider.interface';
import type { StorageProvider } from '../../common/storage/storage-provider.interface';

@ApiTags('Users')
@Controller('v1/users')
@ApiBearerAuth('JWT-auth')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    @Inject(STORAGE_PROVIDER_TOKEN)
    private readonly storageProvider: StorageProvider,
  ) {}

  @Get('me')
  @ApiOperation({ summary: 'Get current authenticated user profile' })
  async getOwnProfile(@CurrentUser('id') userId: string) {
    return this.usersService.getOwnProfile(userId);
  }

  @Get('me/onboarding')
  @ApiOperation({ summary: 'Get onboarding status and completion percentage' })
  async getOnboarding(@CurrentUser('id') userId: string) {
    return this.usersService.getOnboardingProgress(userId);
  }

  @Patch('me')
  @ApiOperation({ summary: 'Update profile information' })
  async updateOwnProfile(
    @CurrentUser('id') userId: string,
    @Body() updateDto: UpdateProfileDto,
  ) {
    return this.usersService.updateOwnProfile(userId, updateDto);
  }

  @Post('me/avatar')
  @ApiOperation({ summary: 'Upload avatar image (Max 5MB, jpeg/png/webp)' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 5 * 1024 * 1024 },
    }),
  )
  async uploadAvatar(
    @CurrentUser('id') userId: string,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('Image file is required');
    }
    const avatarUrl = await this.storageProvider.save(
      'avatars',
      file.buffer,
      file.mimetype,
    );
    return this.usersService.updateAvatarUrl(userId, avatarUrl);
  }

  @Post('me/cover')
  @ApiOperation({
    summary: 'Upload cover banner image (Max 10MB, jpeg/png/webp)',
  })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 10 * 1024 * 1024 },
    }),
  )
  async uploadCover(
    @CurrentUser('id') userId: string,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('Image file is required');
    }
    const coverImageUrl = await this.storageProvider.save(
      'covers',
      file.buffer,
      file.mimetype,
    );
    return this.usersService.updateCoverImageUrl(userId, coverImageUrl);
  }

  @Public()
  @Get('check-username')
  @ApiOperation({ summary: 'Check username availability' })
  async checkUsername(
    @Query('username') username: string,
    @Query('excludeId') excludeId?: string,
  ) {
    if (!username) {
      throw new BadRequestException('Username query parameter is required');
    }
    return this.usersService.checkUsernameAvailability(username, excludeId);
  }

  @Public()
  @Get('search')
  @ApiOperation({ summary: 'Search users by handle/name' })
  async searchUsers(@Query() queryDto: UserQueryDto) {
    return this.usersService.searchUsers(queryDto);
  }

  @OptionalAuth()
  @Get('profile/:username')
  @ApiOperation({ summary: 'View public user profile (auth optional)' })
  async getPublicProfile(
    @Param('username') username: string,
    @CurrentUser('id') requestingUserId?: string,
  ) {
    return this.usersService.getPublicProfile(username, requestingUserId);
  }

  @Post('me/username')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Change username (14-day cooldown)' })
  async changeUsername(
    @CurrentUser('id') userId: string,
    @Body() dto: ChangeUsernameDto,
    @IpAddress() ipAddress: string,
    @UserAgent() userAgent: string,
  ) {
    return this.usersService.changeUsername(userId, dto, ipAddress, userAgent);
  }

  @Post('me/email/change-request')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Request email change (OTP sent to new address)' })
  async requestEmailChange(
    @CurrentUser('id') userId: string,
    @Body() dto: ChangeEmailDto,
    @IpAddress() ipAddress: string,
    @UserAgent() userAgent: string,
  ) {
    return this.usersService.requestEmailChange(
      userId,
      dto,
      ipAddress,
      userAgent,
    );
  }

  @Post('me/email/change-confirm')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Confirm email change with OTP' })
  async confirmEmailChange(
    @CurrentUser('id') userId: string,
    @Body() dto: ConfirmEmailChangeDto,
    @IpAddress() ipAddress: string,
    @UserAgent() userAgent: string,
  ) {
    return this.usersService.confirmEmailChange(
      userId,
      dto,
      ipAddress,
      userAgent,
    );
  }

  @Post('me/phone/request')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Request phone binding (OTP sent to phone)' })
  async requestPhoneBind(
    @CurrentUser('id') userId: string,
    @Body() dto: RequestPhoneDto,
  ) {
    return this.usersService.requestPhoneBind(userId, dto);
  }

  @Post('me/phone/verify')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Confirm phone binding with OTP' })
  async confirmPhoneBind(
    @CurrentUser('id') userId: string,
    @Body() dto: VerifyPhoneDto,
    @IpAddress() ipAddress: string,
    @UserAgent() userAgent: string,
  ) {
    return this.usersService.confirmPhoneBind(
      userId,
      dto,
      ipAddress,
      userAgent,
    );
  }

  @Post('me/heartbeat')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update last-seen presence (online window)' })
  async heartbeat(@CurrentUser('id') userId: string) {
    return this.usersService.heartbeat(userId);
  }

  @Post('block/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Block a target user' })
  async blockUser(
    @CurrentUser('id') blockerId: string,
    @Param('id') targetUserId: string,
  ) {
    return this.usersService.blockUser(blockerId, targetUserId);
  }

  @Delete('block/:id')
  @ApiOperation({ summary: 'Unblock a target user' })
  async unblockUser(
    @CurrentUser('id') blockerId: string,
    @Param('id') targetUserId: string,
  ) {
    return this.usersService.unblockUser(blockerId, targetUserId);
  }

  @Get('me/blocked')
  @ApiOperation({ summary: 'Get list of blocked users' })
  async getBlockedUsers(
    @CurrentUser('id') userId: string,
    @Query() queryDto: UserQueryDto,
  ) {
    return this.usersService.getBlockedUsers(userId, queryDto);
  }

  @Get('me/sessions')
  @ApiOperation({ summary: 'Get active device sessions' })
  async getUserSessions(@CurrentUser('id') userId: string) {
    return this.usersService.getUserSessions(userId);
  }

  @Delete('me/sessions/:id')
  @ApiOperation({ summary: 'Revoke specific session' })
  async revokeSession(
    @CurrentUser('id') userId: string,
    @Param('id') sessionId: string,
  ) {
    return this.usersService.revokeSession(userId, sessionId);
  }

  @Delete('me/sessions')
  @ApiOperation({ summary: 'Revoke all other active sessions' })
  async revokeOtherSessions(@CurrentUser('id') userId: string) {
    return this.usersService.revokeOtherSessions(userId);
  }

  @Post('me/change-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Change user password' })
  async changePassword(
    @CurrentUser('id') userId: string,
    @Body() dto: ChangePasswordDto,
  ) {
    return this.usersService.changePassword(userId, dto);
  }

  @Post('me/change-email')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Request email update (legacy alias)' })
  async changeEmail(
    @CurrentUser('id') userId: string,
    @Body() dto: ChangeEmailDto,
    @IpAddress() ipAddress: string,
    @UserAgent() userAgent: string,
  ) {
    return this.usersService.requestEmailChange(
      userId,
      dto,
      ipAddress,
      userAgent,
    );
  }

  @Post('me/deactivate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Deactivate own account' })
  async deactivateAccount(
    @CurrentUser('id') userId: string,
    @Body() dto: DeactivateAccountDto,
    @IpAddress() ipAddress: string,
    @UserAgent() userAgent: string,
  ) {
    return this.usersService.deactivateAccount(
      userId,
      dto,
      ipAddress,
      userAgent,
    );
  }

  @Delete('me')
  @ApiOperation({ summary: 'Delete own account' })
  async deleteAccount(
    @CurrentUser('id') userId: string,
    @Body() dto: DeleteAccountDto,
    @IpAddress() ipAddress: string,
    @UserAgent() userAgent: string,
  ) {
    return this.usersService.deleteAccount(userId, dto, ipAddress, userAgent);
  }

  // ─── Customer Delivery Addresses (Nursery Marketplace) ─────────────────────────

  @Get('me/addresses')
  @ApiOperation({ summary: 'List all saved delivery addresses for current user' })
  async getAddresses(@CurrentUser('id') userId: string) {
    return this.usersService.getAddresses(userId);
  }

  @Post('me/addresses')
  @ApiOperation({ summary: 'Add a new delivery address' })
  async addAddress(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateAddressDto,
  ) {
    return this.usersService.addAddress(userId, dto);
  }

  @Patch('me/addresses/:id')
  @ApiOperation({ summary: 'Update an existing delivery address' })
  async updateAddress(
    @CurrentUser('id') userId: string,
    @Param('id') addressId: string,
    @Body() dto: UpdateAddressDto,
  ) {
    return this.usersService.updateAddress(userId, addressId, dto);
  }

  @Delete('me/addresses/:id')
  @ApiOperation({ summary: 'Delete a delivery address' })
  async deleteAddress(
    @CurrentUser('id') userId: string,
    @Param('id') addressId: string,
  ) {
    return this.usersService.deleteAddress(userId, addressId);
  }
}

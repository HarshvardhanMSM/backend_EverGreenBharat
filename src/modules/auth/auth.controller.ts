import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import {
  RequestEmailOtpDto,
  RequestPhoneOtpDto,
  ResendEmailVerificationDto,
  VerifyEmailOtpDto,
  PhoneLoginDto,
  GoogleLoginDto,
} from './dto/otp.dto';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { IpAddress } from '../../common/decorators/ip-address.decorator';
import { UserAgent } from '../../common/decorators/user-agent.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { OtpPurpose } from './entities/otp-code.entity';

@ApiTags('Authentication')
@Controller('v1/auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('register')
  @ApiOperation({ summary: 'Register a new user account' })
  @ApiResponse({
    status: 201,
    description: 'User account registered successfully',
  })
  @ApiResponse({ status: 400, description: 'Email or username already exists' })
  async register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @Public()
  @HttpCode(HttpStatus.OK)
  @Post('login')
  @ApiOperation({ summary: 'Authenticate user/creator & issue tokens' })
  @ApiResponse({ status: 200, description: 'Authentication successful' })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  @ApiResponse({
    status: 429,
    description: 'Account locked due to excessive failed attempts',
  })
  async login(
    @Body() loginDto: LoginDto,
    @IpAddress() ipAddress: string,
    @UserAgent() userAgent: string,
  ) {
    return this.authService.loginUser(loginDto, ipAddress, userAgent);
  }

  @Public()
  @HttpCode(HttpStatus.OK)
  @Post('refresh')
  @ApiOperation({ summary: 'Refresh access token using refresh token' })
  @ApiResponse({ status: 200, description: 'Tokens rotated successfully' })
  @ApiResponse({ status: 401, description: 'Invalid or revoked refresh token' })
  async refresh(
    @Body() refreshTokenDto: RefreshTokenDto,
    @IpAddress() ipAddress: string,
    @UserAgent() userAgent: string,
  ) {
    return this.authService.refreshTokens(
      refreshTokenDto.refreshToken,
      ipAddress,
      userAgent,
      false,
    );
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @HttpCode(HttpStatus.OK)
  @Post('logout')
  @ApiOperation({ summary: 'Logout user & revoke refresh token' })
  @ApiResponse({ status: 200, description: 'Logged out successfully' })
  async logout(
    @CurrentUser('id') userId: string,
    @Body() refreshTokenDto?: RefreshTokenDto,
  ) {
    return this.authService.logout(userId, refreshTokenDto?.refreshToken);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @Get('me')
  @ApiOperation({ summary: 'Get authenticated user profile' })
  @ApiResponse({
    status: 200,
    description: 'User profile retrieved successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getProfile(@CurrentUser('id') userId: string) {
    return this.authService.getProfile(userId);
  }

  @Public()
  @HttpCode(HttpStatus.OK)
  @Post('otp/email')
  @ApiOperation({
    summary: 'Request an email OTP (email verification or password reset)',
  })
  @ApiResponse({ status: 200, description: 'OTP sent' })
  @ApiResponse({ status: 429, description: 'Too many requests' })
  async requestEmailOtp(@Body() dto: RequestEmailOtpDto) {
    await this.authService.requestEmailOtp(dto.purpose, dto.email);
    return { message: 'Verification code sent.' };
  }

  @Public()
  @HttpCode(HttpStatus.OK)
  @Post('otp/phone')
  @ApiOperation({ summary: 'Request a phone OTP for phone login' })
  @ApiResponse({ status: 200, description: 'OTP sent' })
  @ApiResponse({ status: 429, description: 'Too many requests' })
  async requestPhoneOtp(@Body() dto: RequestPhoneOtpDto) {
    await this.authService.requestPhoneOtp(dto.phone);
    return { message: 'Verification code sent.' };
  }

  @Public()
  @HttpCode(HttpStatus.OK)
  @Post('email/verify')
  @ApiOperation({
    summary: 'Verify email using OTP (also used by resend endpoint)',
  })
  @ApiResponse({ status: 200, description: 'Email verified' })
  async verifyEmail(@Body() dto: VerifyEmailOtpDto) {
    await this.authService.verifyEmail(dto);
    return { message: 'Email verified successfully.' };
  }

  @Public()
  @HttpCode(HttpStatus.OK)
  @Post('email/verify/resend')
  @ApiOperation({ summary: 'Resend email verification OTP' })
  @ApiResponse({ status: 200, description: 'OTP resent' })
  @ApiResponse({ status: 429, description: 'Too many requests' })
  async resendEmailVerification(@Body() dto: ResendEmailVerificationDto) {
    await this.authService.requestEmailOtp(
      OtpPurpose.EMAIL_VERIFICATION,
      dto.email,
    );
    return { message: 'Verification code sent.' };
  }

  @Public()
  @HttpCode(HttpStatus.OK)
  @Post('phone/login')
  @ApiOperation({ summary: 'Login or auto-register with phone number + OTP' })
  @ApiResponse({ status: 200, description: 'Authenticated' })
  @ApiResponse({ status: 400, description: 'Invalid OTP' })
  async phoneLogin(
    @Body() dto: PhoneLoginDto,
    @IpAddress() ipAddress: string,
    @UserAgent() userAgent: string,
  ) {
    return this.authService.phoneLogin(dto, ipAddress, userAgent);
  }

  @Public()
  @HttpCode(HttpStatus.OK)
  @Post('google')
  @ApiOperation({ summary: 'Login or auto-register with Google id_token' })
  @ApiResponse({ status: 200, description: 'Authenticated' })
  @ApiResponse({ status: 401, description: 'Invalid Google token' })
  async googleLogin(
    @Body() dto: GoogleLoginDto,
    @IpAddress() ipAddress: string,
    @UserAgent() userAgent: string,
  ) {
    return this.authService.googleLogin(dto, ipAddress, userAgent);
  }

  @Public()
  @HttpCode(HttpStatus.OK)
  @Post('forgot-password')
  @ApiOperation({ summary: 'Request password reset OTP by email' })
  @ApiResponse({
    status: 200,
    description: 'Password reset code sent if account exists',
  })
  async forgotPassword(@Body() forgotPasswordDto: ForgotPasswordDto) {
    return this.authService.forgotPassword(forgotPasswordDto);
  }

  @Public()
  @HttpCode(HttpStatus.OK)
  @Post('reset-password')
  @ApiOperation({ summary: 'Reset password using email OTP' })
  @ApiResponse({ status: 200, description: 'Password reset successful' })
  async resetPassword(@Body() resetPasswordDto: ResetPasswordDto) {
    return this.authService.resetPassword(resetPasswordDto);
  }

  @Public()
  @HttpCode(HttpStatus.OK)
  @Post('verify-email')
  @ApiOperation({ summary: 'Verify account email address with OTP' })
  @ApiResponse({
    status: 200,
    description: 'Email address verified successfully',
  })
  async verifyEmailLegacy(@Body() verifyEmailDto: VerifyEmailDto) {
    return this.authService.verifyEmail(verifyEmailDto);
  }
}

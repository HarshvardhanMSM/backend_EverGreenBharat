import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import type { SignOptions } from 'jsonwebtoken';

import { User } from '../users/entities/user.entity';
import { Admin } from '../admin/entities/admin.entity';
import { RefreshToken } from './entities/refresh-token.entity';
import { LoginHistory } from './entities/login-history.entity';
import { OtpCode } from './entities/otp-code.entity';

import { AuthService } from './auth.service';
import { LoginHistoryService } from './services/login-history.service';
import { SessionsService } from './services/sessions.service';
import { OtpService } from './services/otp.service';
import { OtpCodesRepository } from './repositories/otp-codes.repository';
import { MockOtpProvider } from './providers/mock-otp.provider';
import { GoogleOAuthProvider } from './providers/google-oauth.provider';
import { OTP_PROVIDER_TOKEN } from './providers/otp-provider.interface';

import { AuthController } from './auth.controller';
import { AdminAuthController } from './admin-auth.controller';
import { AdminLoginHistoryController } from './controllers/admin-login-history.controller';
import { AdminSessionsController } from './controllers/admin-sessions.controller';

import { JwtStrategy } from './strategies/jwt.strategy';
import { JwtRefreshStrategy } from './strategies/jwt-refresh.strategy';
import { RbacModule } from '../rbac/rbac.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Admin, RefreshToken, LoginHistory, OtpCode]),
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret:
          configService.get<string>('JWT_SECRET') || 'super-secret-jwt-key',
        signOptions: {
          expiresIn:
            configService.get<SignOptions['expiresIn']>('JWT_EXPIRES_IN') ??
            '15m',
        },
      }),
    }),
    RbacModule,
  ],
  controllers: [
    AuthController,
    AdminAuthController,
    AdminLoginHistoryController,
    AdminSessionsController,
  ],
  providers: [
    AuthService,
    LoginHistoryService,
    SessionsService,
    OtpService,
    OtpCodesRepository,
    { provide: OTP_PROVIDER_TOKEN, useClass: MockOtpProvider },
    GoogleOAuthProvider,
    JwtStrategy,
    JwtRefreshStrategy,
  ],
  exports: [
    AuthService,
    LoginHistoryService,
    SessionsService,
    OtpService,
    OtpCodesRepository,
    JwtStrategy,
    PassportModule,
  ],
})
export class AuthModule {}

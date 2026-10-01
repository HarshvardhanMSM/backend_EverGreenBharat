import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';

interface RefreshTokenPayload {
  sub: string;
  familyId: string;
}

function extractRefreshToken(req: Request): string | null {
  const body = req?.body as Record<string, unknown> | undefined;
  const cookies = req?.cookies as Record<string, unknown> | undefined;
  const token = body?.refreshToken ?? cookies?.refreshToken;
  return typeof token === 'string' ? token : null;
}

@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(
  Strategy,
  'jwt-refresh',
) {
  constructor(private readonly configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([extractRefreshToken]),
      ignoreExpiration: false,
      secretOrKey:
        configService.get<string>('JWT_REFRESH_SECRET') ||
        'super-secret-refresh-key',
      passReqToCallback: true,
    });
  }

  validate(req: Request, payload: RefreshTokenPayload) {
    const refreshToken = extractRefreshToken(req);
    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token missing');
    }
    return {
      userId: payload.sub,
      familyId: payload.familyId,
      refreshToken,
    };
  }
}

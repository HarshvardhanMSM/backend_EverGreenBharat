import {
  Injectable,
  Logger,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface GoogleUserProfile {
  googleId: string;
  email: string;
  emailVerified: boolean;
  name: string | null;
  pictureUrl: string | null;
}

/**
 * Verifies Google OAuth id_tokens issued by the Google Sign-In SDK.
 * Production-ready: signature/audience verification against Google's
 * tokeninfo endpoint. Configure GOOGLE_CLIENT_ID to enforce audience.
 */
@Injectable()
export class GoogleOAuthProvider {
  private readonly logger = new Logger(GoogleOAuthProvider.name);

  constructor(private readonly configService: ConfigService) {}

  async verifyIdToken(idToken: string): Promise<GoogleUserProfile> {
    const clientId = this.configService.get<string>('google.clientId');
    if (!clientId) {
      throw new ServiceUnavailableException('Google OAuth is not configured');
    }

    const tokenInfoUrl =
      this.configService.get<string>('google.tokenInfoUrl') ||
      'https://oauth2.googleapis.com/tokeninfo';

    let response: Response;
    try {
      response = await fetch(
        `${tokenInfoUrl}?id_token=${encodeURIComponent(idToken)}`,
      );
    } catch (error) {
      this.logger.error(
        `Google tokeninfo request failed: ${(error as Error).message}`,
      );
      throw new ServiceUnavailableException('Unable to verify Google identity');
    }

    if (!response.ok) {
      throw new UnauthorizedException('Invalid Google identity token');
    }

    const payload = (await response.json()) as {
      iss: string;
      sub: string;
      email?: string;
      email_verified?: string;
      name?: string;
      picture?: string;
      aud?: string;
    };

    if (payload.aud && payload.aud !== clientId) {
      throw new UnauthorizedException('Google token audience mismatch');
    }

    if (!payload.email) {
      throw new UnauthorizedException('Google account has no email address');
    }

    return {
      googleId: payload.sub,
      email: payload.email,
      emailVerified: payload.email_verified === 'true',
      name: payload.name || null,
      pictureUrl: payload.picture || null,
    };
  }
}

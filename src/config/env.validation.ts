import { plainToInstance } from 'class-transformer';
import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  validateSync,
} from 'class-validator';

enum Environment {
  Development = 'development',
  Production = 'production',
  Test = 'test',
}

class EnvironmentVariables {
  @IsEnum(Environment)
  @IsOptional()
  NODE_ENV: Environment = Environment.Development;

  @IsNumber()
  @IsOptional()
  PORT: number = 3000;

  @IsString()
  @IsOptional()
  DB_HOST: string = 'localhost';

  @IsNumber()
  @IsOptional()
  DB_PORT: number = 5432;

  @IsString()
  @IsOptional()
  DB_USERNAME: string = 'postgres';

  @IsString()
  @IsOptional()
  DB_PASSWORD: string = 'postgres';

  @IsString()
  @IsOptional()
  DB_DATABASE: string = 'livestream_db';

  @IsString()
  @IsOptional()
  JWT_SECRET: string = 'super-secret-jwt-key';

  @IsString()
  @IsOptional()
  JWT_EXPIRES_IN: string = '15m';

  @IsString()
  @IsOptional()
  JWT_REFRESH_SECRET: string = 'super-secret-refresh-key';

  @IsString()
  @IsOptional()
  JWT_REFRESH_EXPIRES_IN: string = '7d';

  @IsString()
  @IsOptional()
  STRIPE_WEBHOOK_SECRET: string = '';

  @IsString()
  @IsOptional()
  RAZORPAY_WEBHOOK_SECRET: string = '';

  @IsString()
  @IsOptional()
  PAYPAL_WEBHOOK_ID: string = '';

  @IsString()
  @IsOptional()
  PAYPAL_CLIENT_ID: string = '';

  @IsString()
  @IsOptional()
  PAYPAL_CLIENT_SECRET: string = '';

  @IsString()
  @IsOptional()
  PAYPAL_AUTH_URL: string = 'https://api-m.paypal.com/v1/oauth2/token';

  @IsString()
  @IsOptional()
  PAYPAL_WEBHOOK_VERIFY_URL: string =
    'https://api-m.paypal.com/v1/notifications/verify-webhook-signature';

  @IsNumber()
  @IsOptional()
  WEBHOOK_TOLERANCE_SECONDS: number = 300;

  @IsNumber()
  @IsOptional()
  CLEARING_HOLDING_HOURS: number = 24;

  @IsNumber()
  @IsOptional()
  CHECKOUT_TTL_MINUTES: number = 60;

  @IsString()
  @IsOptional()
  OTP_MOCK_ENABLED: string = 'true';

  @IsNumber()
  @IsOptional()
  OTP_TTL_MINUTES: number = 10;

  @IsNumber()
  @IsOptional()
  OTP_MAX_ATTEMPTS: number = 5;

  @IsNumber()
  @IsOptional()
  OTP_COOLDOWN_SECONDS: number = 60;

  @IsString()
  @IsOptional()
  GOOGLE_CLIENT_ID: string = '';

  @IsString()
  @IsOptional()
  GOOGLE_CLIENT_SECRET: string = '';

  @IsString()
  @IsOptional()
  GOOGLE_TOKENINFO_URL: string = 'https://oauth2.googleapis.com/tokeninfo';

  @IsString()
  @IsOptional()
  CORS_ORIGINS: string = '';

  @IsString()
  @IsOptional()
  SUPERADMIN_EMAIL: string = 'admin@stream.com';

  @IsString()
  @IsOptional()
  SUPERADMIN_PASSWORD: string = 'Admin@123456';

  @IsString()
  @IsOptional()
  STAFF_EMAIL: string = 'staff@nursery.com';

  @IsString()
  @IsOptional()
  STAFF_PASSWORD: string = 'Staff@123456';

  @IsString()
  @IsOptional()
  STAFF_ROLE: string = 'ADMIN';

  @IsString()
  @IsOptional()
  PURGE_DEMO_DATA: string = 'false';

  @IsNumber()
  @IsOptional()
  DB_POOL_MAX: number = 20;

  @IsNumber()
  @IsOptional()
  DB_POOL_MIN: number = 2;

  @IsString()
  @IsOptional()
  DB_SSL: string = 'false';

  @IsString()
  @IsOptional()
  ENABLE_SWAGGER: string = 'true';
}

export function validateEnv(config: Record<string, unknown>) {
  const validatedConfig = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });
  const errors = validateSync(validatedConfig, {
    skipMissingProperties: false,
  });

  if (errors.length > 0) {
    throw new Error(`Environment Validation Error: ${errors.toString()}`);
  }
  return validatedConfig;
}

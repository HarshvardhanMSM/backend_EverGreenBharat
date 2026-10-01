export default () => ({
  port: parseInt(process.env.PORT || '3000', 10),
  database: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    username: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    name: process.env.DB_DATABASE || 'livestream_db',
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'super-secret-jwt-key',
    expiresIn: process.env.JWT_EXPIRES_IN || '15m',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'super-secret-refresh-key',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  },
  otp: {
    mockEnabled: process.env.OTP_MOCK_ENABLED || 'true',
    ttlMinutes: process.env.OTP_TTL_MINUTES || '10',
    maxAttempts: process.env.OTP_MAX_ATTEMPTS || '5',
    cooldownSeconds: process.env.OTP_COOLDOWN_SECONDS || '60',
  },
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID || '',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    tokenInfoUrl:
      process.env.GOOGLE_TOKENINFO_URL ||
      'https://oauth2.googleapis.com/tokeninfo',
  },
  uploads: {
    dir: process.env.UPLOADS_DIR || 'uploads',
  },
  payment: {
    stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET || '',
    razorpayWebhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET || '',
    paypalWebhookId: process.env.PAYPAL_WEBHOOK_ID || '',
    paypalClientId: process.env.PAYPAL_CLIENT_ID || '',
    paypalClientSecret: process.env.PAYPAL_CLIENT_SECRET || '',
    paypalAuthUrl:
      process.env.PAYPAL_AUTH_URL || 'https://api-m.paypal.com/v1/oauth2/token',
    paypalVerifyUrl:
      process.env.PAYPAL_WEBHOOK_VERIFY_URL ||
      'https://api-m.paypal.com/v1/notifications/verify-webhook-signature',
    webhookToleranceSeconds: parseInt(
      process.env.WEBHOOK_TOLERANCE_SECONDS || '300',
      10,
    ),
  },
  ledger: {
    clearingHoldingHours: parseInt(
      process.env.CLEARING_HOLDING_HOURS || '24',
      10,
    ),
    checkoutTtlMinutes: parseInt(process.env.CHECKOUT_TTL_MINUTES || '60', 10),
  },
  corsOrigins: process.env.CORS_ORIGINS || '',
  superAdmin: {
    email: process.env.SUPERADMIN_EMAIL || 'admin@stream.com',
    password: process.env.SUPERADMIN_PASSWORD || 'Admin@123456',
  },
  staff: {
    email: process.env.STAFF_EMAIL || 'staff@nursery.com',
    password: process.env.STAFF_PASSWORD || 'Staff@123456',
    role: process.env.STAFF_ROLE || 'ADMIN',
  },
});

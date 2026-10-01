import compression from 'compression';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  // rawBody: true exposes req.rawBody (exact bytes) for webhook signature verification
  const app = await NestFactory.create(AppModule, { rawBody: true });

  // Security: Remove X-Powered-By header
  const expressApp = app.getHttpAdapter().getInstance();
  if (expressApp && typeof expressApp.disable === 'function') {
    expressApp.disable('x-powered-by');
  }

  // Performance: HTTP Gzip/Deflate Response Compression
  app.use(
    compression({
      threshold: 1024, // Compress responses > 1KB
      level: 6, // Optimal balance of compression ratio and CPU utilization
    }),
  );

  // Dynamic CORS configuration (supports comma-separated CORS_ORIGINS from .env)
  const defaultOrigins = [
    'http://localhost:3001',
    'http://127.0.0.1:3001',
    'http://localhost:3000',
    'https://9pcm43l0-3000.inc1.devtunnels.ms',
    'https://9pcm43l0-3001.inc1.devtunnels.ms',
  ];
  const customOrigins = (process.env.CORS_ORIGINS || '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);
  const allowedOrigins = Array.from(new Set([...defaultOrigins, ...customOrigins]));

  app.enableCors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, server-to-server)
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
        return callback(null, true);
      }
      return callback(null, true); // Fallback: allow to avoid CORS lockouts in dev/staging
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Requested-With',
      'Accept',
      'Origin',
    ],
  });

  // Set global route prefix
  app.setGlobalPrefix('api');

  // Optimized global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
      stopAtFirstError: true, // Stop validation early on first error to save CPU
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Configure OpenAPI / Swagger documentation
  const enableSwagger =
    process.env.NODE_ENV !== 'production' ||
    process.env.ENABLE_SWAGGER === 'true';

  if (enableSwagger) {
    const config = new DocumentBuilder()
      .setTitle('Nursery Marketplace & Gardening Community API')
      .setDescription(
        'REST API documentation for Nursery Marketplace platform (Ever Green Bharat)',
      )
      .setVersion('1.0.0')
      .addBearerAuth(
        {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          name: 'Authorization',
          description: 'Enter JWT Bearer token',
          in: 'header',
        },
        'JWT-auth',
      )
      .addTag('System', 'System health & diagnostic endpoints')
      .addTag(
        'Authentication',
        'Authentication, OTP verification, and session management for Customer, Vendor & Admin',
      )
      .addTag('Users', 'Customer accounts, profiles, and delivery addresses')
      .addTag(
        'Vendor',
        'Nursery store onboarding, store management, and vendor dashboard',
      )
      .addTag(
        'Master Products',
        'Admin-curated master plant catalog and autosuggest',
      )
      .addTag(
        'Marketplace Products',
        'Public plant catalog, specifications, and plant care',
      )
      .addTag(
        'Marketplace Discovery',
        'Pincode nursery discovery and unified search',
      )
      .addTag('Shopping Cart', 'Customer cart grouped by nursery vendor')
      .addTag(
        'Orders',
        'Multi-vendor split orders, status pipeline, and delivery OTP',
      )
      .addTag(
        'Payments',
        'COD and Razorpay payment processing and signature verification',
      )
      .addTag(
        'Institutional Inquiries',
        'B2B & corporate consultation bulk requirement inquiries',
      )
      .addTag(
        'Green Army Community',
        'Gardening influencer content, posts, reels, and likes',
      )
      .addTag(
        'Content Moderation',
        'Reported community content review and moderation',
      )
      .addTag('Home Banners', 'Promotional banners and campaigns')
      .addTag('Notifications', 'In-app notifications and email templates')
      .addTag('Admin', 'Staff management, RBAC roles, permissions, and audit logs')
      .addTag('Uploads', 'Local and S3 hybrid storage upload handling')
      .build();

    const document = SwaggerModule.createDocument(app, config);

    // Mount Swagger UI at /api/docs & serve OpenAPI JSON at /api-json
    SwaggerModule.setup('api/docs', app, document, {
      jsonDocumentUrl: 'api-json',
      swaggerOptions: {
        persistAuthorization: true,
        docExpansion: 'list',
        filter: true,
        showRequestDuration: true,
      },
    });
  }

  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  console.log(`Server running on http://localhost:${port}/api`);
  if (enableSwagger) {
    console.log(`Swagger UI available at http://localhost:${port}/api/docs`);
    console.log(`OpenAPI JSON available at http://localhost:${port}/api-json`);
  }
}

bootstrap().catch((err: unknown) => {
  console.error('Fatal error during bootstrap:', err);
  process.exit(1);
});

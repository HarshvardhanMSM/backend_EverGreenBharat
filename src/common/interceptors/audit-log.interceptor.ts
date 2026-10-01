import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLog } from '../../modules/audit/entities/audit-log.entity';
import { randomUUID } from 'crypto';

@Injectable()
export class AuditLogInterceptor implements NestInterceptor {
  private readonly logger = new Logger(AuditLogInterceptor.name);

  constructor(
    @InjectRepository(AuditLog)
    private readonly auditLogRepository: Repository<AuditLog>,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const { method, url, body, params, user, headers } = request;

    const isMutatingMethod = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(
      method,
    );
    const isAdminRoute = url.includes('/admin');

    if (!isMutatingMethod || !isAdminRoute) {
      return next.handle();
    }

    const beforeValue = body ? this.sanitizeBody(body) : null;
    const ipAddress =
      headers['x-forwarded-for']?.toString().split(',')[0] ||
      request.socket?.remoteAddress ||
      '127.0.0.1';
    const userAgent = headers['user-agent'] || 'Unknown';
    const adminId = user?.admin?.id || user?.id || null;

    const correlationId = (
      headers['x-correlation-id'] ||
      headers['x-request-id'] ||
      randomUUID()
    ).toString();
    const requestId = (headers['x-request-id'] || randomUUID()).toString();

    // Batch 0 Fix 1: extract actual resource segment after /api/v1/admin/
    // e.g. /api/v1/admin/creators/123/suspend -> 'creators'
    //      /api/v1/admin/users -> 'users'
    const resource = this.extractResource(url);
    const resourceId = params?.id || body?.id || null;
    const action = `${method}_${resource.toUpperCase()}`;

    return next.handle().pipe(
      tap({
        next: (responseBody) => {
          this.logAudit({
            adminId,
            action,
            resource,
            resourceId,
            httpMethod: method,
            beforeValue,
            afterValue: responseBody ? this.sanitizeBody(responseBody) : null,
            ipAddress,
            userAgent,
            correlationId,
            requestId,
          }).catch((err) =>
            this.logger.error(
              `Audit logging failed: ${err.message}`,
              err.stack,
            ),
          );
        },
        error: (err) => {
          this.logAudit({
            adminId,
            action: `${action}_FAILED`,
            resource,
            resourceId,
            httpMethod: method,
            beforeValue,
            afterValue: { error: err.message },
            ipAddress,
            userAgent,
            correlationId,
            requestId,
          }).catch((logErr) =>
            this.logger.error(
              `Audit failure logging failed: ${logErr.message}`,
              logErr.stack,
            ),
          );
        },
      }),
    );
  }

  /**
   * Extracts the actual resource name from a URL.
   * Handles: /api/v1/admin/<resource>[/<id>][/<action>]
   * Also handles non-admin routes with /api/v1/<resource>
   */
  private extractResource(url: string): string {
    const cleanUrl = url.split('?')[0];
    const segments = cleanUrl.split('/').filter(Boolean);

    // Find 'admin' segment and return the segment after it
    const adminIdx = segments.indexOf('admin');
    if (adminIdx !== -1 && segments[adminIdx + 1]) {
      return segments[adminIdx + 1];
    }

    // Fallback: take the segment after 'v<N>'
    const v1Idx = segments.findIndex((s) => /^v\d+$/.test(s));
    if (v1Idx !== -1 && segments[v1Idx + 1]) {
      return segments[v1Idx + 1];
    }

    return 'admin';
  }

  // Batch 0 Fix 2: extended sensitive-key list
  private sanitizeBody(payload: any): any {
    if (!payload || typeof payload !== 'object') return payload;
    const sanitized = Array.isArray(payload) ? [...payload] : { ...payload };
    const sensitiveKeys = [
      'password',
      'token',
      'refreshToken',
      'secret',
      'streamKey',
      'streamKeyHash',
      'streamKeyEncrypted',
      'paypalEmail',
      'bankAccountLast4',
      'cardNumber',
      'cvv',
      'accountNumber',
      'routingNumber',
      'stripeSecret',
      'paypalSecret',
      'webhookSignature',
      'creditCardNumber',
      'securityCode',
      'paymentToken',
      'bankAccount',
      'iban',
      'swiftCode',
    ];
    for (const key of sensitiveKeys) {
      if (key in sanitized) {
        (sanitized as Record<string, any>)[key] = '[REDACTED]';
      }
    }
    return sanitized;
  }

  private async logAudit(auditData: Partial<AuditLog>): Promise<void> {
    const log = this.auditLogRepository.create(auditData);
    await this.auditLogRepository.save(log);
  }
}

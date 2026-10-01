import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { I18nService } from '../i18n/i18n.service';

export interface ResponseEnvelope<T> {
  success: boolean;
  statusCode: number;
  message: string;
  data: T;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  timestamp: string;
}

@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<
  T,
  ResponseEnvelope<T>
> {
  constructor(private readonly i18nService: I18nService) {}

  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<ResponseEnvelope<T>> {
    const ctx = context.switchToHttp();
    const req = ctx.getRequest();
    const response = ctx.getResponse();
    const statusCode = response.statusCode;
    const locale = req.locale || 'en';

    return next.handle().pipe(
      map((result) => {
        let message = 'Operation successful';
        let data = result;
        let pagination: any = undefined;

        if (result && typeof result === 'object') {
          if ('message' in result && typeof (result as any).message === 'string') {
            message = (result as any).message;
          }
          if ('pagination' in result) {
            pagination = (result as any).pagination;
          }
          if ('data' in result) {
            data = (result as any).data;
            // In case pagination is inside result.data
            if (!pagination && typeof data === 'object' && data !== null && 'pagination' in data) {
              pagination = (data as any).pagination;
            }
          }
        }

        // Localize standard success message
        if (message === 'Operation successful') {
          message = this.i18nService.t('common.success', locale);
        } else if (typeof message === 'string') {
          // If message is a key or matches dictionary
          const translated = this.i18nService.t(message, locale);
          if (translated !== message) {
            message = translated;
          }
        }

        const envelope: any = {
          success: true,
          statusCode,
          message,
          data,
          timestamp: new Date().toISOString(),
        };

        if (pagination !== undefined) {
          envelope.pagination = pagination;
        }

        return envelope;
      }),
    );
  }
}

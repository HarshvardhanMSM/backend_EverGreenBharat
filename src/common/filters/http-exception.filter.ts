import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { I18nService } from '../i18n/i18n.service';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  constructor(private readonly i18nService: I18nService) {}

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request & { locale?: string }>();
    const locale = request.locale || 'en';

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let errorResponse: string | object = 'Internal Server Error';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse();
      if (typeof res === 'string') {
        message = res;
        errorResponse = res;
      } else if (typeof res === 'object' && res !== null) {
        message = (res as any).message || exception.message;
        errorResponse = (res as any).error || res;
      }
    } else if (exception instanceof Error) {
      message = exception.message;
      this.logger.error(
        `Unhandled Exception: ${exception.message}`,
        exception.stack,
      );
    }

    // Localize error message if possible
    if (typeof message === 'string') {
      const translated = this.i18nService.t(message, locale);
      if (translated !== message) {
        message = translated;
      } else if (status === 404 && message.toLowerCase().includes('not found')) {
        message = this.i18nService.t('common.not_found', locale);
      } else if (status === 401) {
        message = this.i18nService.t('common.unauthorized', locale);
      } else if (status === 403) {
        message = this.i18nService.t('common.forbidden', locale);
      } else if (status === 400 && message.toLowerCase().includes('bad request')) {
        message = this.i18nService.t('common.bad_request', locale);
      } else if (status >= 500) {
        message = this.i18nService.t('common.server_error', locale);
      }
    }

    response.status(status).json({
      success: false,
      statusCode: status,
      message,
      error: errorResponse,
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }
}

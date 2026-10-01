import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { I18nService } from './i18n.service';

export interface I18nRequest extends Request {
  locale: string;
  t: (key: string, params?: Record<string, any>) => string;
}

@Injectable()
export class I18nMiddleware implements NestMiddleware {
  constructor(private readonly i18nService: I18nService) {}

  use(req: I18nRequest, res: Response, next: NextFunction) {
    // 1. Check query param: ?lang=hi or ?locale=hi
    const queryLang = (req.query?.lang as string) || (req.query?.locale as string);

    // 2. Check headers: Accept-Language or x-custom-lang
    const headerLang =
      (req.headers['accept-language'] as string) ||
      (req.headers['x-custom-lang'] as string);

    // 3. Check user preference if authenticated
    const userLang = (req as any).user?.language;

    const chosenLangCandidate = queryLang || headerLang || userLang;
    const resolvedLocale = this.i18nService.resolveLocale(chosenLangCandidate);

    req.locale = resolvedLocale;
    req.t = (key: string, params?: Record<string, any>) =>
      this.i18nService.t(key, resolvedLocale, params);

    // Also attach Content-Language header on response
    res.setHeader('Content-Language', resolvedLocale);

    next();
  }
}

import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * Decorator to easily access resolved request locale in Controller handlers:
 * e.g. @Get() getProducts(@CurrentLocale() locale: string)
 */
export const CurrentLocale = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): string => {
    const request = ctx.switchToHttp().getRequest();
    return request.locale || 'en';
  },
);

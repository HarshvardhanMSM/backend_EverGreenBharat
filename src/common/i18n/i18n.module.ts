import { Global, Module } from '@nestjs/common';
import { I18nService } from './i18n.service';
import { I18nController } from './i18n.controller';
import { I18nMiddleware } from './i18n.middleware';

@Global()
@Module({
  controllers: [I18nController],
  providers: [I18nService, I18nMiddleware],
  exports: [I18nService, I18nMiddleware],
})
export class I18nModule {}

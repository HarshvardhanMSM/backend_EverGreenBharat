import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { I18nService } from './i18n.service';

@ApiTags('Internationalization (i18n)')
@Controller({ path: 'i18n', version: '1' })
export class I18nController {
  constructor(private readonly i18nService: I18nService) {}

  @Get('languages')
  @ApiOperation({
    summary: 'Get supported languages',
    description:
      'Returns a list of all active supported languages on the platform (e.g. English, Hindi, and any newly configured language) with code and native names.',
  })
  @ApiResponse({
    status: 200,
    description: 'List of supported languages',
    schema: {
      example: [
        { code: 'en', name: 'English', nativeName: 'English' },
        { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी' },
      ],
    },
  })
  getSupportedLanguages() {
    return this.i18nService.getSupportedLanguages();
  }

  @Get('translations')
  @ApiOperation({
    summary: 'Get full translation dictionary for a language',
    description:
      'Fetches the complete UI/API translation strings for mobile and web apps to enable instant offline translation switching.',
  })
  @ApiQuery({
    name: 'lang',
    required: false,
    example: 'hi',
    description: 'Language code (e.g. en, hi). Defaults to en.',
  })
  @ApiResponse({
    status: 200,
    description: 'JSON dictionary of translations',
  })
  getTranslations(@Query('lang') lang?: string) {
    return this.i18nService.getTranslations(lang);
  }
}

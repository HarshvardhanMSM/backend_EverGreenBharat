import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

export interface LanguageInfo {
  code: string;
  name: string;
  nativeName: string;
}

const LANGUAGE_METADATA: Record<string, { name: string; nativeName: string }> = {
  en: { name: 'English', nativeName: 'English' },
  hi: { name: 'Hindi', nativeName: 'हिन्दी' },
  bn: { name: 'Bengali', nativeName: 'বাংলা' },
  mr: { name: 'Marathi', nativeName: 'मराठी' },
  ta: { name: 'Tamil', nativeName: 'தமிழ்' },
  te: { name: 'Telugu', nativeName: 'తెలుగు' },
  gu: { name: 'Gujarati', nativeName: 'ગુજરાતી' },
  kn: { name: 'Kannada', nativeName: 'ಕನ್ನಡ' },
  pa: { name: 'Punjabi', nativeName: 'ਪੰਜਾਬੀ' },
  ml: { name: 'Malayalam', nativeName: 'മലയാളം' },
};

@Injectable()
export class I18nService implements OnModuleInit {
  private readonly logger = new Logger(I18nService.name);
  private translations: Map<string, Record<string, any>> = new Map();
  private readonly defaultLanguage = 'en';

  onModuleInit() {
    this.loadTranslations();
  }

  /**
   * Automatically scans the locales folder and loads all *.json translation dictionaries.
   * Adding a new language is as simple as dropping a new <lang>.json file!
   */
  public loadTranslations() {
    try {
      const localesDir = path.resolve(__dirname, 'locales');
      if (!fs.existsSync(localesDir)) {
        this.logger.warn(`Locales directory not found at: ${localesDir}`);
        return;
      }

      const files = fs.readdirSync(localesDir);
      for (const file of files) {
        if (file.endsWith('.json')) {
          const langCode = path.basename(file, '.json').toLowerCase();
          const filePath = path.join(localesDir, file);
          const rawData = fs.readFileSync(filePath, 'utf-8');
          try {
            const parsed = JSON.parse(rawData);
            this.translations.set(langCode, parsed);
            this.logger.log(`Loaded i18n locale: [${langCode}]`);
          } catch (parseErr) {
            this.logger.error(`Failed to parse i18n JSON file: ${file}`, parseErr);
          }
        }
      }
    } catch (err) {
      this.logger.error('Error scanning/loading i18n translation files', err);
    }
  }

  /**
   * Returns list of currently available languages with native display names
   */
  public getSupportedLanguages(): LanguageInfo[] {
    const langs: LanguageInfo[] = [];
    for (const code of this.translations.keys()) {
      const meta = LANGUAGE_METADATA[code] || {
        name: code.toUpperCase(),
        nativeName: code.toUpperCase(),
      };
      langs.push({
        code,
        name: meta.name,
        nativeName: meta.nativeName,
      });
    }

    // Always ensure default language is first
    return langs.sort((a, b) => {
      if (a.code === this.defaultLanguage) return -1;
      if (b.code === this.defaultLanguage) return 1;
      return a.name.localeCompare(b.name);
    });
  }

  /**
   * Returns full translation dictionary for a requested language
   */
  public getTranslations(lang: string = this.defaultLanguage): Record<string, any> {
    const resolved = this.resolveLocale(lang);
    return this.translations.get(resolved) || this.translations.get(this.defaultLanguage) || {};
  }

  /**
   * Resolves raw input string (e.g. from Accept-Language header or ?lang query) into a supported language code
   */
  public resolveLocale(input?: string): string {
    if (!input) return this.defaultLanguage;

    // Handle header like "hi-IN,hi;q=0.9,en-US;q=0.8,en;q=0.7" or direct "hi"
    const candidates = input
      .split(',')
      .map((part) => {
        const [tag] = part.trim().split(';');
        return tag.trim().split('-')[0].toLowerCase();
      })
      .filter(Boolean);

    for (const candidate of candidates) {
      if (this.translations.has(candidate)) {
        return candidate;
      }
    }

    return this.defaultLanguage;
  }

  /**
   * Translates a message key into the target language with fallback to English,
   * with variable interpolation support: e.g. "Your OTP is {otp}" -> "Your OTP is 123456"
   */
  public t(key: string, lang?: string, params?: Record<string, any>): string {
    const targetLang = this.resolveLocale(lang);
    let message = this.getValueByKey(key, targetLang);

    // Fallback to default language if missing
    if (!message && targetLang !== this.defaultLanguage) {
      message = this.getValueByKey(key, this.defaultLanguage);
    }

    // If still not found, return key
    if (!message) {
      return key;
    }

    // Variable interpolation {param}
    if (params && typeof params === 'object') {
      return message.replace(/\{(\w+)\}/g, (match, paramKey) => {
        return params[paramKey] !== undefined ? String(params[paramKey]) : match;
      });
    }

    return message;
  }

  private getValueByKey(key: string, lang: string): string | null {
    const dict = this.translations.get(lang);
    if (!dict) return null;

    const parts = key.split('.');
    let current: any = dict;

    for (const part of parts) {
      if (current && typeof current === 'object' && part in current) {
        current = current[part];
      } else {
        return null;
      }
    }

    return typeof current === 'string' ? current : null;
  }

  /**
   * Helper to localize an entity (e.g. Product, Category) based on its `translations` JSON column
   */
  public localizeEntity<T extends Record<string, any>>(entity: T, lang: string): T {
    if (!entity) return entity;
    const targetLang = this.resolveLocale(lang);

    // If entity has translations object for targetLang, override fields
    if (
      entity.translations &&
      typeof entity.translations === 'object' &&
      entity.translations[targetLang]
    ) {
      const localizedValues = entity.translations[targetLang];
      const cloned = { ...entity };

      for (const [prop, val] of Object.entries(localizedValues)) {
        if (val !== undefined && val !== null && val !== '') {
          (cloned as any)[prop] = val;
        }
      }
      return cloned;
    }

    return entity;
  }

  /**
   * Helper to localize an array of entities
   */
  public localizeList<T extends Record<string, any>>(list: T[], lang: string): T[] {
    if (!Array.isArray(list)) return list;
    return list.map((item) => this.localizeEntity(item, lang));
  }
}

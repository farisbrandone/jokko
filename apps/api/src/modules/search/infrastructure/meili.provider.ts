import { Provider } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MeiliSearch } from 'meilisearch';
import type { AppConfig } from '../../../config/configuration';

export const MEILI = Symbol('MEILI');

export const meiliProvider: Provider = {
  provide: MEILI,
  inject: [ConfigService],
  useFactory: (config: ConfigService<AppConfig, true>) => {
    const search = config.get('search', { infer: true });
    return new MeiliSearch({ host: search.url, apiKey: search.apiKey });
  },
};

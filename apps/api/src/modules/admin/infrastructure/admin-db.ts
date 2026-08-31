import { Provider, type OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Pool } from 'pg';
import type { AppConfig } from '../../../config/configuration';

export const ADMIN_DB = Symbol('ADMIN_DB');

/**
 * Pool PostgreSQL dédié à la console plateforme, connecté avec le rôle
 * propriétaire (DATABASE_ADMIN_URL) : lecture transverse à toutes les boutiques,
 * hors Row-Level Security. Réservé aux routes /admin (PlatformAdminGuard).
 */
export class AdminDb extends Pool implements OnModuleDestroy {
  async onModuleDestroy(): Promise<void> {
    await this.end();
  }
}

export const adminDbProvider: Provider = {
  provide: ADMIN_DB,
  inject: [ConfigService],
  useFactory: (config: ConfigService<AppConfig, true>) =>
    new AdminDb({
      connectionString: config.get('database', { infer: true }).adminUrl,
      max: 4,
    }),
};

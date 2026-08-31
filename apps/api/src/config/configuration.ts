import { Env } from './env.schema';

/**
 * Vue applicative de la configuration, dérivée de l'environnement validé.
 * Injectable via ConfigService<AppConfig, true>.
 */
export interface AppConfig {
  env: Env['NODE_ENV'];
  api: {
    port: number;
    host: string;
    globalPrefix: string;
    corsOrigins: string[];
  };
  database: {
    url: string;
  };
  logLevel: Env['LOG_LEVEL'];
  tenant: {
    rootDomain: string;
    headerSecret: string;
  };
}

export const buildConfig = (env: Env): AppConfig => ({
  env: env.NODE_ENV,
  api: {
    port: env.API_PORT,
    host: env.API_HOST,
    globalPrefix: env.API_GLOBAL_PREFIX,
    corsOrigins: env.API_CORS_ORIGINS,
  },
  database: {
    url: env.DATABASE_URL,
  },
  logLevel: env.LOG_LEVEL,
  tenant: {
    rootDomain: env.SHOP_ROOT_DOMAIN,
    headerSecret: env.TENANT_HEADER_SECRET,
  },
});

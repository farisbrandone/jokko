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
  auth: {
    jwtSecret: string;
    accessTtlMin: number;
    refreshTtlDays: number;
    cookieDomain?: string;
  };
  search: {
    url: string;
    apiKey: string;
  };
  media: {
    s3Endpoint: string;
    region: string;
    accessKey: string;
    secretKey: string;
    bucket: string;
    publicBaseUrl: string;
    imgproxyUrl: string;
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
  auth: {
    jwtSecret: env.AUTH_JWT_SECRET,
    accessTtlMin: env.AUTH_ACCESS_TTL_MIN,
    refreshTtlDays: env.AUTH_REFRESH_TTL_DAYS,
    cookieDomain: env.AUTH_COOKIE_DOMAIN,
  },
  search: {
    url: env.MEILI_URL,
    apiKey: env.MEILI_MASTER_KEY,
  },
  media: {
    s3Endpoint: env.S3_ENDPOINT,
    region: env.S3_REGION,
    accessKey: env.S3_ACCESS_KEY,
    secretKey: env.S3_SECRET_KEY,
    bucket: env.S3_BUCKET,
    publicBaseUrl: env.S3_PUBLIC_URL ?? `${env.S3_ENDPOINT}/${env.S3_BUCKET}`,
    imgproxyUrl: env.IMGPROXY_URL,
  },
});

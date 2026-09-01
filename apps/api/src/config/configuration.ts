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
    adminUrl: string;
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
  otp: {
    ttlSec: number;
    maxPerHour: number;
    devCode?: string;
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
  notifications: {
    smtpUrl: string;
    from: string;
    dashboardUrl: string;
    defaultCooldownSec: number;
    termii: {
      apiKey: string;
      senderId: string;
      baseUrl: string;
    } | null;
    webPush: {
      publicKey: string;
      privateKey: string;
      subject: string;
    } | null;
  };
  messaging: {
    maxNewConversationsPerHour: number;
  };
  throttle: {
    ttlSec: number;
    limit: number;
    trustedIps: string[];
  };
  billing: {
    priceXof: number;
    trialDays: number;
    graceDays: number;
    appPublicUrl: string;
    flutterwave: {
      secretKey: string;
      webhookSecret: string;
      baseUrl: string;
    } | null;
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
    adminUrl: env.DATABASE_ADMIN_URL ?? env.DATABASE_URL,
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
  otp: {
    ttlSec: env.OTP_TTL_SEC,
    maxPerHour: env.OTP_MAX_PER_HOUR,
    devCode: env.OTP_DEV_CODE,
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
  notifications: {
    smtpUrl: env.SMTP_URL,
    from: env.SMTP_FROM,
    dashboardUrl: env.DASHBOARD_BASE_URL,
    defaultCooldownSec: env.NOTIFICATIONS_COOLDOWN_SEC,
    termii: env.TERMII_API_KEY
      ? {
          apiKey: env.TERMII_API_KEY,
          senderId: env.TERMII_SENDER_ID,
          baseUrl: env.TERMII_BASE_URL,
        }
      : null,
    webPush:
      env.VAPID_PUBLIC_KEY && env.VAPID_PRIVATE_KEY
        ? {
            publicKey: env.VAPID_PUBLIC_KEY,
            privateKey: env.VAPID_PRIVATE_KEY,
            subject: env.VAPID_SUBJECT,
          }
        : null,
  },
  messaging: {
    maxNewConversationsPerHour: env.MESSAGING_MAX_NEW_CONVERSATIONS_PER_HOUR,
  },
  throttle: {
    ttlSec: env.THROTTLE_TTL_SEC,
    limit: env.THROTTLE_LIMIT,
    trustedIps: env.THROTTLE_TRUSTED_IPS,
  },
  billing: {
    priceXof: env.BILLING_PRICE_XOF,
    trialDays: env.BILLING_TRIAL_DAYS,
    graceDays: env.BILLING_GRACE_DAYS,
    appPublicUrl: env.APP_PUBLIC_URL,
    flutterwave:
      env.FLW_SECRET_KEY && env.FLW_WEBHOOK_SECRET
        ? {
            secretKey: env.FLW_SECRET_KEY,
            webhookSecret: env.FLW_WEBHOOK_SECRET,
            baseUrl: env.FLW_BASE_URL,
          }
        : null,
  },
});

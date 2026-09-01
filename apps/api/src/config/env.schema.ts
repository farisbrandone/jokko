import { z } from 'zod';

const csv = (v: string) =>
  v
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),

  API_PORT: z.coerce.number().int().positive().default(3333),
  API_HOST: z.string().default('0.0.0.0'),
  API_GLOBAL_PREFIX: z.string().default('api'),
  API_CORS_ORIGINS: z.string().default('http://localhost:3000').transform(csv),

  DATABASE_URL: z.string().url(),
  DATABASE_ADMIN_URL: z.string().url().optional(),
  REDIS_URL: z.string().url().optional(),

  MEILI_URL: z.string().url().default('http://localhost:57700'),
  MEILI_MASTER_KEY: z.string().default('jokko_dev_meili_master_key'),

  S3_ENDPOINT: z.string().url().default('http://localhost:59000'),
  S3_REGION: z.string().default('us-east-1'),
  S3_ACCESS_KEY: z.string().default('jokko'),
  S3_SECRET_KEY: z.string().default('jokko_dev_secret'),
  S3_BUCKET: z.string().default('jokko-media'),
  S3_PUBLIC_URL: z.string().url().optional(),
  IMGPROXY_URL: z.string().url().default('http://localhost:58080'),

  SMTP_URL: z.string().default('smtp://localhost:51025'),
  SMTP_FROM: z.string().default('Jokko <no-reply@jokko.shop>'),
  DASHBOARD_BASE_URL: z.string().url().default('http://localhost:3001'),

  // Notifications WhatsApp / SMS via Termii (marché pilote SN + CI). Sans clé API,
  // les canaux WhatsApp / SMS retombent sur un adaptateur « log ».
  TERMII_API_KEY: z.string().optional(),
  TERMII_SENDER_ID: z.string().default('Jokko'),
  TERMII_BASE_URL: z.string().url().default('https://api.ng.termii.com'),
  NOTIFICATIONS_COOLDOWN_SEC: z.coerce.number().int().min(0).default(300),

  // Web Push (VAPID). Sans clés, le canal push est un no-op (adaptateur « log »).
  VAPID_PUBLIC_KEY: z.string().optional(),
  VAPID_PRIVATE_KEY: z.string().optional(),
  VAPID_SUBJECT: z.string().default('mailto:support@jokko.shop'),

  // Anti-spam : nombre max d'ouvertures de conversation par numéro et par heure.
  MESSAGING_MAX_NEW_CONVERSATIONS_PER_HOUR: z.coerce.number().int().positive().default(6),

  // Facturation (abonnement vendeur). Sans FLW_SECRET_KEY : passerelle « fake »
  // qui valide automatiquement (dev / CI).
  FLW_SECRET_KEY: z.string().optional(),
  FLW_WEBHOOK_SECRET: z.string().optional(),
  FLW_BASE_URL: z.string().url().default('https://api.flutterwave.com'),
  BILLING_PRICE_XOF: z.coerce.number().int().positive().default(5000),
  BILLING_TRIAL_DAYS: z.coerce.number().int().min(0).default(14),
  BILLING_GRACE_DAYS: z.coerce.number().int().min(0).default(3),
  APP_PUBLIC_URL: z.string().url().default('http://localhost:3001'),

  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),

  // Limitation de débit générale (par IP). Fenêtre en secondes + limite.
  // Les routes d'authentification appliquent une limite fixe plus stricte.
  THROTTLE_TTL_SEC: z.coerce.number().int().positive().default(60),
  THROTTLE_LIMIT: z.coerce.number().int().positive().default(600),
  // IP exemptées (front SSR interne, load balancer). CSV.
  THROTTLE_TRUSTED_IPS: z.string().default('').transform(csv),

  // Observabilité : traçage OTEL actif seulement si l'endpoint (http/https) est défini.
  // Tolérant à la chaîne vide (souvent injectée par l'outillage).
  OTEL_EXPORTER_OTLP_ENDPOINT: z
    .string()
    .optional()
    .refine((v) => !v || /^https?:\/\//.test(v), 'URL http(s) attendue'),
  OTEL_SERVICE_NAME: z.string().default('jokko-api'),

  SHOP_ROOT_DOMAIN: z.string().default('lvh.me'),
  TENANT_HEADER_SECRET: z.string().min(16).default('dev_tenant_header_secret_0123456789'),

  AUTH_JWT_SECRET: z.string().min(16).default('dev_auth_jwt_secret_change_me_0123456789'),
  AUTH_ACCESS_TTL_MIN: z.coerce.number().int().positive().default(30),
  AUTH_REFRESH_TTL_DAYS: z.coerce.number().int().positive().default(30),
  AUTH_COOKIE_DOMAIN: z.string().optional(),

  // Connexion par SMS (OTP). Envoi via Termii (mêmes clés que les notifications).
  OTP_TTL_SEC: z.coerce.number().int().positive().default(300),
  OTP_MAX_PER_HOUR: z.coerce.number().int().positive().default(5),
  // Code fixe pour les tests / démos (jamais en production).
  OTP_DEV_CODE: z.string().regex(/^\d{4,8}$/).optional(),
});

export type Env = z.infer<typeof envSchema>;

export function validateEnv(raw: Record<string, unknown>): Env {
  const parsed = envSchema.safeParse(raw);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `  - ${i.path.join('.') || '(racine)'}: ${i.message}`)
      .join('\n');
    throw new Error(`Configuration d'environnement invalide:\n${issues}`);
  }
  return parsed.data;
}

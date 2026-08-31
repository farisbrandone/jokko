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

  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),

  SHOP_ROOT_DOMAIN: z.string().default('lvh.me'),
  TENANT_HEADER_SECRET: z.string().min(16).default('dev_tenant_header_secret_0123456789'),

  AUTH_JWT_SECRET: z.string().min(16).default('dev_auth_jwt_secret_change_me_0123456789'),
  AUTH_ACCESS_TTL_MIN: z.coerce.number().int().positive().default(30),
  AUTH_REFRESH_TTL_DAYS: z.coerce.number().int().positive().default(30),
  AUTH_COOKIE_DOMAIN: z.string().optional(),
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

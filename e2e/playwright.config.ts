import { defineConfig, devices } from '@playwright/test';

const API_PORT = 3333;
const DASHBOARD_PORT = 3001;
const STOREFRONT_PORT = 3000;

/** Env partagé par les serveurs lancés pour les tests (local + CI). */
const shared = {
  NODE_ENV: 'production',
  DATABASE_URL:
    process.env.DATABASE_URL ??
    'postgres://jokko_app:jokko_app_dev_pwd@localhost:55432/jokko',
  DATABASE_ADMIN_URL:
    process.env.DATABASE_ADMIN_URL ?? 'postgres://jokko:jokko_dev_pwd@localhost:55432/jokko',
  MEILI_URL: process.env.MEILI_URL ?? 'http://localhost:57700',
  MEILI_MASTER_KEY: process.env.MEILI_MASTER_KEY ?? 'jokko_dev_meili_master_key',
  S3_ENDPOINT: 'http://localhost:59000',
  S3_ACCESS_KEY: 'jokko',
  S3_SECRET_KEY: 'jokko_dev_secret',
  S3_BUCKET: 'jokko-media',
  IMGPROXY_URL: 'http://localhost:58080',
  AUTH_JWT_SECRET: 'e2e_jwt_secret_0123456789abcdef',
  TENANT_HEADER_SECRET: 'e2e_tenant_secret_0123456789abcd',
  SMTP_URL: 'json',
  THROTTLE_DISABLED: '1',
  OTP_DEV_CODE: '000000',
  SHOP_ROOT_DOMAIN: 'lvh.me',
  DASHBOARD_BASE_URL: `http://localhost:${DASHBOARD_PORT}`,
  APP_PUBLIC_URL: `http://localhost:${DASHBOARD_PORT}`,
} as Record<string, string>;

const nextEnv = {
  ...shared,
  JOKKO_API_URL: `http://localhost:${API_PORT}/api`,
  NEXT_PUBLIC_SITE_URL: `http://localhost:${STOREFRONT_PORT}`,
  NEXT_TELEMETRY_DISABLED: '1',
};

export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  timeout: 45_000,
  expect: { timeout: 10_000 },
  reporter: process.env.CI ? [['github'], ['list']] : 'list',
  use: {
    baseURL: `http://localhost:${DASHBOARD_PORT}`,
    trace: 'on-first-retry',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: [
    {
      command: 'node apps/api/dist/main.js',
      cwd: '..',
      port: API_PORT,
      reuseExistingServer: !process.env.CI,
      timeout: 60_000,
      env: { ...shared, API_PORT: String(API_PORT), API_CORS_ORIGINS: nextEnv.NEXT_PUBLIC_SITE_URL },
    },
    {
      command: `pnpm --filter @jokko/dashboard exec next start --port ${DASHBOARD_PORT}`,
      cwd: '..',
      port: DASHBOARD_PORT,
      reuseExistingServer: !process.env.CI,
      timeout: 60_000,
      env: nextEnv,
    },
    {
      command: `pnpm --filter @jokko/storefront exec next start --port ${STOREFRONT_PORT}`,
      cwd: '..',
      port: STOREFRONT_PORT,
      reuseExistingServer: !process.env.CI,
      timeout: 60_000,
      env: { ...nextEnv, DEFAULT_SHOP_SLUG: '' },
    },
  ],
});

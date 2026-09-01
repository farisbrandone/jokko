import type { Server } from 'node:http';
import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import { Client } from 'pg';
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { GenericContainer, Wait, type StartedTestContainer } from 'testcontainers';
import { Test } from '@nestjs/testing';
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import fastifyCookie from '@fastify/cookie';

const APP_PWD = 'app_pwd';
// Vitest lance ce paquet avec cwd = apps/api (racine de vitest.int.config.ts).
const API_ROOT = process.cwd();
// `dist/` est du CJS compilé : on le charge via le vrai require de Node,
// hors du pipeline de transformation de Vitest.
const requireDist = createRequire(join(API_ROOT, 'noop.js'));

export interface Harness {
  app: NestFastifyApplication;
  server: Server;
  /** Déclenche immédiatement le relais d'outbox (sinon il tourne toutes les 2 s). */
  drainOutbox: () => Promise<void>;
  /** Déclenche le cron de facturation (suspension des abonnements échus). */
  runBillingEnforcer: () => Promise<void>;
  /** Requête SQL brute (rôle propriétaire, hors RLS) — assertions de test. */
  query: <T = Record<string, unknown>>(text: string, params?: unknown[]) => Promise<T[]>;
  stop: () => Promise<void>;
}

async function setupRole(adminUrl: string): Promise<void> {
  const c = new Client({ connectionString: adminUrl });
  await c.connect();
  try {
    await c.query(`create extension if not exists "uuid-ossp"`);
    await c.query(`create extension if not exists pgcrypto`);
    await c.query(`create extension if not exists citext`);
    await c.query(
      `do $$ begin
         if not exists (select 1 from pg_roles where rolname = 'jokko_app') then
           create role jokko_app login password '${APP_PWD}' nosuperuser nobypassrls;
         end if;
       end $$;`,
    );
    await c.query(`grant usage on schema public to jokko_app`);
    await c.query(
      `alter default privileges for role ${new URL(adminUrl).username} in schema public
         grant select, insert, update, delete on tables to jokko_app`,
    );
    await c.query(
      `alter default privileges for role ${new URL(adminUrl).username} in schema public
         grant usage, select on sequences to jokko_app`,
    );
  } finally {
    await c.end();
  }
}

export async function startHarness(): Promise<Harness> {
  try {
    return await startHarnessInner();
  } catch (e) {
    console.error('HARNESS FAILURE:', e);
    throw e;
  }
}

async function startHarnessInner(): Promise<Harness> {
  const appModulePath = join(API_ROOT, 'dist/app.module.js');
  if (!existsSync(appModulePath)) {
    throw new Error(
      `dist/ introuvable (${appModulePath}). Lance « pnpm --filter @jokko/api build » avant les tests d'intégration.`,
    );
  }

  const pg: StartedPostgreSqlContainer = await new PostgreSqlContainer('postgres:16-alpine')
    .withDatabase('jokko')
    .withUsername('jokko')
    .withPassword('jokko')
    .start();

  const meili: StartedTestContainer = await new GenericContainer('getmeili/meilisearch:v1.12')
    .withExposedPorts(7700)
    .withEnvironment({ MEILI_MASTER_KEY: 'testkey', MEILI_NO_ANALYTICS: 'true' })
    .withWaitStrategy(Wait.forHttp('/health', 7700).forStatusCode(200))
    .start();

  const adminUrl = pg.getConnectionUri();
  const appUrl = adminUrl.replace(/\/\/jokko:jokko@/, `//jokko_app:${APP_PWD}@`);
  await setupRole(adminUrl);

  Object.assign(process.env, {
    NODE_ENV: 'test',
    LOG_LEVEL: 'fatal',
    DATABASE_URL: appUrl,
    DATABASE_ADMIN_URL: adminUrl,
    MEILI_URL: `http://${meili.getHost()}:${meili.getMappedPort(7700)}`,
    MEILI_MASTER_KEY: 'testkey',
    AUTH_JWT_SECRET: 'test_jwt_secret_0123456789abcdef',
    TENANT_HEADER_SECRET: 'test_tenant_secret_0123456789abcd',
    SMTP_URL: 'json',
    DASHBOARD_BASE_URL: 'http://localhost:3001',
    // Paire VAPID de test (générée hors-ligne) — active le canal Web Push.
    VAPID_PUBLIC_KEY:
      'BNZDaBvdGo97Dn46QZttn-7fuzFth7TRSl0aZSlMmcUHeyWHtpf2fUlFWJags_lZI7j6Lsl0RpN6_w2s8Xvb_ck',
    VAPID_PRIVATE_KEY: 'P8caKqQx3CzHXVHBM5LsPquvuESXncieQmHpa5rd130',
    VAPID_SUBJECT: 'mailto:test@jokko.shop',
    SHOP_ROOT_DOMAIN: 'test.local',
    S3_ENDPOINT: 'http://localhost:59000',
    S3_ACCESS_KEY: 'test',
    S3_SECRET_KEY: 'test',
    S3_BUCKET: 'jokko-media',
    IMGPROXY_URL: 'http://localhost:58080',
  });

  // Migrations : CLI compilée, rôle propriétaire (DATABASE_ADMIN_URL).
  // On purge `VITEST*` de l'env du sous-process : MikroORM détecte `process.env.VITEST`
  // comme un contexte ts-node et bascule alors sur le glob `*.entity.ts` (0 entité en dist).
  const childEnv: NodeJS.ProcessEnv = { ...process.env, SKIP_DOTENV: '1', DATABASE_ADMIN_URL: adminUrl };
  for (const k of Object.keys(childEnv)) {
    if (k === 'VITEST' || k.startsWith('VITEST_')) delete childEnv[k];
  }
  execFileSync('node', ['dist/cli/migrate.js'], { cwd: API_ROOT, stdio: 'inherit', env: childEnv });

  const { AppModule } = requireDist(appModulePath);
  const { OutboxRelay } = requireDist(
    join(API_ROOT, 'dist/modules/catalog/infrastructure/outbox/outbox.relay.js'),
  );
  const { BillingEnforcer } = requireDist(
    join(API_ROOT, 'dist/modules/billing/application/billing.enforcer.js'),
  );
  const { MeiliSearch } = requireDist('meilisearch');
  const meiliClient = new MeiliSearch({
    host: process.env.MEILI_URL as string,
    apiKey: process.env.MEILI_MASTER_KEY,
  });

  // Meilisearch indexe de façon asynchrone (file de tâches). Après avoir rejoué
  // l'outbox, on attend que la file soit vide pour que les tests soient déterministes.
  const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
  const waitForMeili = async (): Promise<void> => {
    const deadline = Date.now() + 30_000;
    while (Date.now() < deadline) {
      try {
        const { results } = await meiliClient.getTasks({
          statuses: ['enqueued', 'processing'],
          limit: 1,
        });
        if (results.length === 0) return;
      } catch {
        /* Meili momentanément indisponible : on réessaie */
      }
      await sleep(100);
    }
    throw new Error('Meilisearch : la file de tâches ne se vide pas');
  };

  const sqlClient = new Client({ connectionString: adminUrl });
  await sqlClient.connect();

  const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
  const app = moduleRef.createNestApplication<NestFastifyApplication>(new FastifyAdapter());
  app.useLogger(false);
  await app.register(fastifyCookie);
  app.setGlobalPrefix('api', { exclude: ['healthz', 'readyz'] });
  await app.init();
  await app.getHttpAdapter().getInstance().ready();

  return {
    app,
    server: app.getHttpServer() as Server,
    drainOutbox: async () => {
      await (app.get(OutboxRelay) as { drain: () => Promise<void> }).drain();
      await waitForMeili();
    },
    runBillingEnforcer: async () => {
      await (app.get(BillingEnforcer) as { enforce: () => Promise<void> }).enforce();
    },
    query: async <T = Record<string, unknown>>(text: string, params?: unknown[]) =>
      (await sqlClient.query(text, params)).rows as T[],
    stop: async () => {
      await app.close();
      await meili.stop();
      await sqlClient.end();
      await pg.stop();
    },
  };
}

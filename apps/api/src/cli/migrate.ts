import 'reflect-metadata';
import { existsSync } from 'node:fs';
import { MikroORM } from '@mikro-orm/postgresql';

function loadEnv(): void {
  if (process.env.SKIP_DOTENV === '1') return;
  for (const candidate of ['.env', '../../.env']) {
    try {
      if (existsSync(candidate)) process.loadEnvFile(candidate);
    } catch {
      /* ignore */
    }
  }
}

async function main(): Promise<void> {
  loadEnv();
  // Les migrations tournent avec le rôle propriétaire (DATABASE_ADMIN_URL),
  // pas le rôle applicatif restreint.
  const clientUrl = process.env.DATABASE_ADMIN_URL ?? process.env.DATABASE_URL;
  if (!clientUrl) {
    throw new Error('DATABASE_ADMIN_URL ou DATABASE_URL est requis (voir .env)');
  }

  const { buildMikroOrmConfig } = await import('../config/mikro-orm.config');
  const orm = await MikroORM.init(
    buildMikroOrmConfig({ clientUrl, debug: process.env.MIKRO_ORM_DEBUG === 'true' }),
  );

  try {
    const migrator = orm.getMigrator();
    const pending = await migrator.getPendingMigrations();
    if (pending.length === 0) {
      console.log('✓ Base à jour, aucune migration en attente.');
      return;
    }
    const executed = await migrator.up();
    console.log(`✓ ${executed.length} migration(s) appliquée(s): ${executed.map((m) => m.name).join(', ')}`);
  } finally {
    await orm.close(true);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

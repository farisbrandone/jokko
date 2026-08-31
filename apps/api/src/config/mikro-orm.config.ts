import { join } from 'node:path';
import { defineConfig } from '@mikro-orm/postgresql';
import { Migrator } from '@mikro-orm/migrations';

export interface MikroOrmFactoryOptions {
  clientUrl: string;
  debug?: boolean;
}

export function buildMikroOrmConfig(opts: MikroOrmFactoryOptions) {
  // `__dirname` = <root>/config, où <root> vaut `dist` (compilé) ou `src` (tsx/ts-node).
  // Globs absolus → indépendants du cwd (nest lancé depuis la racine du monorepo).
  const root = join(__dirname, '..');

  return defineConfig({
    clientUrl: opts.clientUrl,
    entities: [`${root}/**/*.entity.js`],
    entitiesTs: [`${root}/**/*.entity.ts`],
    migrations: {
      path: join(root, 'migrations'),
      pathTs: join(root, 'migrations'),
      glob: '!(*.d).{js,ts}',
      transactional: true,
      allOrNothing: true,
    },
    extensions: [Migrator],
    forceUtcTimezone: true,
    debug: opts.debug ?? false,
    pool: { min: 2, max: 10 },
  });
}

/** Export par défaut consommé par `@mikro-orm/cli` (auto-charge `.env`).
 *  Utilise le rôle propriétaire : la CLI sert surtout aux migrations. */
export default buildMikroOrmConfig({
  clientUrl:
    process.env.DATABASE_ADMIN_URL ??
    process.env.DATABASE_URL ??
    'postgres://jokko:jokko_dev_pwd@localhost:55432/jokko',
  debug: process.env.MIKRO_ORM_DEBUG === 'true',
});

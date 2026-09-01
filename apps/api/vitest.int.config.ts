import { defineConfig } from 'vitest/config';

// Le harness démarre l'app depuis `dist/` (CJS compilé par `nest build`, avec
// les métadonnées de décorateur émises par tsc). On ne transforme donc ici que
// les fichiers de test eux-mêmes ; aucun plugin SWC nécessaire.
export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['test/**/*.int.spec.ts'],
    hookTimeout: 240_000,
    testTimeout: 30_000,
    fileParallelism: false,
    pool: 'forks',
    server: {
      deps: {
        external: [
          'testcontainers',
          '@testcontainers/postgresql',
          'dockerode',
          'ssh2',
          'cpu-features',
          'pg',
        ],
      },
    },
  },
});

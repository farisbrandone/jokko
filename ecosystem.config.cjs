// Déploiement natif (sans Docker) des 4 apps via PM2.
//   pm2 start ecosystem.config.cjs
//   pm2 save && pm2 startup   (persistance au redémarrage du serveur)
//
// L'API lit son .env via NestJS ConfigModule (envFilePath: ['.env', '../../.env'])
// → le .env à la racine du repo suffit (cwd = apps/api → ../../.env = racine).
// Les 3 apps Next lisent leur .env propre (apps/<app>/.env), COPIÉ dans la sortie
// standalone AU MOMENT DU BUILD : le renseigner avant `pnpm build`, pas après.
module.exports = {
  apps: [
    {
      name: 'jokko-api',
      cwd: './apps/api',
      script: 'dist/main.js',
      exec_mode: 'fork',
      instances: 1,
      max_memory_restart: '450M',
      env: { NODE_ENV: 'production' },
    },
    {
      name: 'jokko-storefront',
      script: './apps/storefront/.next/standalone/apps/storefront/server.js',
      exec_mode: 'fork',
      instances: 1,
      max_memory_restart: '350M',
      env: { NODE_ENV: 'production', PORT: '3000', HOSTNAME: '127.0.0.1' },
    },
    {
      name: 'jokko-dashboard',
      script: './apps/dashboard/.next/standalone/apps/dashboard/server.js',
      exec_mode: 'fork',
      instances: 1,
      max_memory_restart: '350M',
      env: { NODE_ENV: 'production', PORT: '3001', HOSTNAME: '127.0.0.1' },
    },
    {
      name: 'jokko-admin',
      script: './apps/admin/.next/standalone/apps/admin/server.js',
      exec_mode: 'fork',
      instances: 1,
      max_memory_restart: '350M',
      env: { NODE_ENV: 'production', PORT: '3002', HOSTNAME: '127.0.0.1' },
    },
  ],
};

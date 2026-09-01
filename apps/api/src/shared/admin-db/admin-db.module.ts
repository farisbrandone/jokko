import { Module } from '@nestjs/common';
import { ADMIN_DB, adminDbProvider } from './admin-db';

/**
 * Pool PostgreSQL connecté avec le rôle propriétaire (hors Row-Level Security).
 * Réservé aux usages transverses légitimes : console plateforme, purge RGPD.
 */
@Module({
  providers: [adminDbProvider],
  exports: [ADMIN_DB],
})
export class AdminDbModule {}

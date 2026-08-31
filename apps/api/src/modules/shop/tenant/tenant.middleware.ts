import { Injectable, type NestMiddleware } from '@nestjs/common';
import { TenantContext } from '../../../shared/tenant/tenant-context';
import { TenantResolver, type ResolvableRequest } from './tenant-resolver';

/**
 * Résout la boutique et ouvre le AsyncLocalStorage de TenantContext pour toute
 * la requête (guards, pipes, handler, repositories inclus). Aucune boutique
 * résolue : on laisse passer, les routes qui l'exigent répondront 400 via
 * TenantGuard.
 */
@Injectable()
export class TenantMiddleware implements NestMiddleware {
  constructor(
    private readonly resolver: TenantResolver,
    private readonly tenant: TenantContext,
  ) {}

  async use(req: ResolvableRequest, _res: unknown, next: () => void): Promise<void> {
    const shopId = await this.resolver.resolve(req);
    if (shopId) {
      this.tenant.run(shopId, next);
    } else {
      next();
    }
  }
}

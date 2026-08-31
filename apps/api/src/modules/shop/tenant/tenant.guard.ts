import {
  BadRequestException,
  CanActivate,
  Injectable,
} from '@nestjs/common';
import { TenantContext } from '../../../shared/tenant/tenant-context';

/** Exige qu'une boutique ait été résolue par TenantMiddleware. */
@Injectable()
export class TenantGuard implements CanActivate {
  constructor(private readonly tenant: TenantContext) {}

  canActivate(): boolean {
    if (!this.tenant.hasShop()) {
      throw new BadRequestException(
        'Boutique non résolue (sous-domaine, domaine personnalisé, en-tête tenant ou /shops/:id requis)',
      );
    }
    return true;
  }
}

import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { TenantContext } from '../../../shared/tenant/tenant-context';
import {
  MEMBERSHIP_REPOSITORY,
  type MembershipRepository,
} from '../domain/ports';
import { abilityForRole } from '../authz/ability.factory';
import {
  CHECK_POLICIES_KEY,
  type PolicyHandler,
} from '../authz/check-policies.decorator';
import type { AuthenticatedUser } from './auth.guard';

/**
 * À utiliser APRÈS AuthGuard et TenantGuard. Charge l'appartenance de
 * l'utilisateur à la boutique courante, en dérive une ability CASL et vérifie
 * les @CheckPolicies de la route. Expose `req.membership`.
 */
@Injectable()
export class PoliciesGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly tenant: TenantContext,
    @Inject(MEMBERSHIP_REPOSITORY) private readonly memberships: MembershipRepository,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const handlers =
      this.reflector.getAllAndOverride<PolicyHandler[]>(CHECK_POLICIES_KEY, [
        context.getHandler(),
        context.getClass(),
      ]) ?? [];

    const req = context.switchToHttp().getRequest<{
      user?: AuthenticatedUser;
      membership?: unknown;
    }>();
    if (!req.user) throw new UnauthorizedException('Authentification requise');

    const shopId = this.tenant.getShopId();
    const membership = await this.memberships.find(req.user.id, shopId);
    if (!membership) {
      throw new ForbiddenException("Vous n'êtes pas membre de cette boutique");
    }
    req.membership = membership;

    const ability = abilityForRole(membership.role);
    if (!handlers.every((h) => h(ability))) {
      throw new ForbiddenException('Action non autorisée pour votre rôle');
    }
    return true;
  }
}

import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { USER_REPOSITORY, type UserRepository } from '../domain/ports';
import type { AuthenticatedUser } from './auth.guard';

/** À utiliser APRÈS AuthGuard. Réserve la route aux administrateurs de la plateforme. */
@Injectable()
export class PlatformAdminGuard implements CanActivate {
  constructor(@Inject(USER_REPOSITORY) private readonly users: UserRepository) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<{ user?: AuthenticatedUser }>();
    if (!req.user) throw new UnauthorizedException('Authentification requise');
    const user = await this.users.findById(req.user.id);
    if (!user?.isPlatformAdmin) {
      throw new ForbiddenException('Accès réservé aux administrateurs de la plateforme');
    }
    return true;
  }
}

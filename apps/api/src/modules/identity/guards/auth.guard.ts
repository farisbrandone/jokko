import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { TokenService } from '../infrastructure/security/token.service';

export interface AuthenticatedUser {
  id: string;
  email: string;
}

interface RequestWithAuth {
  headers: Record<string, string | string[] | undefined>;
  cookies?: Record<string, string | undefined>;
  user?: AuthenticatedUser;
}

export const ACCESS_COOKIE = 'jk_access';
export const REFRESH_COOKIE = 'jk_refresh';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly tokens: TokenService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<RequestWithAuth>();
    const token = this.extract(req);
    if (!token) throw new UnauthorizedException('Authentification requise');
    try {
      const claims = await this.tokens.verifyAccess(token);
      req.user = { id: claims.sub, email: claims.email };
      return true;
    } catch {
      throw new UnauthorizedException('Jeton invalide ou expiré');
    }
  }

  private extract(req: RequestWithAuth): string | null {
    const header = req.headers.authorization;
    const value = Array.isArray(header) ? header[0] : header;
    if (value?.startsWith('Bearer ')) return value.slice(7);
    return req.cookies?.[ACCESS_COOKIE] ?? null;
  }
}

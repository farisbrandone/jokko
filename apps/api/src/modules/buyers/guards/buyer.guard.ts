import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { TokenService } from '../../identity/infrastructure/security/token.service';

export interface AuthenticatedBuyer {
  id: string;
  phone: string;
}

interface RequestWithBuyer {
  headers: Record<string, string | string[] | undefined>;
  buyer?: AuthenticatedBuyer;
}

@Injectable()
export class BuyerGuard implements CanActivate {
  constructor(private readonly tokens: TokenService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<RequestWithBuyer>();
    const header = req.headers.authorization;
    const value = Array.isArray(header) ? header[0] : header;
    const token = value?.startsWith('Bearer ') ? value.slice(7) : null;
    if (!token) throw new UnauthorizedException('Authentification acheteur requise');
    try {
      const claims = await this.tokens.verifyBuyer(token);
      req.buyer = { id: claims.buyerId, phone: claims.phone };
      return true;
    } catch {
      throw new UnauthorizedException('Session acheteur invalide ou expirée');
    }
  }
}

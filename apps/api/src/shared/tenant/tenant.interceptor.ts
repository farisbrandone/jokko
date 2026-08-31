import {
  BadRequestException,
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, type Subscription } from 'rxjs';
import { TenantContext } from './tenant-context';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Ouvre le contexte tenant pour toute la durée de la requête. La source du
 * `shopId` est, pour l'instant, le paramètre de route `:shopId` (ou l'en-tête
 * `x-shop-id`). L'incrément « Tenant & Auth » y branchera la résolution par
 * sous-domaine / domaine personnalisé / en-tête signé.
 *
 * S'exécute avant les pipes : la suite du pipeline (pipes, handler, repos) tourne
 * dans le `AsyncLocalStorage` de TenantContext.
 */
@Injectable()
export class TenantInterceptor implements NestInterceptor {
  constructor(private readonly tenant: TenantContext) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest<{
      params?: Record<string, string>;
      headers: Record<string, string | string[] | undefined>;
    }>();

    const header = req.headers['x-shop-id'];
    const fromHeader = Array.isArray(header) ? header[0] : header;
    const shopId = req.params?.shopId ?? fromHeader;

    if (!shopId || !UUID_RE.test(shopId)) {
      throw new BadRequestException('Identifiant de boutique manquant ou invalide');
    }

    return new Observable((subscriber) => {
      let sub: Subscription | undefined;
      this.tenant.run(shopId, () => {
        sub = next.handle().subscribe({
          next: (v) => subscriber.next(v),
          error: (e) => subscriber.error(e),
          complete: () => subscriber.complete(),
        });
      });
      return () => sub?.unsubscribe();
    });
  }
}

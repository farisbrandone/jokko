import { createHmac, timingSafeEqual } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { AppConfig } from '../../../config/configuration';
import {
  SHOP_REPOSITORY,
  type ShopRepository,
} from '../domain/ports/shop.repository';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const PATH_SHOP_RE = /\/shops\/([0-9a-f-]{36})(?:\/|$)/i;

export interface ResolvableRequest {
  headers: Record<string, string | string[] | undefined>;
  url?: string;
  /** @fastify/middie conserve l'URL complète ici même quand `url` est réécrit. */
  originalUrl?: string;
}

/**
 * Détermine la boutique d'une requête, dans l'ordre :
 *  1. en-tête signé `x-jokko-tenant: <shopId>.<hmac>` (frontend edge → API)
 *  2. sous-domaine `<slug>.<SHOP_ROOT_DOMAIN>`
 *  3. domaine personnalisé (Host complet)
 *  4. repli : `/shops/<uuid>/…` dans le chemin (clients API directs, tests)
 */
@Injectable()
export class TenantResolver {
  private readonly rootDomain: string;
  private readonly headerSecret: string;

  constructor(
    config: ConfigService<AppConfig, true>,
    @Inject(SHOP_REPOSITORY) private readonly shops: ShopRepository,
  ) {
    const tenant = config.get('tenant', { infer: true });
    this.rootDomain = tenant.rootDomain;
    this.headerSecret = tenant.headerSecret;
  }

  async resolve(req: ResolvableRequest): Promise<string | null> {
    return (
      this.fromSignedHeader(req) ??
      (await this.fromHost(req)) ??
      this.fromPath(req)
    );
  }

  signTenantHeader(shopId: string): string {
    const sig = createHmac('sha256', this.headerSecret).update(shopId).digest('hex');
    return `${shopId}.${sig}`;
  }

  private header(req: ResolvableRequest, name: string): string | undefined {
    const v = req.headers[name];
    return Array.isArray(v) ? v[0] : v;
  }

  private fromSignedHeader(req: ResolvableRequest): string | null {
    const raw = this.header(req, 'x-jokko-tenant');
    if (!raw) return null;
    const dot = raw.lastIndexOf('.');
    if (dot < 0) return null;
    const shopId = raw.slice(0, dot);
    const sig = raw.slice(dot + 1);
    if (!UUID_RE.test(shopId)) return null;
    const expected = createHmac('sha256', this.headerSecret).update(shopId).digest('hex');
    const a = Buffer.from(sig, 'hex');
    const b = Buffer.from(expected, 'hex');
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
    return shopId;
  }

  private async fromHost(req: ResolvableRequest): Promise<string | null> {
    const host = (this.header(req, 'host') ?? '').split(':')[0].toLowerCase();
    if (!host) return null;

    if (host === this.rootDomain || host === `www.${this.rootDomain}`) return null;

    if (host.endsWith(`.${this.rootDomain}`)) {
      const slug = host.slice(0, -1 * (this.rootDomain.length + 1));
      if (!slug || slug.includes('.')) return null;
      const shop = await this.shops.findBySlug(slug);
      return shop?.toSnapshot().id ?? null;
    }

    const shop = await this.shops.findByCustomDomain(host);
    return shop?.toSnapshot().id ?? null;
  }

  private fromPath(req: ResolvableRequest): string | null {
    const path = req.originalUrl ?? req.url ?? '';
    const m = path.match(PATH_SHOP_RE);
    return m && UUID_RE.test(m[1]) ? m[1] : null;
  }
}

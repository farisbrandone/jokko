import { AsyncLocalStorage } from 'node:async_hooks';
import { Injectable } from '@nestjs/common';

interface TenantStore {
  shopId: string;
}

/**
 * Porte l'identité de la boutique courante pour toute la durée d'une requête,
 * via AsyncLocalStorage. Alimenté par TenantMiddleware ; lu par les repositories
 * qui posent `app.current_shop_id` en base (Row-Level Security).
 */
@Injectable()
export class TenantContext {
  private readonly als = new AsyncLocalStorage<TenantStore>();

  run<T>(shopId: string, fn: () => T): T {
    return this.als.run({ shopId }, fn);
  }

  getShopId(): string {
    const store = this.als.getStore();
    if (!store) {
      throw new Error('TenantContext: aucune boutique dans le contexte de la requête');
    }
    return store.shopId;
  }

  hasShop(): boolean {
    return this.als.getStore() !== undefined;
  }
}

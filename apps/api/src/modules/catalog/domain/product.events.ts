import { BaseDomainEvent } from '@jokko/domain-kernel';
import type { ProductSnapshot } from './product.aggregate';

/** Événements d'intégration : ils portent l'instantané complet du produit,
 *  consommé tel quel par l'indexeur de recherche via l'Outbox. */
export class ProductCreated extends BaseDomainEvent {
  readonly name = 'catalog.product.created';

  constructor(shopId: string, product: ProductSnapshot) {
    super(product.id, shopId, { product }, [`shop:${shopId}`, `shop:${shopId}:catalog`]);
  }
}

export class ProductPublished extends BaseDomainEvent {
  readonly name = 'catalog.product.published';

  constructor(shopId: string, product: ProductSnapshot) {
    super(product.id, shopId, { product }, [
      `shop:${shopId}`,
      `shop:${shopId}:catalog`,
      `product:${product.id}`,
    ]);
  }
}

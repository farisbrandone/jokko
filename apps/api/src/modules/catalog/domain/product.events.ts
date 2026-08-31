import { BaseDomainEvent } from '@jokko/domain-kernel';
import type { ProductSnapshot } from './product.aggregate';

/** Événements d'intégration : ils portent l'instantané complet du produit,
 *  consommé tel quel par l'indexeur de recherche via l'Outbox. */
const tags = (shopId: string, productId: string) => [
  `shop:${shopId}`,
  `shop:${shopId}:catalog`,
  `product:${productId}`,
];

export class ProductCreated extends BaseDomainEvent {
  readonly name = 'catalog.product.created';
  constructor(shopId: string, product: ProductSnapshot) {
    super(product.id, shopId, { product }, tags(shopId, product.id));
  }
}

export class ProductUpdated extends BaseDomainEvent {
  readonly name = 'catalog.product.updated';
  constructor(shopId: string, product: ProductSnapshot) {
    super(product.id, shopId, { product }, tags(shopId, product.id));
  }
}

export class ProductPublished extends BaseDomainEvent {
  readonly name = 'catalog.product.published';
  constructor(shopId: string, product: ProductSnapshot) {
    super(product.id, shopId, { product }, tags(shopId, product.id));
  }
}

export class ProductUnpublished extends BaseDomainEvent {
  readonly name = 'catalog.product.unpublished';
  constructor(shopId: string, product: ProductSnapshot) {
    super(product.id, shopId, { product }, tags(shopId, product.id));
  }
}

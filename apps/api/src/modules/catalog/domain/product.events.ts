import { BaseDomainEvent } from '@jokko/domain-kernel';

export class ProductCreated extends BaseDomainEvent {
  readonly name = 'catalog.product.created';

  constructor(shopId: string, productId: string, slug: string) {
    super(productId, shopId, { productId, slug }, [`shop:${shopId}`, `shop:${shopId}:catalog`]);
  }
}

export class ProductPublished extends BaseDomainEvent {
  readonly name = 'catalog.product.published';

  constructor(shopId: string, productId: string, slug: string) {
    super(productId, shopId, { productId, slug }, [
      `shop:${shopId}`,
      `shop:${shopId}:catalog`,
      `product:${productId}`,
    ]);
  }
}

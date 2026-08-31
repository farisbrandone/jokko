import { BaseDomainEvent } from '@jokko/domain-kernel';

export class ShopCreated extends BaseDomainEvent {
  readonly name = 'shop.created';

  constructor(shopId: string, slug: string, ownerUserId: string) {
    super(shopId, shopId, { slug, ownerUserId }, [`shop:${shopId}`]);
  }
}

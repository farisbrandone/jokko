import { Inject, Injectable } from '@nestjs/common';
import type { ShopSnapshot } from '../../domain/shop.aggregate';
import {
  SHOP_REPOSITORY,
  type ShopRepository,
} from '../../domain/ports/shop.repository';

@Injectable()
export class GetShopUseCase {
  constructor(@Inject(SHOP_REPOSITORY) private readonly shops: ShopRepository) {}

  async bySlug(slug: string): Promise<ShopSnapshot | null> {
    const shop = await this.shops.findBySlug(slug);
    return shop ? shop.toSnapshot() : null;
  }
}

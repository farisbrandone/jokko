import { Inject, Injectable } from '@nestjs/common';
import { Result } from '@jokko/domain-kernel';
import type { UpdateShopInput } from '@jokko/contracts';
import type { ShopSnapshot } from '../../domain/shop.aggregate';
import { SHOP_REPOSITORY, type ShopRepository } from '../../domain/ports/shop.repository';

@Injectable()
export class UpdateShopUseCase {
  constructor(@Inject(SHOP_REPOSITORY) private readonly shops: ShopRepository) {}

  async execute(shopId: string, patch: UpdateShopInput): Promise<Result<ShopSnapshot>> {
    const shop = await this.shops.findById(shopId);
    if (!shop) return Result.err('Boutique introuvable');

    const res = shop.updateProfile(patch);
    if (res.isErr) return Result.err(res.getError());

    await this.shops.save(shop);
    return Result.ok(shop.toSnapshot());
  }
}

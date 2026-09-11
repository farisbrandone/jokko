import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { ShopVerification, SubmitShopVerificationInput } from '@jokko/contracts';
import { SHOP_REPOSITORY, type ShopRepository } from '../domain/ports/shop.repository';

@Injectable()
export class ShopVerificationService {
  constructor(@Inject(SHOP_REPOSITORY) private readonly shops: ShopRepository) {}

  async get(shopId: string): Promise<ShopVerification> {
    const shop = await this.shops.findById(shopId);
    if (!shop) throw new NotFoundException('Boutique introuvable');
    return shop.verification;
  }

  async submit(shopId: string, input: SubmitShopVerificationInput): Promise<ShopVerification> {
    const shop = await this.shops.findById(shopId);
    if (!shop) throw new NotFoundException('Boutique introuvable');
    const res = shop.requestVerification(input);
    if (res.isErr) throw new BadRequestException(res.getError());
    await this.shops.save(shop);
    return shop.verification;
  }
}

import { Inject, Injectable } from '@nestjs/common';
import { Result } from '@jokko/domain-kernel';
import type { CreateShopInput } from '@jokko/contracts';
import { Shop, type ShopSnapshot } from '../../domain/shop.aggregate';
import {
  SHOP_REPOSITORY,
  type ShopRepository,
} from '../../domain/ports/shop.repository';
import {
  MEMBERSHIP_REPOSITORY,
  type MembershipRepository,
} from '../../../identity/domain/ports';

@Injectable()
export class CreateShopUseCase {
  constructor(
    @Inject(SHOP_REPOSITORY) private readonly shops: ShopRepository,
    @Inject(MEMBERSHIP_REPOSITORY) private readonly memberships: MembershipRepository,
  ) {}

  async execute(ownerUserId: string, input: CreateShopInput): Promise<Result<ShopSnapshot>> {
    const slugSource = input.slug?.trim() || input.name;
    const desired = slugSource.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
    if (await this.shops.findBySlug(desired)) {
      return Result.err(`Le slug "${desired}" est déjà pris`);
    }

    const created = Shop.create({
      name: input.name,
      slug: input.slug,
      verticals: input.verticals,
      whatsapp: input.whatsapp,
      themePreset: input.themePreset,
      brandColor: input.brandColor ?? null,
      ownerUserId,
    });
    if (created.isErr) return Result.err(created.getError());

    const shop = created.unwrap();
    await this.shops.save(shop);
    await this.memberships.grant(ownerUserId, shop.id.value, 'owner');
    return Result.ok(shop.toSnapshot());
  }
}

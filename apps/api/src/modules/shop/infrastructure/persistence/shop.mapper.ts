import { Shop } from '../../domain/shop.aggregate';
import { ShopEntity } from './shop.entity';

export const ShopMapper = {
  toDomain(entity: ShopEntity): Shop {
    return Shop.restore({
      id: entity.id,
      slug: entity.slug,
      name: entity.name,
      verticals: entity.verticals,
      whatsapp: entity.whatsapp,
      themePreset: entity.themePreset,
      brandColor: entity.brandColor,
      locale: entity.locale,
      currency: entity.currency,
      customDomain: entity.customDomain,
      customDomainVerifiedAt: entity.customDomainVerifiedAt
        ? entity.customDomainVerifiedAt.toISOString()
        : null,
      customDomainToken: entity.customDomainToken,
      status: entity.status,
      createdAt: entity.createdAt.toISOString(),
      updatedAt: entity.updatedAt.toISOString(),
    });
  },

  assign(entity: ShopEntity, shop: Shop): ShopEntity {
    const s = shop.toSnapshot();
    entity.id = s.id;
    entity.slug = s.slug;
    entity.name = s.name;
    entity.verticals = s.verticals;
    entity.whatsapp = s.whatsapp;
    entity.themePreset = s.themePreset;
    entity.brandColor = s.brandColor;
    entity.locale = s.locale;
    entity.currency = s.currency;
    entity.customDomain = s.customDomain;
    entity.customDomainVerifiedAt = s.customDomainVerifiedAt
      ? new Date(s.customDomainVerifiedAt)
      : null;
    entity.customDomainToken = s.customDomainToken;
    entity.status = s.status;
    entity.createdAt = new Date(s.createdAt);
    entity.updatedAt = new Date(s.updatedAt);
    return entity;
  },
};

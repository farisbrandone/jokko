import type { Shop } from '../shop.aggregate';

export interface ShopRepository {
  save(shop: Shop): Promise<void>;
  findById(id: string): Promise<Shop | null>;
  findBySlug(slug: string): Promise<Shop | null>;
  findByCustomDomain(domain: string): Promise<Shop | null>;
}

export const SHOP_REPOSITORY = Symbol('SHOP_REPOSITORY');

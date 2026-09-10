import type { DiscountCode } from './discount-code.aggregate';

export const DISCOUNT_CODE_REPOSITORY = Symbol('DISCOUNT_CODE_REPOSITORY');

export interface DiscountCodeRepository {
  listForShop(shopId: string): Promise<DiscountCode[]>;
  findByShopAndId(shopId: string, id: string): Promise<DiscountCode | null>;
  /** `code` insensible à la casse (stocké en MAJUSCULES). */
  findByShopAndCode(shopId: string, code: string): Promise<DiscountCode | null>;
  save(discount: DiscountCode): Promise<void>;
  delete(shopId: string, id: string): Promise<boolean>;
}

import type { Product } from '../product.aggregate';

export interface ProductPage {
  items: Product[];
  total: number;
}

/**
 * Port de persistance du catalogue. L'implémentation vit dans infrastructure/.
 * Toutes les méthodes sont bornées à une boutique (multi-tenant).
 */
export interface ProductRepository {
  save(product: Product): Promise<void>;
  findById(shopId: string, productId: string): Promise<Product | null>;
  findByShop(
    shopId: string,
    pagination: { page: number; pageSize: number },
  ): Promise<ProductPage>;
}

export const PRODUCT_REPOSITORY = Symbol('PRODUCT_REPOSITORY');

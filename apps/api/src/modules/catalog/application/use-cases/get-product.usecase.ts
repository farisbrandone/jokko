import { Inject, Injectable } from '@nestjs/common';
import type { ProductSnapshot } from '../../domain/product.aggregate';
import {
  PRODUCT_REPOSITORY,
  type ProductRepository,
} from '../../domain/ports/product.repository';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

@Injectable()
export class GetProductUseCase {
  constructor(
    @Inject(PRODUCT_REPOSITORY) private readonly products: ProductRepository,
  ) {}

  /** Lecture publique : par id ou par slug, produit publié uniquement. */
  async publicByIdOrSlug(shopId: string, idOrSlug: string): Promise<ProductSnapshot | null> {
    const product = UUID_RE.test(idOrSlug)
      ? await this.products.findById(shopId, idOrSlug)
      : await this.products.findBySlug(shopId, idOrSlug);
    if (!product) return null;
    const snap = product.toSnapshot();
    return snap.status === 'published' ? snap : null;
  }
}

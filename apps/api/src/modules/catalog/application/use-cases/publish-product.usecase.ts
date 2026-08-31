import { Inject, Injectable } from '@nestjs/common';
import { Result } from '@jokko/domain-kernel';
import type { ProductSnapshot } from '../../domain/product.aggregate';
import {
  PRODUCT_REPOSITORY,
  type ProductRepository,
} from '../../domain/ports/product.repository';

@Injectable()
export class PublishProductUseCase {
  constructor(
    @Inject(PRODUCT_REPOSITORY) private readonly products: ProductRepository,
  ) {}

  async execute(shopId: string, productId: string): Promise<Result<ProductSnapshot>> {
    const product = await this.products.findById(shopId, productId);
    if (!product) return Result.err('Produit introuvable');

    const published = product.publish();
    if (published.isErr) return Result.err(published.getError());

    await this.products.save(product);
    return Result.ok(product.toSnapshot());
  }
}

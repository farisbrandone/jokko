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

  execute(shopId: string, productId: string): Promise<Result<ProductSnapshot>> {
    return this.apply(shopId, productId, (p) => p.publish());
  }

  unpublish(shopId: string, productId: string): Promise<Result<ProductSnapshot>> {
    return this.apply(shopId, productId, (p) => p.unpublish());
  }

  private async apply(
    shopId: string,
    productId: string,
    action: (p: import('../../domain/product.aggregate').Product) => Result<void>,
  ): Promise<Result<ProductSnapshot>> {
    const product = await this.products.findById(shopId, productId);
    if (!product) return Result.err('Produit introuvable');

    const res = action(product);
    if (res.isErr) return Result.err(res.getError());

    await this.products.save(product);
    return Result.ok(product.toSnapshot());
  }
}

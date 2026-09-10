import { Inject, Injectable } from '@nestjs/common';
import { Result } from '@jokko/domain-kernel';
import type { UpdateProductInput } from '@jokko/contracts';
import type { ProductSnapshot } from '../../domain/product.aggregate';
import { Money } from '../../domain/value-objects/money';
import {
  PRODUCT_REPOSITORY,
  type ProductRepository,
} from '../../domain/ports/product.repository';

@Injectable()
export class UpdateProductUseCase {
  constructor(
    @Inject(PRODUCT_REPOSITORY) private readonly products: ProductRepository,
  ) {}

  async execute(
    shopId: string,
    productId: string,
    input: UpdateProductInput,
  ): Promise<Result<ProductSnapshot>> {
    const product = await this.products.findById(shopId, productId);
    if (!product) return Result.err('Produit introuvable');

    let price: Money | undefined;
    if (input.price) {
      const m = Money.create(input.price.amount, input.price.currency);
      if (m.isErr) return Result.err(m.getError());
      price = m.unwrap();
    }

    let compareAtPrice: Money | null | undefined;
    if (input.compareAtPrice === null) compareAtPrice = null;
    else if (input.compareAtPrice) {
      const m = Money.create(input.compareAtPrice.amount, input.compareAtPrice.currency);
      if (m.isErr) return Result.err(m.getError());
      compareAtPrice = m.unwrap();
    }

    const updated = product.update({
      name: input.name,
      description: input.description,
      category: input.category,
      price,
      compareAtPrice,
      stock: input.stock,
      images: input.images,
      attributes: input.attributes,
      variants: input.variants,
    });
    if (updated.isErr) return Result.err(updated.getError());

    await this.products.save(product);
    return Result.ok(product.toSnapshot());
  }
}

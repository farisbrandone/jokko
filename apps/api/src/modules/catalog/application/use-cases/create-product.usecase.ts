import { Inject, Injectable } from '@nestjs/common';
import { Result } from '@jokko/domain-kernel';
import type { CreateProductInput } from '@jokko/contracts';
import { Product, type ProductSnapshot } from '../../domain/product.aggregate';
import { Money } from '../../domain/value-objects/money';
import {
  PRODUCT_REPOSITORY,
  type ProductRepository,
} from '../../domain/ports/product.repository';

@Injectable()
export class CreateProductUseCase {
  constructor(
    @Inject(PRODUCT_REPOSITORY) private readonly products: ProductRepository,
  ) {}

  async execute(
    shopId: string,
    input: CreateProductInput,
  ): Promise<Result<ProductSnapshot>> {
    const price = Money.create(input.price.amount, input.price.currency);
    if (price.isErr) return Result.err(price.getError());

    let compareAtPrice: Money | null = null;
    if (input.compareAtPrice) {
      const cmp = Money.create(input.compareAtPrice.amount, input.compareAtPrice.currency);
      if (cmp.isErr) return Result.err(cmp.getError());
      compareAtPrice = cmp.unwrap();
    }

    const created = Product.create({
      shopId,
      name: input.name,
      description: input.description,
      category: input.category,
      price: price.unwrap(),
      compareAtPrice,
      stock: input.stock,
      images: input.images,
      attributes: input.attributes,
    });
    if (created.isErr) return Result.err(created.getError());

    const product = created.unwrap();
    await this.products.save(product);
    return Result.ok(product.toSnapshot());
  }
}

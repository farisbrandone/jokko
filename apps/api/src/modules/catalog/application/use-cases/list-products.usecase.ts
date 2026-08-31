import { Inject, Injectable } from '@nestjs/common';
import type { PaginationQuery, ProductList } from '@jokko/contracts';
import {
  PRODUCT_REPOSITORY,
  type ProductRepository,
} from '../../domain/ports/product.repository';

@Injectable()
export class ListProductsUseCase {
  constructor(
    @Inject(PRODUCT_REPOSITORY) private readonly products: ProductRepository,
  ) {}

  async execute(shopId: string, query: PaginationQuery): Promise<ProductList> {
    const page = await this.products.findByShop(shopId, {
      page: query.page,
      pageSize: query.pageSize,
    });
    return {
      items: page.items.map((p) => p.toSnapshot()),
      total: page.total,
      page: query.page,
      pageSize: query.pageSize,
    };
  }
}

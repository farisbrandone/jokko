import { Injectable } from '@nestjs/common';
import type {
  ProductSearchQuery,
  ProductSearchResult,
  SearchHit,
} from '@jokko/contracts';
import { ProductIndex, type ProductDoc } from '../infrastructure/product-index';

const quote = (v: string) => `"${v.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;

const SORT: Record<ProductSearchQuery['sort'], string[] | undefined> = {
  relevance: undefined,
  price_asc: ['priceAmount:asc'],
  price_desc: ['priceAmount:desc'],
  newest: ['createdAtTs:desc'],
};

@Injectable()
export class SearchProductsUseCase {
  constructor(private readonly index: ProductIndex) {}

  async execute(shopId: string, query: ProductSearchQuery): Promise<ProductSearchResult> {
    // Bornage boutique + « publié » imposés serveur : jamais issus du client.
    const filter = [`shopId = ${quote(shopId)}`, `status = "published"`];
    if (query.category) filter.push(`category = ${quote(query.category)}`);
    if (query.minPrice != null) filter.push(`priceAmount >= ${query.minPrice}`);
    if (query.maxPrice != null) filter.push(`priceAmount <= ${query.maxPrice}`);
    if (query.inStock === true) filter.push('inStock = true');

    const { hits, total, facets } = await this.index.search({
      q: query.q ?? '',
      filter,
      sort: SORT[query.sort],
      facets: ['category', 'inStock'],
      limit: query.pageSize,
      offset: (query.page - 1) * query.pageSize,
    });

    return {
      items: hits.map(this.toHit),
      total,
      page: query.page,
      pageSize: query.pageSize,
      facets,
    };
  }

  private toHit(doc: ProductDoc): SearchHit {
    return {
      id: doc.id,
      slug: doc.slug,
      name: doc.name,
      description: doc.description,
      category: doc.category,
      priceAmount: doc.priceAmount,
      currency: doc.currency,
      compareAtPriceAmount: doc.compareAtPriceAmount,
      stock: doc.stock,
      inStock: doc.inStock,
      images: doc.images,
    };
  }
}

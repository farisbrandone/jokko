import { Inject, Injectable, Logger } from '@nestjs/common';
import type { MeiliSearch, Index } from 'meilisearch';
import type { ProductSnapshot } from '../../catalog/domain/product.aggregate';
import { MEILI } from './meili.provider';

export const PRODUCTS_INDEX = 'products';

export interface ProductDoc {
  id: string;
  shopId: string;
  slug: string;
  name: string;
  description: string;
  category: string;
  priceAmount: number;
  currency: string;
  compareAtPriceAmount: number | null;
  stock: number;
  inStock: boolean;
  images: string[];
  status: string;
  createdAtTs: number;
}

export const toProductDoc = (p: ProductSnapshot): ProductDoc => {
  // Avec des déclinaisons : prix affiché = plus bas prix effectif (« à partir de »).
  const variantPrices = (p.variants ?? [])
    .map((v) => (v.priceAmount == null ? p.price.amount : v.priceAmount))
    .filter((n) => Number.isFinite(n));
  const priceAmount = variantPrices.length > 0 ? Math.min(...variantPrices) : p.price.amount;
  return {
    id: p.id,
    shopId: p.shopId,
    slug: p.slug,
    name: p.name,
    description: p.description,
    category: p.category,
    priceAmount,
    currency: p.price.currency,
    compareAtPriceAmount: p.compareAtPrice?.amount ?? null,
    stock: p.stock,
    inStock: p.stock > 0,
    images: p.images,
    status: p.status,
    createdAtTs: Date.parse(p.createdAt) || 0,
  };
};

@Injectable()
export class ProductIndex {
  private readonly logger = new Logger(ProductIndex.name);

  constructor(@Inject(MEILI) private readonly client: MeiliSearch) {}

  private index(): Index<ProductDoc> {
    return this.client.index<ProductDoc>(PRODUCTS_INDEX);
  }

  async ensureConfigured(): Promise<void> {
    try {
      try {
        await this.client.getIndex(PRODUCTS_INDEX);
      } catch {
        await this.client.createIndex(PRODUCTS_INDEX, { primaryKey: 'id' });
      }
      await this.index().updateSettings({
        searchableAttributes: ['name', 'description', 'category'],
        filterableAttributes: ['shopId', 'category', 'inStock', 'status', 'priceAmount'],
        sortableAttributes: ['priceAmount', 'createdAtTs'],
      });
      this.logger.log(`index "${PRODUCTS_INDEX}" prêt`);
    } catch (err) {
      this.logger.warn(
        `Meilisearch injoignable au démarrage (${(err as Error).message}). La recherche sera indisponible jusqu'à reconnexion.`,
      );
    }
  }

  async upsert(product: ProductSnapshot): Promise<void> {
    await this.index().addDocuments([toProductDoc(product)], { primaryKey: 'id' });
  }

  async upsertMany(products: ProductSnapshot[]): Promise<void> {
    if (products.length === 0) return;
    await this.index().addDocuments(products.map(toProductDoc), { primaryKey: 'id' });
  }

  async remove(id: string): Promise<void> {
    await this.index().deleteDocument(id);
  }

  async search(params: {
    q: string;
    filter: string[];
    sort?: string[];
    facets: string[];
    limit: number;
    offset: number;
  }): Promise<{
    hits: ProductDoc[];
    total: number;
    facets: Record<string, Record<string, number>>;
  }> {
    const res = await this.index().search(params.q, {
      filter: params.filter,
      sort: params.sort,
      facets: params.facets,
      limit: params.limit,
      offset: params.offset,
    });
    return {
      hits: res.hits as ProductDoc[],
      total: res.estimatedTotalHits ?? res.hits.length,
      facets: (res.facetDistribution as Record<string, Record<string, number>>) ?? {},
    };
  }
}

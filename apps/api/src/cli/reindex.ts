import 'reflect-metadata';
import { existsSync } from 'node:fs';
import { MikroORM } from '@mikro-orm/postgresql';
import { MeiliSearch } from 'meilisearch';
import {
  PRODUCTS_INDEX,
  toProductDoc,
} from '../modules/search/infrastructure/product-index';
import type { ProductSnapshot } from '../modules/catalog/domain/product.aggregate';

function loadEnv(): void {
  for (const c of ['.env', '../../.env']) {
    try {
      if (existsSync(c)) process.loadEnvFile(c);
    } catch {
      /* ignore */
    }
  }
}

interface Row {
  id: string;
  shop_id: string;
  slug: string;
  name: string;
  description: string;
  category: string;
  price: { amount: number; currency: string };
  compare_at_price: { amount: number; currency: string } | null;
  stock: number;
  images: string[];
  attributes: ProductSnapshot['attributes'];
  status: ProductSnapshot['status'];
  created_at: Date;
  updated_at: Date;
}

const toSnapshot = (r: Row): ProductSnapshot => ({
  id: r.id,
  shopId: r.shop_id,
  slug: r.slug,
  name: r.name,
  description: r.description,
  category: r.category,
  price: r.price,
  compareAtPrice: r.compare_at_price,
  stock: r.stock,
  images: r.images,
  attributes: r.attributes,
  status: r.status,
  createdAt: new Date(r.created_at).toISOString(),
  updatedAt: new Date(r.updated_at).toISOString(),
});

async function main(): Promise<void> {
  loadEnv();
  const clientUrl = process.env.DATABASE_ADMIN_URL ?? process.env.DATABASE_URL;
  if (!clientUrl) throw new Error('DATABASE_ADMIN_URL ou DATABASE_URL requis');

  const { buildMikroOrmConfig } = await import('../config/mikro-orm.config');
  const orm = await MikroORM.init(buildMikroOrmConfig({ clientUrl }));

  const meili = new MeiliSearch({
    host: process.env.MEILI_URL ?? 'http://localhost:57700',
    apiKey: process.env.MEILI_MASTER_KEY ?? 'jokko_dev_meili_master_key',
  });

  try {
    const rows = await orm.em
      .getConnection()
      .execute<Row[]>(`select * from catalog_products where status = 'published'`);
    const docs = rows.map((r) => toProductDoc(toSnapshot(r)));

    try {
      await meili.getIndex(PRODUCTS_INDEX);
    } catch {
      await meili.createIndex(PRODUCTS_INDEX, { primaryKey: 'id' });
    }
    if (docs.length > 0) {
      await meili.index(PRODUCTS_INDEX).addDocuments(docs, { primaryKey: 'id' });
    }
    console.log(`✓ ${docs.length} produit(s) publié(s) poussé(s) dans l'index "${PRODUCTS_INDEX}"`);
  } finally {
    await orm.close(true);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

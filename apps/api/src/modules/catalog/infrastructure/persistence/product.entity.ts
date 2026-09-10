import { Entity, Filter, Index, PrimaryKey, Property, Unique } from '@mikro-orm/core';
import type { DynamicAttributes, ProductStatus, ProductVariant } from '@jokko/contracts';

interface MoneyJson {
  amount: number;
  currency: string;
}

/**
 * Table `catalog_products`. Row-Level Security activée en base (voir migration) :
 * chaque requête est bornée à `app.current_shop_id`. Le filtre MikroORM `tenant`
 * ajoute la même condition au niveau ORM (défense en profondeur).
 *
 * Types explicites sur chaque colonne (indépendance vis-à-vis de l'émission de
 * métadonnées de décorateur : tsc pour le build, esbuild pour les scripts tsx).
 */
@Entity({ tableName: 'catalog_products' })
@Filter({
  name: 'tenant',
  cond: (args: { shopId: string }) => ({ shopId: args.shopId }),
  default: true,
})
@Unique({ properties: ['shopId', 'slug'] })
@Index({ properties: ['shopId', 'status'] })
export class ProductEntity {
  @PrimaryKey({ type: 'uuid' })
  id!: string;

  @Property({ type: 'uuid', fieldName: 'shop_id' })
  shopId!: string;

  @Property({ type: 'string', length: 80 })
  slug!: string;

  @Property({ type: 'string', length: 160 })
  name!: string;

  @Property({ type: 'text' })
  description = '';

  @Property({ type: 'string', length: 120 })
  category!: string;

  @Property({ type: 'json' })
  price!: MoneyJson;

  @Property({ type: 'json', fieldName: 'compare_at_price', nullable: true })
  compareAtPrice: MoneyJson | null = null;

  @Property({ type: 'integer' })
  stock = 0;

  @Property({ type: 'json' })
  images: string[] = [];

  @Property({ type: 'json' })
  attributes: DynamicAttributes = {};

  @Property({ type: 'json' })
  variants: ProductVariant[] = [];

  @Property({ type: 'string', length: 20 })
  status: ProductStatus = 'draft';

  @Property({ type: 'datetime', fieldName: 'created_at' })
  createdAt: Date = new Date();

  @Property({ type: 'datetime', fieldName: 'updated_at', onUpdate: () => new Date() })
  updatedAt: Date = new Date();
}

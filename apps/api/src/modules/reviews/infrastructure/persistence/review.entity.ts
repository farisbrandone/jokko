import { Entity, Filter, Index, PrimaryKey, Property } from '@mikro-orm/core';
import type { ReviewStatus } from '@jokko/contracts';

/**
 * Table `product_reviews`. RLS activée en base (voir migration) ; le filtre
 * MikroORM `tenant` ajoute la même condition côté ORM (défense en profondeur).
 */
@Entity({ tableName: 'product_reviews' })
@Filter({
  name: 'tenant',
  cond: (args: { shopId: string }) => ({ shopId: args.shopId }),
  default: true,
})
@Index({ properties: ['productId', 'status'] })
export class ProductReviewEntity {
  @PrimaryKey({ type: 'uuid' })
  id!: string;

  @Property({ type: 'uuid', fieldName: 'shop_id' })
  shopId!: string;

  @Property({ type: 'uuid', fieldName: 'product_id' })
  productId!: string;

  @Property({ type: 'smallint' })
  rating!: number;

  @Property({ type: 'string', length: 120, nullable: true })
  title: string | null = null;

  @Property({ type: 'text' })
  body!: string;

  @Property({ type: 'string', length: 80, fieldName: 'author_name' })
  authorName!: string;

  @Property({ type: 'string', length: 12 })
  status: ReviewStatus = 'pending';

  @Property({ type: 'datetime', fieldName: 'created_at' })
  createdAt: Date = new Date();
}

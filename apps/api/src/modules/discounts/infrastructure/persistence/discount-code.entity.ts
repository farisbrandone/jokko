import { Entity, Index, PrimaryKey, Property, Unique } from '@mikro-orm/core';
import { randomUUID } from 'node:crypto';
import type { DiscountKind } from '@jokko/contracts';

/** `discount_codes` : accès serveur avec `shop_id` explicite (pas de RLS). */
@Entity({ tableName: 'discount_codes' })
@Unique({ properties: ['shopId', 'code'] })
@Index({ properties: ['shopId'] })
export class DiscountCodeEntity {
  @PrimaryKey({ type: 'uuid' })
  id: string = randomUUID();

  @Property({ type: 'uuid', fieldName: 'shop_id' })
  shopId!: string;

  @Property({ type: 'string', length: 24 })
  code!: string;

  @Property({ type: 'string', length: 12 })
  kind: DiscountKind = 'percent';

  @Property({ type: 'integer' })
  value!: number;

  @Property({ type: 'integer', fieldName: 'min_subtotal', nullable: true })
  minSubtotal: number | null = null;

  @Property({ type: 'integer', fieldName: 'max_redemptions', nullable: true })
  maxRedemptions: number | null = null;

  @Property({ type: 'integer', fieldName: 'redeemed_count' })
  redeemedCount = 0;

  @Property({ type: 'datetime', fieldName: 'expires_at', nullable: true })
  expiresAt: Date | null = null;

  @Property({ type: 'boolean' })
  active = true;

  @Property({ type: 'datetime', fieldName: 'created_at' })
  createdAt: Date = new Date();
}

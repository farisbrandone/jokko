import { Entity, Index, PrimaryKey, Property } from '@mikro-orm/core';
import { randomUUID } from 'node:crypto';
import type { DisputeReason, DisputeResolution, DisputeStatus } from '@jokko/contracts';

/** `disputes` : accès serveur avec `shop_id` explicite (pas de RLS), comme `orders`. */
@Entity({ tableName: 'disputes' })
@Index({ properties: ['shopId', 'status'] })
export class DisputeEntity {
  @PrimaryKey({ type: 'uuid' })
  id: string = randomUUID();

  @Property({ type: 'uuid', fieldName: 'shop_id' })
  shopId!: string;

  @Index()
  @Property({ type: 'uuid', fieldName: 'order_id' })
  orderId!: string;

  @Property({ type: 'string', length: 20, fieldName: 'buyer_phone' })
  buyerPhone!: string;

  @Property({ type: 'string', length: 20 })
  reason!: DisputeReason;

  @Property({ type: 'text' })
  description!: string;

  @Property({ type: 'string', length: 20 })
  status: DisputeStatus = 'open';

  @Property({ type: 'text', fieldName: 'seller_response', nullable: true })
  sellerResponse: string | null = null;

  @Property({ type: 'string', length: 12, nullable: true })
  resolution: DisputeResolution | null = null;

  @Property({ type: 'text', fieldName: 'resolution_note', nullable: true })
  resolutionNote: string | null = null;

  @Property({ type: 'text', fieldName: 'escalation_note', nullable: true })
  escalationNote: string | null = null;

  @Property({ type: 'text', fieldName: 'admin_note', nullable: true })
  adminNote: string | null = null;

  @Property({ type: 'datetime', fieldName: 'created_at' })
  createdAt: Date = new Date();

  @Property({ type: 'datetime', fieldName: 'updated_at', onUpdate: () => new Date() })
  updatedAt: Date = new Date();

  @Property({ type: 'datetime', fieldName: 'escalated_at', nullable: true })
  escalatedAt: Date | null = null;

  @Property({ type: 'datetime', fieldName: 'closed_at', nullable: true })
  closedAt: Date | null = null;
}

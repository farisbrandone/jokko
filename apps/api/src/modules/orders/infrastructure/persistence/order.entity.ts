import { Entity, Index, PrimaryKey, Property } from '@mikro-orm/core';
import { randomUUID } from 'node:crypto';
import type {
  DeliveryMethod,
  OrderLine,
  OrderStatus,
  PaymentMethod,
} from '@jokko/contracts';

/** `orders` : accès serveur avec `shop_id` explicite (pas de RLS), acheteur via jeton. */
@Entity({ tableName: 'orders' })
@Index({ properties: ['shopId', 'status'] })
export class OrderEntity {
  @PrimaryKey({ type: 'uuid' })
  id: string = randomUUID();

  @Property({ type: 'uuid', fieldName: 'shop_id' })
  shopId!: string;

  @Property({ type: 'string', length: 80, fieldName: 'buyer_name' })
  buyerName!: string;

  @Property({ type: 'string', length: 20, fieldName: 'buyer_phone' })
  buyerPhone!: string;

  @Property({ type: 'string', length: 320, fieldName: 'buyer_email', nullable: true })
  buyerEmail: string | null = null;

  @Property({ type: 'string', length: 500, nullable: true })
  note: string | null = null;

  @Property({ type: 'json' })
  lines: OrderLine[] = [];

  @Property({ type: 'integer' })
  subtotal!: number;

  @Property({ type: 'string', length: 3 })
  currency!: string;

  @Property({ type: 'string', length: 16 })
  status: OrderStatus = 'pending_payment';

  @Property({ type: 'string', length: 20, fieldName: 'payment_method' })
  paymentMethod: PaymentMethod = 'online';

  @Property({ type: 'string', length: 12, fieldName: 'delivery_method' })
  deliveryMethod: DeliveryMethod = 'pickup';

  @Property({ type: 'string', length: 60, fieldName: 'delivery_zone_label', nullable: true })
  deliveryZoneLabel: string | null = null;

  @Property({ type: 'integer', fieldName: 'delivery_fee' })
  deliveryFee = 0;

  @Property({ type: 'string', length: 600, fieldName: 'delivery_address', nullable: true })
  deliveryAddress: string | null = null;

  @Property({ type: 'string', length: 24, fieldName: 'discount_code', nullable: true })
  discountCode: string | null = null;

  @Property({ type: 'integer', fieldName: 'discount_amount' })
  discountAmount = 0;

  @Property({ type: 'string', length: 64, fieldName: 'buyer_token_hash' })
  buyerTokenHash!: string;

  @Property({ type: 'string', length: 80, fieldName: 'tx_ref', nullable: true })
  txRef: string | null = null;

  @Property({ type: 'string', length: 120, fieldName: 'provider_tx_id', nullable: true })
  providerTxId: string | null = null;

  @Property({ type: 'datetime', fieldName: 'created_at' })
  createdAt: Date = new Date();

  @Property({ type: 'datetime', fieldName: 'paid_at', nullable: true })
  paidAt: Date | null = null;

  @Property({ type: 'datetime', fieldName: 'fulfilled_at', nullable: true })
  fulfilledAt: Date | null = null;

  @Property({ type: 'datetime', fieldName: 'delivered_at', nullable: true })
  deliveredAt: Date | null = null;
}

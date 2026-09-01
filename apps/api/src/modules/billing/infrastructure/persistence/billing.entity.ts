import { Entity, Index, PrimaryKey, Property, Unique } from '@mikro-orm/core';
import { randomUUID } from 'node:crypto';
import type { SubscriptionPlan, SubscriptionStatus } from '@jokko/contracts';
import type { PaymentStatus } from '../../domain/ports';

/** `subscriptions` : 1 ligne / boutique, accès serveur avec `shopId` explicite (pas de RLS). */
@Entity({ tableName: 'subscriptions' })
export class SubscriptionEntity {
  @PrimaryKey({ type: 'uuid', fieldName: 'shop_id' })
  shopId!: string;

  @Property({ type: 'string', length: 10 })
  plan: SubscriptionPlan = 'trial';

  @Property({ type: 'string', length: 12 })
  status: SubscriptionStatus = 'trialing';

  @Property({ type: 'datetime', fieldName: 'current_period_end' })
  currentPeriodEnd!: Date;

  @Property({ type: 'string', length: 120, fieldName: 'provider_ref', nullable: true })
  providerRef: string | null = null;

  @Property({ type: 'datetime', fieldName: 'created_at' })
  createdAt: Date = new Date();

  @Property({ type: 'datetime', fieldName: 'updated_at' })
  updatedAt: Date = new Date();
}

@Entity({ tableName: 'billing_payments' })
export class BillingPaymentEntity {
  @PrimaryKey({ type: 'uuid' })
  id: string = randomUUID();

  @Index()
  @Property({ type: 'uuid', fieldName: 'shop_id' })
  shopId!: string;

  @Unique()
  @Property({ type: 'string', length: 80, fieldName: 'tx_ref' })
  txRef!: string;

  @Property({ type: 'string', length: 120, fieldName: 'provider_tx_id', nullable: true })
  providerTxId: string | null = null;

  @Property({ type: 'integer' })
  amount!: number;

  @Property({ type: 'string', length: 3 })
  currency = 'XOF';

  @Property({ type: 'string', length: 12 })
  status: PaymentStatus = 'pending';

  @Property({ type: 'datetime', fieldName: 'created_at' })
  createdAt: Date = new Date();

  @Property({ type: 'datetime', fieldName: 'updated_at' })
  updatedAt: Date = new Date();
}

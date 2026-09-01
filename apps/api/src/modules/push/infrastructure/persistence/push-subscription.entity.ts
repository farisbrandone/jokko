import { Entity, Index, PrimaryKey, Property, Unique } from '@mikro-orm/core';
import { randomUUID } from 'node:crypto';

/** `push_subscriptions` : registre par utilisateur, sans RLS boutique. */
@Entity({ tableName: 'push_subscriptions' })
export class PushSubscriptionEntity {
  @PrimaryKey({ type: 'uuid' })
  id: string = randomUUID();

  @Index()
  @Property({ type: 'uuid', fieldName: 'user_id' })
  userId!: string;

  @Unique()
  @Property({ type: 'text' })
  endpoint!: string;

  @Property({ type: 'text' })
  p256dh!: string;

  @Property({ type: 'text' })
  auth!: string;

  @Property({ type: 'string', length: 255, fieldName: 'user_agent', nullable: true })
  userAgent: string | null = null;

  @Property({ type: 'datetime', fieldName: 'created_at' })
  createdAt: Date = new Date();
}

import { Entity, Filter, Index, PrimaryKey, Property } from '@mikro-orm/core';
import { randomUUID } from 'node:crypto';

@Entity({ tableName: 'analytics_events' })
@Filter({
  name: 'tenant',
  cond: (args: { shopId: string }) => ({ shopId: args.shopId }),
  default: true,
})
export class AnalyticsEventEntity {
  @PrimaryKey({ type: 'uuid' })
  id: string = randomUUID();

  @Index()
  @Property({ type: 'uuid', fieldName: 'shop_id' })
  shopId!: string;

  @Property({ type: 'string', length: 30 })
  name!: string;

  @Property({ type: 'json' })
  props: Record<string, string | number | boolean> = {};

  @Property({ type: 'string', length: 64, fieldName: 'session_id', nullable: true })
  sessionId: string | null = null;

  @Property({ type: 'datetime', fieldName: 'created_at' })
  createdAt: Date = new Date();
}

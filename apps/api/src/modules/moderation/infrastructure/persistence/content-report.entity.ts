import { Entity, Filter, Index, PrimaryKey, Property } from '@mikro-orm/core';
import { randomUUID } from 'node:crypto';
import type { ReportReason, ReportStatus, ReportTarget } from '@jokko/contracts';

@Entity({ tableName: 'content_reports' })
@Filter({
  name: 'tenant',
  cond: (args: { shopId: string }) => ({ shopId: args.shopId }),
  default: true,
})
export class ContentReportEntity {
  @PrimaryKey({ type: 'uuid' })
  id: string = randomUUID();

  @Index()
  @Property({ type: 'uuid', fieldName: 'shop_id' })
  shopId!: string;

  @Property({ type: 'string', length: 10, fieldName: 'target_type' })
  targetType!: ReportTarget;

  @Property({ type: 'uuid', fieldName: 'target_id' })
  targetId!: string;

  @Property({ type: 'string', length: 16 })
  reason!: ReportReason;

  @Property({ type: 'text', nullable: true })
  note: string | null = null;

  @Property({ type: 'string', length: 120, fieldName: 'reporter_key' })
  reporterKey = '';

  @Property({ type: 'string', length: 10 })
  status: ReportStatus = 'pending';

  @Property({ type: 'datetime', fieldName: 'created_at' })
  createdAt: Date = new Date();

  @Property({ type: 'datetime', fieldName: 'updated_at' })
  updatedAt: Date = new Date();
}

import { Injectable } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import { Subscription } from '../../domain/subscription.aggregate';
import type { SubscriptionRepository } from '../../domain/ports';
import { SubscriptionEntity } from './billing.entity';

@Injectable()
export class MikroOrmSubscriptionRepository implements SubscriptionRepository {
  constructor(private readonly em: EntityManager) {}

  private toDomain(row: SubscriptionEntity): Subscription {
    return Subscription.restore({
      shopId: row.shopId,
      plan: row.plan,
      status: row.status,
      currentPeriodEnd: row.currentPeriodEnd.toISOString(),
      providerRef: row.providerRef,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    });
  }

  async find(shopId: string): Promise<Subscription | null> {
    const row = await this.em.fork().findOne(SubscriptionEntity, { shopId });
    return row ? this.toDomain(row) : null;
  }

  async save(sub: Subscription): Promise<void> {
    const em = this.em.fork();
    const s = sub.toSnapshot();
    const row = (await em.findOne(SubscriptionEntity, { shopId: s.shopId })) ?? new SubscriptionEntity();
    row.shopId = s.shopId;
    row.plan = s.plan;
    row.status = s.status;
    row.currentPeriodEnd = new Date(s.currentPeriodEnd);
    row.providerRef = s.providerRef;
    row.createdAt = new Date(s.createdAt);
    row.updatedAt = new Date();
    await em.persistAndFlush(row);
  }

  async listLapsed(graceDays: number): Promise<Subscription[]> {
    const cutoff = new Date(Date.now() - graceDays * 86_400_000);
    const rows = await this.em.fork().find(SubscriptionEntity, {
      status: { $in: ['trialing', 'active', 'past_due'] },
      currentPeriodEnd: { $lt: cutoff },
    });
    return rows.map((r) => this.toDomain(r));
  }
}

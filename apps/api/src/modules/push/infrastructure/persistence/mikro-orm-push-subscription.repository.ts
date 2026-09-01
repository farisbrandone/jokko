import { Injectable } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import type {
  PushSubscriptionData,
  PushSubscriptionRepository,
  StoredPushSubscription,
} from '../../domain/ports';
import { PushSubscriptionEntity } from './push-subscription.entity';

@Injectable()
export class MikroOrmPushSubscriptionRepository implements PushSubscriptionRepository {
  constructor(private readonly em: EntityManager) {}

  async upsert(
    userId: string,
    sub: PushSubscriptionData,
    userAgent?: string,
  ): Promise<void> {
    const em = this.em.fork();
    const row =
      (await em.findOne(PushSubscriptionEntity, { endpoint: sub.endpoint })) ??
      new PushSubscriptionEntity();
    row.userId = userId;
    row.endpoint = sub.endpoint;
    row.p256dh = sub.p256dh;
    row.auth = sub.auth;
    row.userAgent = userAgent?.slice(0, 255) ?? row.userAgent ?? null;
    await em.persistAndFlush(row);
  }

  async removeForUser(userId: string, endpoint: string): Promise<void> {
    await this.em.fork().nativeDelete(PushSubscriptionEntity, { userId, endpoint });
  }

  async removeStale(endpoint: string): Promise<void> {
    await this.em.fork().nativeDelete(PushSubscriptionEntity, { endpoint });
  }

  async listForUsers(userIds: string[]): Promise<StoredPushSubscription[]> {
    if (userIds.length === 0) return [];
    const rows = await this.em
      .fork()
      .find(PushSubscriptionEntity, { userId: { $in: userIds } });
    return rows.map((r) => ({
      userId: r.userId,
      endpoint: r.endpoint,
      p256dh: r.p256dh,
      auth: r.auth,
    }));
  }
}

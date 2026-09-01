import { Injectable } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import type { NotificationChannel } from '@jokko/contracts';
import type { DispatchLogRepository } from '../../domain/ports';
import { NotificationDispatchLogEntity } from './notification.entity';

@Injectable()
export class MikroOrmDispatchLogRepository implements DispatchLogRepository {
  constructor(private readonly em: EntityManager) {}

  // Fork dédié : appelé depuis le relais d'Outbox (EM de contexte partagé,
  // non ré-entrant). Un fork isole la transaction.
  private withShop<T>(shopId: string, fn: (em: EntityManager) => Promise<T>): Promise<T> {
    return this.em.fork().transactional(async (em) => {
      await em.execute("select set_config('app.current_shop_id', ?, true)", [shopId]);
      em.setFilterParams('tenant', { shopId });
      return fn(em);
    });
  }

  async lastSentAt(
    shopId: string,
    conversationId: string,
    channel: NotificationChannel,
  ): Promise<Date | null> {
    return this.withShop(shopId, async (em) => {
      const row = await em.findOne(
        NotificationDispatchLogEntity,
        { conversationId, channel },
        { orderBy: { sentAt: 'desc' } },
      );
      return row?.sentAt ?? null;
    });
  }

  async record(
    shopId: string,
    conversationId: string,
    channel: NotificationChannel,
  ): Promise<void> {
    await this.withShop(shopId, async (em) => {
      const row = new NotificationDispatchLogEntity();
      row.shopId = shopId;
      row.conversationId = conversationId;
      row.channel = channel;
      row.sentAt = new Date();
      await em.persistAndFlush(row);
    });
  }
}

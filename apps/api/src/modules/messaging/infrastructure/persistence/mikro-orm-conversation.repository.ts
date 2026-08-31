import { Injectable } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import { Conversation } from '../../domain/conversation.aggregate';
import type {
  ConversationPage,
  ConversationRepository,
} from '../../domain/ports/conversation.repository';
import { TenantContext } from '../../../../shared/tenant/tenant-context';
import { OutboxMessageEntity } from '../../../../persistence/entities/outbox-message.entity';
import { ConversationEntity, MessageEntity } from './messaging.entity';

@Injectable()
export class MikroOrmConversationRepository implements ConversationRepository {
  constructor(
    private readonly em: EntityManager,
    private readonly tenant: TenantContext,
  ) {}

  private async withTenant<T>(fn: (em: EntityManager) => Promise<T>): Promise<T> {
    const shopId = this.tenant.getShopId();
    return this.em.transactional(async (em) => {
      await em.execute("select set_config('app.current_shop_id', ?, true)", [shopId]);
      em.setFilterParams('tenant', { shopId });
      return fn(em);
    });
  }

  async save(conversation: Conversation): Promise<void> {
    await this.withTenant(async (em) => {
      const s = conversation.toSnapshot();
      const row =
        (await em.findOne(ConversationEntity, { id: s.id })) ?? new ConversationEntity();
      row.id = s.id;
      row.shopId = s.shopId;
      row.buyerName = s.buyerName;
      row.buyerPhone = s.buyerPhone;
      row.buyerEmail = s.buyerEmail;
      row.productId = s.productId;
      row.productName = s.productName;
      row.status = s.status;
      row.buyerTokenHash = s.buyerTokenHash;
      row.lastMessageAt = new Date(s.lastMessageAt);
      row.createdAt = new Date(s.createdAt);
      // Flush avant l'upsert des messages : `em.upsert` exécute du SQL immédiat,
      // la conversation doit déjà exister (clé étrangère).
      await em.persistAndFlush(row);

      for (const m of s.messages) {
        await em.upsert(MessageEntity, {
          id: m.id,
          conversationId: s.id,
          shopId: s.shopId,
          sender: m.sender,
          body: m.body,
          createdAt: new Date(m.createdAt),
        });
      }

      for (const event of conversation.pullDomainEvents()) {
        const msg = new OutboxMessageEntity();
        msg.name = event.name;
        msg.aggregateId = event.aggregateId;
        msg.shopId = event.shopId;
        msg.payload = event.payload;
        msg.cacheTags = event.cacheTags ?? [];
        msg.occurredAt = event.occurredAt;
        em.persist(msg);
      }
    });
  }

  async findById(_shopId: string, id: string): Promise<Conversation | null> {
    return this.withTenant(async (em) => {
      const row = await em.findOne(ConversationEntity, { id });
      if (!row) return null;
      const msgs = await em.find(
        MessageEntity,
        { conversationId: id },
        { orderBy: { createdAt: 'asc' } },
      );
      return Conversation.restore({
        id: row.id,
        shopId: row.shopId,
        buyerName: row.buyerName,
        buyerPhone: row.buyerPhone,
        buyerEmail: row.buyerEmail,
        productId: row.productId,
        productName: row.productName,
        status: row.status,
        buyerTokenHash: row.buyerTokenHash,
        lastMessageAt: row.lastMessageAt.toISOString(),
        createdAt: row.createdAt.toISOString(),
        messages: msgs.map((m) => ({
          id: m.id,
          sender: m.sender,
          body: m.body,
          createdAt: m.createdAt.toISOString(),
        })),
      });
    });
  }

  async findByShop(
    _shopId: string,
    filter: { status?: 'open' | 'closed'; page: number; pageSize: number },
  ): Promise<ConversationPage> {
    return this.withTenant(async (em) => {
      const where = filter.status ? { status: filter.status } : {};
      const [rows, total] = await em.findAndCount(ConversationEntity, where, {
        limit: filter.pageSize,
        offset: (filter.page - 1) * filter.pageSize,
        orderBy: { lastMessageAt: 'desc' },
      });
      const items = rows.map((row) =>
        Conversation.restore({
          id: row.id,
          shopId: row.shopId,
          buyerName: row.buyerName,
          buyerPhone: row.buyerPhone,
          buyerEmail: row.buyerEmail,
          productId: row.productId,
          productName: row.productName,
          status: row.status,
          buyerTokenHash: row.buyerTokenHash,
          lastMessageAt: row.lastMessageAt.toISOString(),
          createdAt: row.createdAt.toISOString(),
          messages: [],
        }),
      );
      return { items, total };
    });
  }
}

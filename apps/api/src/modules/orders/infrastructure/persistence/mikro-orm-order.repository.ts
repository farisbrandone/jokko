import { Injectable } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import type { OrderStatus } from '@jokko/contracts';
import { Order } from '../../domain/order.aggregate';
import type { OrderPage, OrderRepository } from '../../domain/ports';
import { OrderEntity } from './order.entity';

@Injectable()
export class MikroOrmOrderRepository implements OrderRepository {
  constructor(private readonly em: EntityManager) {}

  private toDomain(row: OrderEntity): Order {
    return Order.restore({
      id: row.id,
      shopId: row.shopId,
      buyerName: row.buyerName,
      buyerPhone: row.buyerPhone,
      buyerEmail: row.buyerEmail,
      note: row.note,
      lines: row.lines,
      subtotal: row.subtotal,
      currency: row.currency,
      status: row.status,
      buyerTokenHash: row.buyerTokenHash,
      txRef: row.txRef,
      providerTxId: row.providerTxId,
      createdAt: row.createdAt.toISOString(),
      paidAt: row.paidAt ? row.paidAt.toISOString() : null,
      fulfilledAt: row.fulfilledAt ? row.fulfilledAt.toISOString() : null,
    });
  }

  async save(order: Order): Promise<void> {
    const em = this.em.fork();
    const s = order.toSnapshot();
    const row = (await em.findOne(OrderEntity, { id: s.id })) ?? new OrderEntity();
    row.id = s.id;
    row.shopId = s.shopId;
    row.buyerName = s.buyerName;
    row.buyerPhone = s.buyerPhone;
    row.buyerEmail = s.buyerEmail;
    row.note = s.note;
    row.lines = s.lines;
    row.subtotal = s.subtotal;
    row.currency = s.currency;
    row.status = s.status;
    row.buyerTokenHash = s.buyerTokenHash;
    row.txRef = s.txRef;
    row.providerTxId = s.providerTxId;
    row.createdAt = new Date(s.createdAt);
    row.paidAt = s.paidAt ? new Date(s.paidAt) : null;
    row.fulfilledAt = s.fulfilledAt ? new Date(s.fulfilledAt) : null;
    await em.persistAndFlush(row);
  }

  async findById(id: string): Promise<Order | null> {
    const row = await this.em.fork().findOne(OrderEntity, { id });
    return row ? this.toDomain(row) : null;
  }

  async findByShopAndId(shopId: string, id: string): Promise<Order | null> {
    const row = await this.em.fork().findOne(OrderEntity, { id, shopId });
    return row ? this.toDomain(row) : null;
  }

  async findByTxRef(txRef: string): Promise<Order | null> {
    const row = await this.em.fork().findOne(OrderEntity, { txRef });
    return row ? this.toDomain(row) : null;
  }

  async listByShop(
    shopId: string,
    opts: { status?: string; page: number; pageSize: number },
  ): Promise<OrderPage> {
    const where = opts.status
      ? { shopId, status: opts.status as OrderStatus }
      : { shopId };
    const [rows, total] = await this.em.fork().findAndCount(OrderEntity, where, {
      orderBy: { createdAt: 'desc' },
      limit: opts.pageSize,
      offset: (opts.page - 1) * opts.pageSize,
    });
    return { items: rows.map((r) => this.toDomain(r)), total };
  }
}

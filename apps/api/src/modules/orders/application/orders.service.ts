import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Order as OrderView, OrderList } from '@jokko/contracts';
import { Order } from '../domain/order.aggregate';
import { ORDER_REPOSITORY, type OrderRepository } from '../domain/ports';
import { ApplyOrderPaymentUseCase } from './apply-order-payment.usecase';

function toView(order: Order): OrderView {
  const s = order.toSnapshot();
  return {
    id: s.id,
    status: s.status,
    buyerName: s.buyerName,
    buyerPhone: s.buyerPhone,
    buyerEmail: s.buyerEmail,
    note: s.note,
    lines: s.lines,
    subtotal: s.subtotal,
    currency: s.currency,
    createdAt: s.createdAt,
    paidAt: s.paidAt,
    fulfilledAt: s.fulfilledAt,
  };
}

@Injectable()
export class OrdersService {
  constructor(
    @Inject(ORDER_REPOSITORY) private readonly orders: OrderRepository,
    private readonly applyPayment: ApplyOrderPaymentUseCase,
  ) {}

  async listForShop(
    shopId: string,
    opts: { status?: string; page: number },
  ): Promise<OrderList> {
    const pageSize = 20;
    const { items, total } = await this.orders.listByShop(shopId, {
      status: opts.status,
      page: opts.page,
      pageSize,
    });
    return { items: items.map(toView), total, page: opts.page, pageSize };
  }

  async getForShop(shopId: string, id: string): Promise<OrderView> {
    const order = await this.orders.findByShopAndId(shopId, id);
    if (!order) throw new NotFoundException('Commande introuvable');
    return toView(order);
  }

  async getForBuyer(shopId: string, id: string, token: string): Promise<OrderView> {
    const order = await this.orders.findByShopAndId(shopId, id);
    if (!order || !order.matchesToken(token)) {
      throw new ForbiddenException('Commande introuvable ou jeton invalide');
    }
    return toView(order);
  }

  async confirmByBuyer(
    shopId: string,
    id: string,
    token: string,
    txRef: string,
  ): Promise<OrderView> {
    const order = await this.orders.findByShopAndId(shopId, id);
    if (!order || !order.matchesToken(token)) {
      throw new ForbiddenException('Commande introuvable ou jeton invalide');
    }
    await this.applyPayment.execute(txRef);
    return this.getForShop(shopId, id);
  }

  async fulfill(shopId: string, id: string): Promise<OrderView> {
    const order = await this.orders.findByShopAndId(shopId, id);
    if (!order) throw new NotFoundException('Commande introuvable');
    if (order.status !== 'paid') {
      throw new BadRequestException('Seule une commande payée peut être marquée comme expédiée');
    }
    order.fulfill();
    await this.orders.save(order);
    return toView(order);
  }

  async cancel(shopId: string, id: string): Promise<OrderView> {
    const order = await this.orders.findByShopAndId(shopId, id);
    if (!order) throw new NotFoundException('Commande introuvable');
    order.cancel();
    await this.orders.save(order);
    return toView(order);
  }
}

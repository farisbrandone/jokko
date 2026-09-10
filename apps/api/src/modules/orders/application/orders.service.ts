import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Order as OrderView, OrderList } from '@jokko/contracts';
import { Money } from '../../catalog/domain/value-objects/money';
import {
  PRODUCT_REPOSITORY,
  type ProductRepository,
} from '../../catalog/domain/ports/product.repository';
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
    paymentMethod: s.paymentMethod,
    deliveryMethod: s.deliveryMethod,
    deliveryZoneLabel: s.deliveryZoneLabel,
    deliveryFee: s.deliveryFee,
    deliveryAddress: s.deliveryAddress,
    total: s.subtotal + s.deliveryFee,
    createdAt: s.createdAt,
    paidAt: s.paidAt,
    fulfilledAt: s.fulfilledAt,
    deliveredAt: s.deliveredAt,
  };
}

@Injectable()
export class OrdersService {
  constructor(
    @Inject(ORDER_REPOSITORY) private readonly orders: OrderRepository,
    @Inject(PRODUCT_REPOSITORY) private readonly products: ProductRepository,
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

  /** « Expédiée » (en ligne) ou « Livrée & encaissée » (paiement à la livraison). */
  async fulfill(shopId: string, id: string): Promise<OrderView> {
    const order = await this.orders.findByShopAndId(shopId, id);
    if (!order) throw new NotFoundException('Commande introuvable');
    if (order.status !== 'paid' && order.status !== 'to_deliver') {
      throw new BadRequestException(
        'Seule une commande payée ou à livrer peut être marquée comme terminée',
      );
    }
    const wasCod = order.paymentMethod === 'cash_on_delivery';
    order.fulfill();
    await this.orders.save(order);
    // Paiement à la livraison : le stock n'a pas été décrémenté au paiement.
    if (wasCod) await this.decrementStock(shopId, order.lines);
    return toView(order);
  }

  async cancel(shopId: string, id: string): Promise<OrderView> {
    const order = await this.orders.findByShopAndId(shopId, id);
    if (!order) throw new NotFoundException('Commande introuvable');
    order.cancel();
    await this.orders.save(order);
    return toView(order);
  }

  private async decrementStock(
    shopId: string,
    lines: { productId: string; qty: number }[],
  ): Promise<void> {
    for (const line of lines) {
      const product = await this.products.findById(shopId, line.productId);
      if (!product) continue;
      const s = product.toSnapshot();
      const res = product.update({
        stock: Math.max(0, s.stock - line.qty),
        price: Money.create(s.price.amount, s.price.currency).unwrap(),
      });
      if (res.isOk) await this.products.save(product);
    }
  }
}

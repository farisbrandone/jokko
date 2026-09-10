import { Inject, Injectable, Logger } from '@nestjs/common';
import { Money } from '../../catalog/domain/value-objects/money';
import {
  PRODUCT_REPOSITORY,
  type ProductRepository,
} from '../../catalog/domain/ports/product.repository';
import { PAYMENT_GATEWAY, type PaymentGateway } from '../../billing/domain/ports';
import {
  MEMBERSHIP_REPOSITORY,
  type MembershipRepository,
} from '../../identity/domain/ports';
import { Mailer } from '../../notifications/infrastructure/mailer';
import { renderEmail } from '../../notifications/infrastructure/email-template';
import { ORDER_REPOSITORY, type OrderRepository } from '../domain/ports';

const ZERO_DECIMAL = new Set(['XOF', 'XAF', 'JPY', 'KRW', 'CLP', 'VND']);
const fmt = (amount: number, currency: string): string => {
  const div = ZERO_DECIMAL.has(currency) ? 1 : 100;
  return `${(amount / div).toLocaleString('fr')} ${currency}`;
};

/** Applique le paiement d'une commande (retour acheteur ou webhook) — idempotent. */
@Injectable()
export class ApplyOrderPaymentUseCase {
  private readonly logger = new Logger(ApplyOrderPaymentUseCase.name);

  constructor(
    @Inject(ORDER_REPOSITORY) private readonly orders: OrderRepository,
    @Inject(PRODUCT_REPOSITORY) private readonly products: ProductRepository,
    @Inject(PAYMENT_GATEWAY) private readonly gateway: PaymentGateway,
    @Inject(MEMBERSHIP_REPOSITORY) private readonly memberships: MembershipRepository,
    private readonly mailer: Mailer,
  ) {}

  async execute(txRef: string): Promise<'applied' | 'ignored' | 'failed'> {
    const order = await this.orders.findByTxRef(txRef);
    if (!order) {
      this.logger.warn(`commande inconnue pour ${txRef}`);
      return 'ignored';
    }
    if (order.status !== 'pending_payment') return 'ignored';

    const verified = await this.gateway.verifyByReference(txRef);
    if (verified.status !== 'successful') return verified.status === 'failed' ? 'failed' : 'ignored';
    if (verified.amount > 0 && verified.amount < order.total) {
      this.logger.warn(`sous-paiement pour ${txRef} (${verified.amount}/${order.total})`);
      return 'failed';
    }

    if (!order.markPaid(verified.providerTxId)) return 'ignored';
    await this.orders.save(order);
    await this.decrementStock(order.shopId, order.lines);
    await this.notifySeller(order);
    this.logger.log(`commande ${order.id} payée (${txRef})`);
    return 'applied';
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

  private async notifySeller(order: {
    shopId: string;
    total: number;
    deliveryFee: number;
    deliveryZoneLabel: string | null;
    currency: string;
    buyerName: string;
    lines: { name: string; qty: number }[];
  }): Promise<void> {
    try {
      const members = await this.memberships.listMembers(order.shopId);
      const to = members.map((m) => m.email).filter(Boolean);
      if (to.length === 0) return;
      const deliveryLine = order.deliveryZoneLabel
        ? `Livraison ${order.deliveryZoneLabel} : ${fmt(order.deliveryFee, order.currency)}`
        : 'Retrait en boutique';
      const { html, text } = renderEmail({
        title: 'Nouvelle commande payée',
        lines: [
          `${order.buyerName} a payé une commande de ${fmt(order.total, order.currency)}.`,
          order.lines.map((l) => `• ${l.qty} × ${l.name}`).join('\n'),
          deliveryLine,
        ],
      });
      await this.mailer.send({
        to,
        subject: `Commande payée — ${fmt(order.total, order.currency)}`,
        text,
        html,
      });
    } catch (err) {
      this.logger.warn(`notification vendeur échouée : ${(err as Error).message}`);
    }
  }
}

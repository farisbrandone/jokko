import { Inject, Injectable, Logger } from '@nestjs/common';
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
import {
  DISCOUNT_CODE_REPOSITORY,
  type DiscountCodeRepository,
} from '../../discounts/domain/ports';
import { ORDER_REPOSITORY, type OrderRepository } from '../domain/ports';
import { OrderWhatsappNotifier } from './order-whatsapp.notifier';

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
    @Inject(DISCOUNT_CODE_REPOSITORY) private readonly discounts: DiscountCodeRepository,
    private readonly mailer: Mailer,
    private readonly whatsapp: OrderWhatsappNotifier,
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
    await this.redeemDiscount(order.shopId, order.discountCode);
    await this.notifySeller(order);
    void this.whatsapp.orderPaid(order.toSnapshot());
    this.logger.log(`commande ${order.id} payée (${txRef})`);
    return 'applied';
  }

  private async redeemDiscount(shopId: string, code: string | null): Promise<void> {
    if (!code) return;
    try {
      const discount = await this.discounts.findByShopAndCode(shopId, code);
      if (!discount) return;
      discount.redeem();
      await this.discounts.save(discount);
    } catch (err) {
      this.logger.warn(`incrément d'usage du code ${code} échoué : ${(err as Error).message}`);
    }
  }

  private async decrementStock(
    shopId: string,
    lines: { productId: string; variantId?: string | null; qty: number }[],
  ): Promise<void> {
    for (const line of lines) {
      const product = await this.products.findById(shopId, line.productId);
      if (!product) continue;
      const res = product.adjustStock(-line.qty, line.variantId ?? null);
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

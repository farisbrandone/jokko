import { randomBytes } from 'node:crypto';
import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { CreateOrderInput, OrderCheckout, OrderLine } from '@jokko/contracts';
import { ConfigService } from '@nestjs/config';
import type { AppConfig } from '../../../config/configuration';
import {
  PRODUCT_REPOSITORY,
  type ProductRepository,
} from '../../catalog/domain/ports/product.repository';
import { PAYMENT_GATEWAY, type PaymentGateway } from '../../billing/domain/ports';
import { Order } from '../domain/order.aggregate';
import { ORDER_REPOSITORY, type OrderRepository } from '../domain/ports';

@Injectable()
export class PlaceOrderUseCase {
  private readonly rootDomain: string;

  constructor(
    config: ConfigService<AppConfig, true>,
    @Inject(ORDER_REPOSITORY) private readonly orders: OrderRepository,
    @Inject(PRODUCT_REPOSITORY) private readonly products: ProductRepository,
    @Inject(PAYMENT_GATEWAY) private readonly gateway: PaymentGateway,
  ) {
    this.rootDomain = config.get('tenant', { infer: true }).rootDomain;
  }

  private assertReturnUrl(raw: string): string {
    let url: URL;
    try {
      url = new URL(raw);
    } catch {
      throw new BadRequestException('URL de retour invalide');
    }
    if (!/^https?:$/.test(url.protocol)) throw new BadRequestException('URL de retour invalide');
    const host = url.hostname;
    const ok =
      host === this.rootDomain ||
      host.endsWith(`.${this.rootDomain}`) ||
      host.endsWith('.lvh.me') ||
      host === 'localhost';
    if (!ok) throw new BadRequestException('URL de retour hors du domaine de la vitrine');
    return url.toString();
  }

  async execute(shopId: string, input: CreateOrderInput): Promise<OrderCheckout> {
    const returnUrl = this.assertReturnUrl(input.returnUrl);

    const lines: OrderLine[] = [];
    let currency: string | null = null;

    for (const item of input.items) {
      const product = await this.products.findById(shopId, item.productId);
      if (!product) throw new NotFoundException(`Produit introuvable (${item.productId})`);
      const p = product.toSnapshot();
      if (p.status !== 'published') {
        throw new BadRequestException(`« ${p.name} » n'est plus disponible`);
      }
      if (p.stock < item.qty) {
        throw new BadRequestException(`Stock insuffisant pour « ${p.name} »`);
      }
      currency ??= p.price.currency;
      if (p.price.currency !== currency) {
        throw new BadRequestException('Les produits de cette commande ont des devises différentes');
      }
      lines.push({ productId: p.id, name: p.name, unitAmount: p.price.amount, qty: item.qty });
    }

    const { order, token } = Order.create({
      shopId,
      buyerName: input.buyerName,
      buyerPhone: input.buyerPhone,
      buyerEmail: input.buyerEmail,
      note: input.note,
      lines,
      currency: currency!,
    });

    const txRef = `jokko-ord-${randomBytes(12).toString('hex')}`;
    order.attachPaymentRef(txRef);
    await this.orders.save(order);

    const email =
      input.buyerEmail || `${input.buyerPhone.replace(/\D/g, '')}@order.jokko.local`;
    const checkout = await this.gateway.createCheckout({
      txRef,
      amount: order.subtotal,
      currency: order.currency,
      email,
      returnUrl,
      meta: { kind: 'order', orderId: order.id, shopId },
    });

    return { orderId: order.id, buyerToken: token, checkoutUrl: checkout.url };
  }
}

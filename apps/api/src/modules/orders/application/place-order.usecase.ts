import { randomBytes } from 'node:crypto';
import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { CreateOrderInput, OrderCheckout, OrderLine } from '@jokko/contracts';
import { ConfigService } from '@nestjs/config';
import type { AppConfig } from '../../../config/configuration';
import {
  PRODUCT_REPOSITORY,
  type ProductRepository,
} from '../../catalog/domain/ports/product.repository';
import {
  SHOP_REPOSITORY,
  type ShopRepository,
} from '../../shop/domain/ports/shop.repository';
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
    @Inject(SHOP_REPOSITORY) private readonly shops: ShopRepository,
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

  /** Résout les frais + libellé de livraison depuis les zones de la boutique. */
  private async resolveDelivery(
    shopId: string,
    input: CreateOrderInput,
  ): Promise<{ label: string | null; fee: number; address: string | null }> {
    if (input.deliveryMethod === 'pickup') {
      return { label: null, fee: 0, address: null };
    }
    const shop = await this.shops.findById(shopId);
    if (!shop) throw new NotFoundException('Boutique introuvable');
    const zone = shop.deliveryZones.find((z) => z.id === input.deliveryZoneId);
    if (!zone) throw new BadRequestException('Zone de livraison inconnue');
    const address = input.deliveryAddress?.trim();
    if (!address) throw new BadRequestException('Adresse de livraison requise');
    return { label: zone.label, fee: zone.fee, address };
  }

  async execute(shopId: string, input: CreateOrderInput): Promise<OrderCheckout> {
    const returnUrl = this.assertReturnUrl(input.returnUrl);
    const delivery = await this.resolveDelivery(shopId, input);

    const lines: OrderLine[] = [];
    let currency: string | null = null;

    for (const item of input.items) {
      const product = await this.products.findById(shopId, item.productId);
      if (!product) throw new NotFoundException(`Produit introuvable (${item.productId})`);
      const p = product.toSnapshot();
      if (p.status !== 'published') {
        throw new BadRequestException(`« ${p.name} » n'est plus disponible`);
      }
      currency ??= p.price.currency;
      if (p.price.currency !== currency) {
        throw new BadRequestException('Les produits de cette commande ont des devises différentes');
      }

      if (p.variants.length > 0) {
        const variant = p.variants.find((v) => v.id === item.variantId);
        if (!variant) {
          throw new BadRequestException(`Choisissez une déclinaison pour « ${p.name} »`);
        }
        if (variant.stock < item.qty) {
          throw new BadRequestException(`Stock insuffisant pour « ${p.name} — ${variant.label} »`);
        }
        lines.push({
          productId: p.id,
          variantId: variant.id ?? null,
          variantLabel: variant.label,
          name: `${p.name} — ${variant.label}`,
          unitAmount: variant.priceAmount ?? p.price.amount,
          qty: item.qty,
        });
      } else {
        if (p.stock < item.qty) {
          throw new BadRequestException(`Stock insuffisant pour « ${p.name} »`);
        }
        lines.push({
          productId: p.id,
          variantId: null,
          variantLabel: null,
          name: p.name,
          unitAmount: p.price.amount,
          qty: item.qty,
        });
      }
    }

    const { order, token } = Order.create({
      shopId,
      buyerName: input.buyerName,
      buyerPhone: input.buyerPhone,
      buyerEmail: input.buyerEmail,
      note: input.note,
      lines,
      currency: currency!,
      paymentMethod: input.paymentMethod,
      deliveryMethod: input.deliveryMethod,
      deliveryZoneLabel: delivery.label,
      deliveryFee: delivery.fee,
      deliveryAddress: delivery.address,
    });

    // Paiement à la livraison : pas de passerelle, la commande entre en « à livrer ».
    if (input.paymentMethod === 'cash_on_delivery') {
      await this.orders.save(order);
      return { orderId: order.id, buyerToken: token, checkoutUrl: null };
    }

    const txRef = `jokko-ord-${randomBytes(12).toString('hex')}`;
    order.attachPaymentRef(txRef);
    await this.orders.save(order);

    const email =
      input.buyerEmail || `${input.buyerPhone.replace(/\D/g, '')}@order.jokko.local`;
    const checkout = await this.gateway.createCheckout({
      txRef,
      amount: order.total,
      currency: order.currency,
      email,
      returnUrl,
      meta: { kind: 'order', orderId: order.id, shopId },
    });

    return { orderId: order.id, buyerToken: token, checkoutUrl: checkout.url };
  }
}

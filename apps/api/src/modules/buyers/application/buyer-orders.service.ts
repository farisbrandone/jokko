import { Injectable, NotFoundException } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import type { BuyerOrder } from '@jokko/contracts';

interface OrderRow {
  id: string;
  status: string;
  buyer_name: string;
  buyer_phone: string;
  buyer_email: string | null;
  note: string | null;
  lines: BuyerOrder['lines'];
  subtotal: number;
  currency: string;
  payment_method: BuyerOrder['paymentMethod'];
  delivery_method: BuyerOrder['deliveryMethod'];
  delivery_zone_label: string | null;
  delivery_fee: number;
  delivery_address: string | null;
  discount_code: string | null;
  discount_amount: number;
  created_at: string | Date;
  paid_at: string | Date | null;
  fulfilled_at: string | Date | null;
  delivered_at: string | Date | null;
  shop_name: string;
  shop_slug: string;
}

const iso = (v: string | Date | null): string | null => (v ? new Date(v).toISOString() : null);

function toDto(r: OrderRow): BuyerOrder {
  return {
    id: r.id,
    status: r.status as BuyerOrder['status'],
    buyerName: r.buyer_name,
    buyerPhone: r.buyer_phone,
    buyerEmail: r.buyer_email,
    note: r.note,
    lines: r.lines,
    subtotal: r.subtotal,
    currency: r.currency,
    paymentMethod: r.payment_method,
    deliveryMethod: r.delivery_method,
    deliveryZoneLabel: r.delivery_zone_label,
    deliveryFee: r.delivery_fee,
    deliveryAddress: r.delivery_address,
    discountCode: r.discount_code,
    discountAmount: r.discount_amount,
    total: Math.max(0, r.subtotal - r.discount_amount + r.delivery_fee),
    createdAt: iso(r.created_at)!,
    paidAt: iso(r.paid_at),
    fulfilledAt: iso(r.fulfilled_at),
    deliveredAt: iso(r.delivered_at),
    shopName: r.shop_name,
    shopSlug: r.shop_slug,
  };
}

const SELECT = `
  select o.id, o.status, o.buyer_name, o.buyer_phone, o.buyer_email, o.note, o.lines,
         o.subtotal, o.currency, o.payment_method, o.delivery_method, o.delivery_zone_label,
         o.delivery_fee, o.delivery_address, o.discount_code, o.discount_amount,
         o.created_at, o.paid_at, o.fulfilled_at, o.delivered_at,
         s.name as shop_name, s.slug as shop_slug
    from orders o
    join shops s on s.id = o.shop_id
`;

/**
 * Historique de commandes d'un acheteur, tous vendeurs confondus — l'identité
 * acheteur (téléphone vérifié par OTP) traverse les boutiques, contrairement
 * aux commandes elles-mêmes qui restent rattachées à une seule boutique.
 * Requêtes brutes : `orders`/`shops` n'ont pas de RLS (filtrage explicite).
 */
@Injectable()
export class BuyerOrdersService {
  constructor(private readonly em: EntityManager) {}

  async listForBuyer(phone: string): Promise<BuyerOrder[]> {
    const rows = (await this.em.execute(
      `${SELECT} where o.buyer_phone = ? order by o.created_at desc limit 100`,
      [phone],
    )) as OrderRow[];
    return rows.map(toDto);
  }

  async getOne(phone: string, orderId: string): Promise<BuyerOrder> {
    const rows = (await this.em.execute(`${SELECT} where o.id = ? and o.buyer_phone = ?`, [
      orderId,
      phone,
    ])) as OrderRow[];
    if (rows.length === 0) throw new NotFoundException('Commande introuvable');
    return toDto(rows[0]);
  }
}

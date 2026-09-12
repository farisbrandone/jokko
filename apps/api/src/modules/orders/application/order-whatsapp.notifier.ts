import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { AppConfig } from '../../../config/configuration';
import {
  SHOP_REPOSITORY,
  type ShopRepository,
} from '../../shop/domain/ports/shop.repository';
import { WHATSAPP_SENDER, type WhatsAppSender } from '../../notifications/domain/ports';
import type { OrderSnapshot } from '../domain/order.aggregate';

const ZERO_DECIMAL = new Set(['XOF', 'XAF', 'JPY', 'KRW', 'CLP', 'VND']);
// XOF/XAF sont vulgairement appelés « FCFA » en Afrique de l'Ouest et
// Centrale — libellé affiché au client plutôt que le code ISO.
const CFA_CODES = new Set(['XOF', 'XAF']);
const money = (amount: number, currency: string): string => {
  const div = ZERO_DECIMAL.has(currency) ? 1 : 100;
  const label = CFA_CODES.has(currency) ? 'FCFA' : currency;
  return `${(amount / div).toLocaleString('fr')} ${label}`;
};

// Échappes Unicode plutôt que les émojis en clair : certains transports/
// pipelines corrompent les caractères multi-octets littéraux et les
// affichent en « ? » côté WhatsApp.
const CART = '\u{1F6D2}'; // 🛒
const BELL = '\u{1F514}'; // 🔔
const CHECK = '\u{2705}'; // ✅
const PACKAGE = '\u{1F4E6}'; // 📦

/**
 * Notifications WhatsApp du cycle de vie d'une commande — acheteur + vendeur.
 * S'appuie sur WHATSAPP_SENDER (Cloud API Meta, Termii, ou « log » selon la
 * configuration). Aucun envoi ne bloque : toute erreur est avalée.
 */
@Injectable()
export class OrderWhatsappNotifier {
  private readonly logger = new Logger(OrderWhatsappNotifier.name);
  private readonly rootDomain: string;

  constructor(
    config: ConfigService<AppConfig, true>,
    @Inject(SHOP_REPOSITORY) private readonly shops: ShopRepository,
    @Inject(WHATSAPP_SENDER) private readonly whatsapp: WhatsAppSender,
  ) {
    this.rootDomain = config.get('tenant', { infer: true }).rootDomain;
  }

  private trackingUrl(slug: string, orderId: string): string {
    const local = /localhost|127\.0\.0\.1|lvh\.me/.test(this.rootDomain);
    return local
      ? `http://${slug}.${this.rootDomain}:3000/commande/${orderId}`
      : `https://${slug}.${this.rootDomain}/commande/${orderId}`;
  }

  private async send(to: string | null | undefined, text: string): Promise<void> {
    if (!to) return;
    try {
      await this.whatsapp.send(to, text);
    } catch (err) {
      this.logger.warn(`WhatsApp commande échoué : ${(err as Error).message}`);
    }
  }

  private async context(o: OrderSnapshot) {
    const shop = await this.shops.findById(o.shopId).catch(() => null);
    const s = shop?.toSnapshot();
    return {
      shopName: s?.name ?? 'la boutique',
      shopWhatsapp: s?.whatsapp ?? null,
      url: s ? this.trackingUrl(s.slug, o.id) : null,
      total: Math.max(0, o.subtotal - o.discountAmount + o.deliveryFee),
      ref: o.id.slice(0, 8).toUpperCase(),
      count: o.lines.reduce((n, l) => n + l.qty, 0),
    };
  }

  /** Commande à la livraison enregistrée (statut `to_deliver`). */
  async orderPlaced(o: OrderSnapshot): Promise<void> {
    const c = await this.context(o);
    await this.send(
      o.buyerPhone,
      `${CART} Commande n°${c.ref} enregistrée chez ${c.shopName}.\n` +
        `À régler à la livraison : ${money(c.total, o.currency)}.` +
        (c.url ? `\nSuivi : ${c.url}` : ''),
    );
    await this.send(
      c.shopWhatsapp,
      `${BELL} Nouvelle commande n°${c.ref} — ${money(c.total, o.currency)} (paiement à la livraison), ` +
        `${c.count} article(s). Client : ${o.buyerName} ${o.buyerPhone}.`,
    );
  }

  /** Commande payée en ligne (statut `paid`). */
  async orderPaid(o: OrderSnapshot): Promise<void> {
    const c = await this.context(o);
    await this.send(
      o.buyerPhone,
      `${CHECK} Commande n°${c.ref} confirmée chez ${c.shopName}.\n` +
        `Total payé : ${money(c.total, o.currency)}.` +
        (c.url ? `\nSuivi : ${c.url}` : ''),
    );
    await this.send(
      c.shopWhatsapp,
      `${BELL} Nouvelle commande n°${c.ref} payée — ${money(c.total, o.currency)}, ` +
        `${c.count} article(s). Client : ${o.buyerName} ${o.buyerPhone}.`,
    );
  }

  /** Commande expédiée / livrée (statut `fulfilled`). */
  async orderFulfilled(o: OrderSnapshot): Promise<void> {
    const c = await this.context(o);
    const verb = o.deliveryZoneLabel ? 'est en cours de livraison' : 'est prête pour le retrait';
    await this.send(
      o.buyerPhone,
      `${PACKAGE} Votre commande n°${c.ref} chez ${c.shopName} ${verb}.` +
        (c.url ? `\nSuivi : ${c.url}` : ''),
    );
  }
}

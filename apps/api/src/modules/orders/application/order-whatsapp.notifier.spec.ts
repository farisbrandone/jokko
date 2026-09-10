import { describe, expect, it, vi } from 'vitest';
import type { ConfigService } from '@nestjs/config';
import type { AppConfig } from '../../../config/configuration';
import type { ShopRepository } from '../../shop/domain/ports/shop.repository';
import type { WhatsAppSender } from '../../notifications/domain/ports';
import type { OrderSnapshot } from '../domain/order.aggregate';
import { OrderWhatsappNotifier } from './order-whatsapp.notifier';

const config = {
  get: () => ({ rootDomain: 'scoliaa.com' }),
} as unknown as ConfigService<AppConfig, true>;

const shopSnap = { name: 'Chez Awa', whatsapp: '+221770000001', slug: 'chez-awa' };
const shops = {
  findById: vi.fn().mockResolvedValue({ toSnapshot: () => shopSnap }),
} as unknown as ShopRepository;

const order: OrderSnapshot = {
  id: 'abcdef12-3456-7890-abcd-ef1234567890',
  shopId: 'shop-1',
  buyerName: 'Fatou',
  buyerPhone: '+221770000002',
  buyerEmail: null,
  note: null,
  lines: [
    {
      productId: 'p1',
      variantId: null,
      variantLabel: null,
      name: 'Sac',
      unitAmount: 15000,
      qty: 2,
    },
  ],
  subtotal: 30000,
  currency: 'XOF',
  status: 'to_deliver',
  paymentMethod: 'cash_on_delivery',
  deliveryMethod: 'delivery',
  deliveryZoneLabel: 'Dakar centre',
  deliveryFee: 1000,
  deliveryAddress: 'Plateau',
  buyerTokenHash: 'h',
  txRef: null,
  providerTxId: null,
  createdAt: new Date().toISOString(),
  paidAt: null,
  fulfilledAt: null,
  deliveredAt: null,
};

describe('OrderWhatsappNotifier', () => {
  it('envoie un message à l\'acheteur et au vendeur quand une commande à la livraison est passée', async () => {
    const send = vi.fn().mockResolvedValue(true);
    const notifier = new OrderWhatsappNotifier(config, shops, { send } as WhatsAppSender);

    await notifier.orderPlaced(order);

    expect(send).toHaveBeenCalledTimes(2);
    const recipients = send.mock.calls.map((c) => c[0]);
    expect(recipients).toContain('+221770000002');
    expect(recipients).toContain('+221770000001');
    const buyerText = send.mock.calls.find((c) => c[0] === '+221770000002')![1] as string;
    expect(buyerText).toContain('ABCDEF12');
    expect(buyerText).toContain('https://chez-awa.scoliaa.com/commande/');
  });

  it('n\'échoue pas si l\'envoi WhatsApp lève', async () => {
    const send = vi.fn().mockRejectedValue(new Error('cloud down'));
    const notifier = new OrderWhatsappNotifier(config, shops, { send } as WhatsAppSender);

    await expect(notifier.orderPaid(order)).resolves.toBeUndefined();
    await expect(notifier.orderFulfilled(order)).resolves.toBeUndefined();
  });

  it('ne fait rien si la boutique n\'a pas de numéro WhatsApp (envoi vendeur ignoré)', async () => {
    const send = vi.fn().mockResolvedValue(true);
    const noWa = {
      findById: vi.fn().mockResolvedValue({
        toSnapshot: () => ({ ...shopSnap, whatsapp: null }),
      }),
    } as unknown as ShopRepository;
    const notifier = new OrderWhatsappNotifier(config, noWa, { send } as WhatsAppSender);

    await notifier.orderPlaced(order);

    expect(send).toHaveBeenCalledTimes(1);
    expect(send.mock.calls[0][0]).toBe('+221770000002');
  });
});

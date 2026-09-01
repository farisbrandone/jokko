import { describe, expect, it } from 'vitest';
import { Subscription } from './subscription.aggregate';

const AT = (iso: string) => new Date(iso);

describe('Subscription', () => {
  it('startTrial fixe la fin de période à +N jours et le statut trialing', () => {
    const s = Subscription.startTrial('shop-1', 14, AT('2026-01-01T00:00:00Z'));
    const snap = s.toSnapshot();
    expect(snap.status).toBe('trialing');
    expect(snap.plan).toBe('trial');
    expect(snap.currentPeriodEnd).toBe('2026-01-15T00:00:00.000Z');
  });

  it('isEntitled : vrai pendant la période, vrai dans la grâce, faux après', () => {
    const s = Subscription.startTrial('shop-1', 0, AT('2026-01-01T00:00:00Z'));
    // fin de période = 2026-01-01, grâce 3 j
    expect(s.isEntitled(3, AT('2026-01-03T00:00:00Z'))).toBe(true);
    expect(s.isEntitled(3, AT('2026-01-05T00:00:00Z'))).toBe(false);
  });

  it('renew prolonge d’un mois à partir de la fin de période si encore active', () => {
    const s = Subscription.startTrial('shop-1', 14, AT('2026-01-01T00:00:00Z')); // fin = 15 jan
    s.renew(1, 'flw-1', AT('2026-01-10T00:00:00Z')); // encore dans la période → cumul
    const snap = s.toSnapshot();
    expect(snap.plan).toBe('pro');
    expect(snap.status).toBe('active');
    expect(snap.currentPeriodEnd).toBe('2026-02-15T00:00:00.000Z');
    expect(snap.providerRef).toBe('flw-1');
  });

  it('renew après expiration repart de maintenant', () => {
    const s = Subscription.startTrial('shop-1', 0, AT('2026-01-01T00:00:00Z'));
    s.renew(1, 'flw-2', AT('2026-03-01T00:00:00Z'));
    expect(s.toSnapshot().currentPeriodEnd).toBe('2026-04-01T00:00:00.000Z');
  });

  it('markPastDue ne touche pas un abonnement annulé', () => {
    const s = Subscription.restore({
      shopId: 'shop-1',
      plan: 'pro',
      status: 'canceled',
      currentPeriodEnd: '2026-01-01T00:00:00.000Z',
      providerRef: null,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    });
    s.markPastDue();
    expect(s.status).toBe('canceled');
  });
});

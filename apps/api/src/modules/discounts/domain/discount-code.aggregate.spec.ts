import { describe, expect, it } from 'vitest';
import { DiscountCode } from './discount-code.aggregate';

const base = { shopId: 's1', code: 'promo10' } as const;

describe('DiscountCode', () => {
  it('normalise le code en MAJUSCULES et borne un pourcentage à 1–90', () => {
    const d = DiscountCode.create({ ...base, kind: 'percent', value: 250 });
    const s = d.toSnapshot();
    expect(s.code).toBe('PROMO10');
    expect(s.value).toBe(90);
    expect(s.active).toBe(true);
    expect(s.redeemedCount).toBe(0);
  });

  it('calcule une remise en pourcentage, bornée au sous-total', () => {
    const d = DiscountCode.create({ ...base, kind: 'percent', value: 10 });
    expect(d.computeDiscount(30_000)).toBe(3_000);
  });

  it('calcule une remise fixe, jamais supérieure au sous-total', () => {
    const d = DiscountCode.create({ ...base, kind: 'fixed', value: 5_000 });
    expect(d.computeDiscount(30_000)).toBe(5_000);
    expect(d.computeDiscount(2_000)).toBe(2_000);
  });

  it('refuse en dessous du sous-total minimum', () => {
    const d = DiscountCode.create({ ...base, kind: 'fixed', value: 1_000, minSubtotal: 10_000 });
    expect(d.rejectionReason(5_000)).toMatch(/à partir de/);
    expect(d.rejectionReason(12_000)).toBeNull();
  });

  it('refuse un code inactif ou expiré', () => {
    const inactive = DiscountCode.create({ ...base, kind: 'percent', value: 10 });
    inactive.setActive(false);
    expect(inactive.rejectionReason(9_999)).toMatch(/actif/);

    const expired = DiscountCode.create({
      ...base,
      kind: 'percent',
      value: 10,
      expiresAt: '2000-01-01T00:00:00.000Z',
    });
    expect(expired.rejectionReason(9_999)).toMatch(/expiré/);
  });

  it('refuse au-delà de la limite d’utilisation', () => {
    const d = DiscountCode.create({ ...base, kind: 'percent', value: 10, maxRedemptions: 2 });
    d.redeem();
    d.redeem();
    expect(d.toSnapshot().redeemedCount).toBe(2);
    expect(d.rejectionReason(9_999)).toMatch(/limite/);
  });
});

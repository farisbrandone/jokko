import { describe, expect, it } from 'vitest';
import { toProductDoc } from './product-index';
import type { ProductSnapshot } from '../../catalog/domain/product.aggregate';

const snap = (over: Partial<ProductSnapshot> = {}): ProductSnapshot => ({
  id: 'p1',
  shopId: 's1',
  slug: 'frigo',
  name: 'Frigo',
  description: '',
  category: 'electronique',
  price: { amount: 250000, currency: 'XOF' },
  compareAtPrice: null,
  stock: 0,
  images: [],
  attributes: {},
  variants: [],
  status: 'published',
  createdAt: '2026-09-01T10:00:00.000Z',
  updatedAt: '2026-09-01T10:00:00.000Z',
  ...over,
});

describe('toProductDoc', () => {
  it('aplatit le prix et dérive inStock', () => {
    const doc = toProductDoc(snap({ stock: 3 }));
    expect(doc.priceAmount).toBe(250000);
    expect(doc.currency).toBe('XOF');
    expect(doc.inStock).toBe(true);
    expect(doc.createdAtTs).toBe(Date.parse('2026-09-01T10:00:00.000Z'));
  });

  it('inStock=false quand stock=0', () => {
    expect(toProductDoc(snap({ stock: 0 })).inStock).toBe(false);
  });
});

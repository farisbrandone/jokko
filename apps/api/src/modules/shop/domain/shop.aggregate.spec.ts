import { describe, expect, it } from 'vitest';
import { Shop } from './shop.aggregate';

describe('Shop (agrégat)', () => {
  it('dérive le slug du nom et émet shop.created', () => {
    const res = Shop.create({
      name: 'Chez Awa Électro',
      verticals: ['electronique'],
      ownerUserId: 'user-1',
    });
    expect(res.isOk).toBe(true);
    const shop = res.unwrap();
    expect(shop.slug).toBe('chez-awa-electro');
    const events = shop.pullDomainEvents();
    expect(events[0].name).toBe('shop.created');
    expect(events[0].payload).toMatchObject({ ownerUserId: 'user-1' });
  });

  it('refuse une boutique sans verticale', () => {
    const res = Shop.create({ name: 'X', verticals: [], ownerUserId: 'u' });
    expect(res.isErr).toBe(true);
  });

  it('applique XOF / fr par défaut', () => {
    const shop = Shop.create({
      name: 'Boutique Test',
      verticals: ['mode-accessoires'],
      ownerUserId: 'u',
    }).unwrap();
    const snap = shop.toSnapshot();
    expect(snap.currency).toBe('XOF');
    expect(snap.locale).toBe('fr');
    expect(snap.status).toBe('active');
  });
});

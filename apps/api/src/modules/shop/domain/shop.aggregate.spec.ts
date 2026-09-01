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
    expect(snap.brandColor).toBeNull();
  });

  it('refuse une couleur de marque invalide à la création', () => {
    const res = Shop.create({
      name: 'Boutique',
      verticals: ['sport'],
      ownerUserId: 'u',
      brandColor: 'rouge',
    });
    expect(res.isErr).toBe(true);
  });

  it('updateProfile met à jour nom, thème et couleur (normalisée)', () => {
    const shop = Shop.create({
      name: 'Ancien',
      verticals: ['sport'],
      ownerUserId: 'u',
    }).unwrap();

    const res = shop.updateProfile({
      name: '  Nouveau nom ',
      themePreset: 'editorial',
      brandColor: '#0EA5E9',
    });
    expect(res.isOk).toBe(true);

    const snap = shop.toSnapshot();
    expect(snap.name).toBe('Nouveau nom');
    expect(snap.themePreset).toBe('editorial');
    expect(snap.brandColor).toBe('#0ea5e9');
  });

  it('updateProfile : brandColor null efface la couleur, hex invalide échoue', () => {
    const shop = Shop.create({
      name: 'Boutique',
      verticals: ['sport'],
      ownerUserId: 'u',
      brandColor: '#123456',
    }).unwrap();

    expect(shop.updateProfile({ brandColor: null }).isOk).toBe(true);
    expect(shop.toSnapshot().brandColor).toBeNull();
    expect(shop.updateProfile({ brandColor: '#12' }).isErr).toBe(true);
  });
});

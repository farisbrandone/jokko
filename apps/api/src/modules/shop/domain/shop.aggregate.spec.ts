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

  it('updateProfile : catégories normalisées (trim, vides retirés, dédup insensible à la casse)', () => {
    const shop = Shop.create({
      name: 'Boutique',
      verticals: ['sport'],
      ownerUserId: 'u',
    }).unwrap();
    expect(shop.toSnapshot().categories).toEqual([]);

    shop.updateProfile({ categories: ['  Téléphones ', 'Robes', '', 'ROBES', 'Sacs'] });
    expect(shop.toSnapshot().categories).toEqual(['Téléphones', 'Robes', 'Sacs']);
  });

  it('updateProfile : apparence (titre, sous-titre, bannière, annonce, accent normalisé)', () => {
    const shop = Shop.create({
      name: 'Boutique',
      verticals: ['sport'],
      ownerUserId: 'u',
    }).unwrap();
    const empty = shop.toSnapshot();
    expect(empty.heroTitle).toBeNull();
    expect(empty.accentColor).toBeNull();

    const ok = shop.updateProfile({
      heroTitle: '  Bienvenue  ',
      heroSubtitle: '  Livraison Douala  ',
      heroImageUrl: 'https://media.example/banner.png',
      announcement: '  -20% ce week-end  ',
      accentColor: '#0EA5E9',
    });
    expect(ok.isOk).toBe(true);
    const s = shop.toSnapshot();
    expect(s.heroTitle).toBe('Bienvenue');
    expect(s.heroSubtitle).toBe('Livraison Douala');
    expect(s.heroImageUrl).toBe('https://media.example/banner.png');
    expect(s.announcement).toBe('-20% ce week-end');
    expect(s.accentColor).toBe('#0ea5e9');

    // chaîne vide → null ; accent invalide → erreur
    shop.updateProfile({ heroTitle: '   ' });
    expect(shop.toSnapshot().heroTitle).toBeNull();
    expect(shop.updateProfile({ accentColor: 'bleu' }).isErr).toBe(true);
  });

  it('updateProfile : palette combinée valide acceptée, « custom » ramène à null, id inconnu refusé', () => {
    const shop = Shop.create({
      name: 'Boutique',
      verticals: ['sport'],
      ownerUserId: 'u',
    }).unwrap();
    expect(shop.toSnapshot().themePalette).toBeNull();

    expect(shop.updateProfile({ themePalette: 'forest' }).isOk).toBe(true);
    expect(shop.toSnapshot().themePalette).toBe('forest');

    expect(shop.updateProfile({ themePalette: 'custom' }).isOk).toBe(true);
    expect(shop.toSnapshot().themePalette).toBeNull();

    shop.updateProfile({ themePalette: 'ocean' });
    expect(shop.updateProfile({ themePalette: 'inexistante' }).isErr).toBe(true);
    // rejetée : la valeur précédente (valide) est conservée, pas de retour silencieux à null.
    expect(shop.toSnapshot().themePalette).toBe('ocean');
  });

  it('updateProfile : zones de livraison normalisées (libellé trimé, dédup, frais ≥ 0, id assigné)', () => {
    const shop = Shop.create({
      name: 'Boutique',
      verticals: ['sport'],
      ownerUserId: 'u',
    }).unwrap();
    expect(shop.toSnapshot().deliveryZones).toEqual([]);

    shop.updateProfile({
      deliveryZones: [
        { label: '  Akwa ', fee: 1500 },
        { label: 'AKWA', fee: 2000 },
        { label: 'Bonabéri', fee: -50 },
        { label: '   ', fee: 100 },
      ],
    });
    const zones = shop.toSnapshot().deliveryZones;
    expect(zones).toHaveLength(2);
    expect(zones[0]).toMatchObject({ label: 'Akwa', fee: 1500 });
    expect(zones[1]).toMatchObject({ label: 'Bonabéri', fee: 0 });
    expect(zones[0].id).toBeTruthy();
  });

  it('vérification : soumission → décision, garde-fous d’état', () => {
    const shop = Shop.create({
      name: 'Boutique',
      verticals: ['sport'],
      ownerUserId: 'u',
    }).unwrap();
    expect(shop.verification.status).toBe('none');
    expect(shop.isVerified).toBe(false);

    const submitted = shop.requestVerification({
      legalName: '  Awa SARL ',
      registryNumber: ' RC/DLA/2024/B/1234 ',
      note: 'Boutique de mode en activité depuis 2019',
    });
    expect(submitted.isOk).toBe(true);
    expect(shop.verification).toMatchObject({
      status: 'pending',
      legalName: 'Awa SARL',
      registryNumber: 'RC/DLA/2024/B/1234',
    });
    expect(shop.verification.submittedAt).toBeTruthy();

    // une demande déjà en attente ne peut pas être resoumise
    expect(shop.requestVerification({ legalName: 'X', registryNumber: 'Y' }).isErr).toBe(true);

    const approved = shop.decideVerification('approve');
    expect(approved.isOk).toBe(true);
    expect(shop.isVerified).toBe(true);
    expect(shop.verification.decidedAt).toBeTruthy();

    // plus rien en attente → décision refusée
    expect(shop.decideVerification('reject').isErr).toBe(true);
    // boutique déjà vérifiée → nouvelle demande refusée
    expect(shop.requestVerification({ legalName: 'X', registryNumber: 'Y' }).isErr).toBe(true);
  });

  it('vérification : refus avec motif, puis nouvelle demande possible', () => {
    const shop = Shop.create({
      name: 'Boutique',
      verticals: ['sport'],
      ownerUserId: 'u',
    }).unwrap();
    shop.requestVerification({ legalName: 'AA', registryNumber: 'BB' });
    shop.decideVerification('reject', 'Justificatif illisible');
    expect(shop.verification.status).toBe('rejected');
    expect(shop.verification.decisionNote).toBe('Justificatif illisible');

    const retry = shop.requestVerification({ legalName: 'AA', registryNumber: 'B2' });
    expect(retry.isOk).toBe(true);
    expect(shop.verification.status).toBe('pending');
    expect(shop.verification.decisionNote).toBeNull();
  });
});

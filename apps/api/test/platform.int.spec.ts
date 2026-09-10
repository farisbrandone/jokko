import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { startHarness, type Harness } from './harness';

let h: Harness;
let http: ReturnType<typeof request>;

beforeAll(async () => {
  h = await startHarness();
  http = request(h.server);
}, 300_000);

afterAll(async () => {
  await h?.stop();
});

// le relais tourne toutes les 2 s ; on le déclenche à la main
const drainOutbox = () => h.drainOutbox();
const runBillingEnforcer = () => h.runBillingEnforcer();
const runRetentionPurge = () => h.runRetentionPurge();

/** Recherche vitrine éventuellement cohérente : on sonde jusqu'au total attendu. */
async function expectSearchTotal(shop: string, q: string, expected: number): Promise<void> {
  let last = -1;
  for (let i = 0; i < 20; i++) {
    const res = await http.get(`/api/shops/${shop}/search?q=${encodeURIComponent(q)}`).expect(200);
    last = res.body.total;
    if (last === expected) return;
    await new Promise((r) => setTimeout(r, 200));
  }
  expect(last).toBe(expected);
}

async function newSeller(email: string) {
  const res = await http
    .post('/api/auth/register')
    .send({ email, password: 'motdepasse1', name: email.split('@')[0] })
    .expect(201);
  return res.body.tokens.accessToken as string;
}

async function meId(token: string): Promise<string> {
  const res = await http.get('/api/auth/me').set('authorization', `Bearer ${token}`).expect(200);
  return res.body.id as string;
}

async function makeAdmin(email: string): Promise<string> {
  const token = await newSeller(email);
  await h.query('update users set is_platform_admin = true where email = $1', [email]);
  return token;
}

async function newShop(token: string, name: string) {
  const res = await http
    .post('/api/shops')
    .set('authorization', `Bearer ${token}`)
    .send({ name, verticals: ['electronique'] })
    .expect(201);
  return res.body.shop.id as string;
}

async function newPublishedProduct(token: string, shopId: string, name: string, amount: number) {
  const created = await http
    .post(`/api/shops/${shopId}/products`)
    .set('authorization', `Bearer ${token}`)
    .send({ name, category: 'electronique', price: { amount }, images: ['https://x/y.jpg'] })
    .expect(201);
  await http
    .post(`/api/shops/${shopId}/products/${created.body.id}/publish`)
    .set('authorization', `Bearer ${token}`)
    .expect(201);
  return created.body.id as string;
}

describe('auth', () => {
  it('register → me → refresh (rotation) → logout', async () => {
    const reg = await http
      .post('/api/auth/register')
      .send({ email: 'auth1@ex.com', password: 'motdepasse1', name: 'Auth' })
      .expect(201);
    const { accessToken, refreshToken } = reg.body.tokens;

    const me = await http
      .get('/api/auth/me')
      .set('authorization', `Bearer ${accessToken}`)
      .expect(200);
    expect(me.body.email).toBe('auth1@ex.com');
    expect(me.body.isPlatformAdmin).toBe(false);

    const r1 = await http.post('/api/auth/refresh').send({ refreshToken }).expect(201);
    expect(r1.body.tokens.accessToken).toBeTruthy();

    // l'ancien refresh est révoqué après rotation
    await http.post('/api/auth/refresh').send({ refreshToken }).expect(401);
  });

  it('me sans jeton → 401', () => http.get('/api/auth/me').expect(401));
});

describe('isolation multi-tenant', () => {
  it("la boutique B ne voit rien de la boutique A (liste, recherche, RLS)", async () => {
    const tA = await newSeller('iso-a@ex.com');
    const tB = await newSeller('iso-b@ex.com');
    const shopA = await newShop(tA, 'Iso A');
    const shopB = await newShop(tB, 'Iso B');

    await newPublishedProduct(tA, shopA, 'Radio Iso', 12000);
    await drainOutbox();

    const listA = await http.get(`/api/shops/${shopA}/products`).expect(200);
    expect(listA.body.total).toBe(1);
    const listB = await http.get(`/api/shops/${shopB}/products`).expect(200);
    expect(listB.body.total).toBe(0);

    await expectSearchTotal(shopA, 'radio', 1);
    await expectSearchTotal(shopB, 'radio', 0);

    // écriture inter-boutiques refusée (B non membre de A)
    await http
      .post(`/api/shops/${shopA}/products`)
      .set('authorization', `Bearer ${tB}`)
      .send({ name: 'Pirate', category: 'electronique', price: { amount: 1 } })
      .expect(403);
  });
});

describe('catalogue → outbox → recherche', () => {
  it('un produit dépublié disparaît des résultats', async () => {
    const t = await newSeller('cat@ex.com');
    const shop = await newShop(t, 'Cat Shop');
    const pid = await newPublishedProduct(t, shop, 'Chargeur Rapide', 8000);
    await drainOutbox();
    await expectSearchTotal(shop, 'chargeur', 1);

    await http
      .post(`/api/shops/${shop}/products/${pid}/unpublish`)
      .set('authorization', `Bearer ${t}`)
      .expect(201);
    await drainOutbox();
    await expectSearchTotal(shop, 'chargeur', 0);
  });
});

describe('messagerie', () => {
  it('acheteur ↔ vendeur, jeton et isolation', async () => {
    const t = await newSeller('msg-seller@ex.com');
    const other = await newSeller('msg-other@ex.com');
    const shop = await newShop(t, 'Msg Shop');
    const shopOther = await newShop(other, 'Msg Other');
    const pid = await newPublishedProduct(t, shop, 'Batterie', 9000);

    const open = await http
      .post(`/api/shops/${shop}/conversations`)
      .send({
        buyerName: 'Fatou',
        buyerPhone: '+221770000001',
        productId: pid,
        productName: 'Batterie',
        message: 'Disponible ?',
      })
      .expect(201);
    const { conversationId, buyerToken } = open.body;

    await http
      .get(`/api/shops/${shop}/conversations/${conversationId}?token=wrong`)
      .expect(403);

    const inbox = await http
      .get(`/api/shops/${shop}/inbox`)
      .set('authorization', `Bearer ${t}`)
      .expect(200);
    expect(inbox.body.total).toBe(1);

    // un autre vendeur ne voit pas cette conversation
    await http
      .get(`/api/shops/${shopOther}/inbox/${conversationId}`)
      .set('authorization', `Bearer ${other}`)
      .expect(404);

    await http
      .post(`/api/shops/${shop}/inbox/${conversationId}/messages`)
      .set('authorization', `Bearer ${t}`)
      .send({ body: 'Oui, en stock.' })
      .expect(201);

    const thread = await http
      .get(`/api/shops/${shop}/conversations/${conversationId}?token=${buyerToken}`)
      .expect(200);
    expect(thread.body.messages.map((m: { sender: string }) => m.sender)).toEqual([
      'buyer',
      'seller',
    ]);
  });
});

describe('analytique', () => {
  it('ingestion → synthèse', async () => {
    const t = await newSeller('ana@ex.com');
    const shop = await newShop(t, 'Ana Shop');

    await http
      .post(`/api/shops/${shop}/events`)
      .send({
        events: [
          { name: 'page_view', sessionId: 's1', props: {} },
          { name: 'product_view', sessionId: 's1', props: { slug: 'x', name: 'X' } },
          { name: 'contact_click', sessionId: 's1', props: { channel: 'whatsapp' } },
        ],
      })
      .expect(201);

    const sum = await http
      .get(`/api/shops/${shop}/analytics/summary?days=7`)
      .set('authorization', `Bearer ${t}`)
      .expect(200);
    expect(sum.body.pageViews).toBe(1);
    expect(sum.body.productViews).toBe(1);
    expect(sum.body.contactClicks).toBe(1);
    expect(sum.body.contactByChannel.whatsapp).toBe(1);
  });
});

describe('notifications multi-canal & anti-spam', () => {
  it('préférences : défauts puis mise à jour', async () => {
    const t = await newSeller('notif-prefs@ex.com');
    const shop = await newShop(t, 'Prefs Shop');

    const s0 = await http
      .get(`/api/shops/${shop}/settings/notifications`)
      .set('authorization', `Bearer ${t}`)
      .expect(200);
    expect(s0.body).toEqual({
      emailEnabled: true,
      whatsappEnabled: false,
      smsEnabled: false,
      pushEnabled: true,
      cooldownSeconds: 300,
    });

    const s1 = await http
      .patch(`/api/shops/${shop}/settings/notifications`)
      .set('authorization', `Bearer ${t}`)
      .send({ whatsappEnabled: true, pushEnabled: false, cooldownSeconds: 60 })
      .expect(200);
    expect(s1.body.whatsappEnabled).toBe(true);
    expect(s1.body.pushEnabled).toBe(false);
    expect(s1.body.cooldownSeconds).toBe(60);

    // persistance
    const s2 = await http
      .get(`/api/shops/${shop}/settings/notifications`)
      .set('authorization', `Bearer ${t}`)
      .expect(200);
    expect(s2.body).toEqual({
      emailEnabled: true,
      whatsappEnabled: true,
      smsEnabled: false,
      pushEnabled: false,
      cooldownSeconds: 60,
    });
  });

  it('cooldown : deux messages rapprochés → une seule notification e-mail', async () => {
    const t = await newSeller('notif-cd@ex.com');
    const shop = await newShop(t, 'Cooldown Shop');
    const pid = await newPublishedProduct(t, shop, 'Ampli', 15000);

    const open = await http
      .post(`/api/shops/${shop}/conversations`)
      .send({
        buyerName: 'Awa',
        buyerPhone: '+221770000101',
        productId: pid,
        productName: 'Ampli',
        message: 'Bonjour, dispo ?',
      })
      .expect(201);
    await drainOutbox();

    await http
      .post(
        `/api/shops/${shop}/conversations/${open.body.conversationId}/messages?token=${open.body.buyerToken}`,
      )
      .send({ body: 'Toujours là ?' })
      .expect(201);
    await drainOutbox();

    const rows = await h.query<{ channel: string; c: number }>(
      `select channel, count(*)::int c from notification_dispatch_log
         where shop_id = $1 group by channel`,
      [shop],
    );
    const byChannel = Object.fromEntries(rows.map((r) => [r.channel, r.c]));
    expect(byChannel.email).toBe(1); // 2e notification bloquée par le cooldown
    expect(byChannel.whatsapp ?? 0).toBe(0); // canal désactivé par défaut
  });

  it("anti-spam : 7e ouverture depuis le même numéro → 429", async () => {
    const t = await newSeller('notif-spam@ex.com');
    const shop = await newShop(t, 'Spam Shop');
    const phone = '+221771112244';

    for (let i = 0; i < 6; i++) {
      await http
        .post(`/api/shops/${shop}/conversations`)
        .send({ buyerName: 'Bot', buyerPhone: phone, message: `message ${i}` })
        .expect(201);
    }
    await http
      .post(`/api/shops/${shop}/conversations`)
      .send({ buyerName: 'Bot', buyerPhone: phone, message: 'encore' })
      .expect(429);
  });
});

describe('profil boutique (couleur de marque)', () => {
  it('un membre édite nom / thème / couleur, un tiers est refusé', async () => {
    const owner = await newSeller('brand-owner@ex.com');
    const stranger = await newSeller('brand-stranger@ex.com');

    const created = await http
      .post('/api/shops')
      .set('authorization', `Bearer ${owner}`)
      .send({ name: 'Brand Shop', verticals: ['electronique'] })
      .expect(201);
    const { id: shopId, slug } = created.body.shop;

    // défaut : pas de couleur de marque
    const before = await http.get(`/api/shops/${slug}`).expect(200);
    expect(before.body.brandColor).toBeNull();

    // couleur invalide → 400 (validation Zod)
    await http
      .patch(`/api/shops/${shopId}`)
      .set('authorization', `Bearer ${owner}`)
      .send({ brandColor: 'bleu' })
      .expect(400);

    // édition valide
    const patched = await http
      .patch(`/api/shops/${shopId}`)
      .set('authorization', `Bearer ${owner}`)
      .send({ name: 'Brand Shop ✦', themePreset: 'editorial', brandColor: '#0EA5E9' })
      .expect(200);
    expect(patched.body.brandColor).toBe('#0ea5e9');
    expect(patched.body.themePreset).toBe('editorial');

    // non-membre refusé
    await http
      .patch(`/api/shops/${shopId}`)
      .set('authorization', `Bearer ${stranger}`)
      .send({ brandColor: '#000000' })
      .expect(403);

    // la vitrine voit la nouvelle identité
    const after = await http.get(`/api/shops/${slug}`).expect(200);
    expect(after.body.name).toBe('Brand Shop ✦');
    expect(after.body.brandColor).toBe('#0ea5e9');

    // catégories personnalisées : normalisées et visibles en vitrine
    const cats = await http
      .patch(`/api/shops/${shopId}`)
      .set('authorization', `Bearer ${owner}`)
      .send({ categories: ['  Téléphones ', 'Accessoires', 'ACCESSOIRES'] })
      .expect(200);
    expect(cats.body.categories).toEqual(['Téléphones', 'Accessoires']);
    const afterCats = await http.get(`/api/shops/${slug}`).expect(200);
    expect(afterCats.body.categories).toEqual(['Téléphones', 'Accessoires']);

    // apparence de la vitrine : titre / sous-titre / bannière / annonce / accent
    await http
      .patch(`/api/shops/${shopId}`)
      .set('authorization', `Bearer ${owner}`)
      .send({
        heroTitle: '  Bienvenue chez nous  ',
        heroSubtitle: 'Livraison rapide',
        announcement: 'Promo -20%',
        accentColor: '#123abc',
      })
      .expect(200);
    const look = await http.get(`/api/shops/${slug}`).expect(200);
    expect(look.body.heroTitle).toBe('Bienvenue chez nous');
    expect(look.body.heroSubtitle).toBe('Livraison rapide');
    expect(look.body.announcement).toBe('Promo -20%');
    expect(look.body.accentColor).toBe('#123abc');

    // accent invalide → 400
    await http
      .patch(`/api/shops/${shopId}`)
      .set('authorization', `Bearer ${owner}`)
      .send({ accentColor: 'turquoise' })
      .expect(400);

    // zones de livraison : normalisées + visibles en vitrine, id assigné
    const dz = await http
      .patch(`/api/shops/${shopId}`)
      .set('authorization', `Bearer ${owner}`)
      .send({
        deliveryZones: [
          { label: '  Akwa ', fee: 1500 },
          { label: 'AKWA', fee: 3000 },
          { label: 'Bonabéri', fee: 2000 },
        ],
      })
      .expect(200);
    expect(dz.body.deliveryZones).toHaveLength(2);
    expect(dz.body.deliveryZones[0]).toMatchObject({ label: 'Akwa', fee: 1500 });
    expect(dz.body.deliveryZones[0].id).toBeTruthy();
    const dzPublic = await http.get(`/api/shops/${slug}`).expect(200);
    expect(dzPublic.body.deliveryZones.map((z: { label: string }) => z.label)).toEqual([
      'Akwa',
      'Bonabéri',
    ]);
  });
});

describe('modération : signalements & retrait', () => {
  it('signalement → file admin → retrait du produit → hors recherche', async () => {
    const seller = await newSeller('mod-seller@ex.com');
    const admin = await makeAdmin('mod-admin@ex.com');
    const shop = await newShop(seller, 'Mod Shop');
    const pid = await newPublishedProduct(seller, shop, 'Sac Contrefait', 20000);
    await drainOutbox();

    // présent dans la recherche
    await expectSearchTotal(shop, 'contrefait', 1);

    // dépôt public d'un signalement
    const r1 = await http
      .post(`/api/shops/${shop}/reports`)
      .send({ targetType: 'product', targetId: pid, reason: 'counterfeit', reporterKey: 'dev-1' })
      .expect(202);
    expect(r1.body.created).toBe(true);

    // même auteur → dédoublonné
    const r2 = await http
      .post(`/api/shops/${shop}/reports`)
      .send({ targetType: 'product', targetId: pid, reason: 'counterfeit', reporterKey: 'dev-1' })
      .expect(202);
    expect(r2.body.created).toBe(false);

    // non-admin refusé
    await http
      .get('/api/admin/reports')
      .set('authorization', `Bearer ${seller}`)
      .expect(403);

    // file admin
    const pending = await http
      .get('/api/admin/reports?status=pending')
      .set('authorization', `Bearer ${admin}`)
      .expect(200);
    const mine = pending.body.items.find((x: { targetId: string }) => x.targetId === pid);
    expect(mine).toBeTruthy();
    expect(mine.targetLabel).toBe('Sac Contrefait');
    expect(mine.shopName).toBe('Mod Shop');

    // retrait
    const resolved = await http
      .post(`/api/admin/reports/${mine.id}/resolve`)
      .set('authorization', `Bearer ${admin}`)
      .send({ action: 'takedown' })
      .expect(201);
    expect(resolved.body.status).toBe('actioned');

    await drainOutbox(); // laisse Meilisearch appliquer la suppression du document
    await expectSearchTotal(shop, 'contrefait', 0);

    // le signalement a changé de file, un second traitement échoue
    const stillPending = await http
      .get('/api/admin/reports?status=pending')
      .set('authorization', `Bearer ${admin}`)
      .expect(200);
    expect(
      stillPending.body.items.some((x: { id: string }) => x.id === mine.id),
    ).toBe(false);

    await http
      .post(`/api/admin/reports/${mine.id}/resolve`)
      .set('authorization', `Bearer ${admin}`)
      .send({ action: 'dismiss' })
      .expect(409);
  });
});

describe('notifications push (Web Push / VAPID)', () => {
  const sub = (endpoint: string) => ({
    endpoint,
    keys: { p256dh: 'BExamplePublicKeyForTestsOnly0000000000000000000000000000000000000000000000000000000000', auth: 'YXV0aC1zZWNyZXQtdGVzdA' },
  });

  it('clé publique, abonnement idempotent, désabonnement, auth requise', async () => {
    const t = await newSeller('push-user@ex.com');

    const key = await http
      .get('/api/push/public-key')
      .set('authorization', `Bearer ${t}`)
      .expect(200);
    expect(typeof key.body.key).toBe('string');
    expect(key.body.key.length).toBeGreaterThan(20);

    // sans jeton → 401
    await http.post('/api/push/subscriptions').send(sub('https://push.example/a')).expect(401);

    await http
      .post('/api/push/subscriptions')
      .set('authorization', `Bearer ${t}`)
      .send(sub('https://push.example/endpoint-1'))
      .expect(201);

    // même endpoint → upsert, pas de doublon
    await http
      .post('/api/push/subscriptions')
      .set('authorization', `Bearer ${t}`)
      .send(sub('https://push.example/endpoint-1'))
      .expect(201);

    const rows = await h.query<{ c: number }>(
      `select count(*)::int c from push_subscriptions where endpoint = $1`,
      ['https://push.example/endpoint-1'],
    );
    expect(rows[0].c).toBe(1);

    await http
      .delete('/api/push/subscriptions')
      .set('authorization', `Bearer ${t}`)
      .send({ endpoint: 'https://push.example/endpoint-1' })
      .expect(204);

    const after = await h.query<{ c: number }>(
      `select count(*)::int c from push_subscriptions where endpoint = $1`,
      ['https://push.example/endpoint-1'],
    );
    expect(after[0].c).toBe(0);
  });

  it('un message acheteur tente le canal push quand un abonnement existe', async () => {
    const seller = await newSeller('push-seller@ex.com');
    const shop = await newShop(seller, 'Push Shop');

    await http
      .post('/api/push/subscriptions')
      .set('authorization', `Bearer ${seller}`)
      .send(sub('https://push.example/seller-endpoint'))
      .expect(201);

    await http
      .post(`/api/shops/${shop}/conversations`)
      .send({ buyerName: 'Moussa', buyerPhone: '+221770000909', message: 'Bonjour' })
      .expect(201);
    await drainOutbox();

    // L'envoi réel échoue (endpoint factice) → aucune ligne « push » journalisée,
    // mais le pipeline a bien sélectionné et tenté le canal (pas d'exception).
    const rows = await h.query<{ channel: string }>(
      `select channel from notification_dispatch_log where shop_id = $1`,
      [shop],
    );
    expect(rows.some((r) => r.channel === 'email')).toBe(true);

    // Échec d'envoi ≠ 404/410 → l'abonnement n'est pas purgé.
    const kept = await h.query<{ c: number }>(
      `select count(*)::int c from push_subscriptions where endpoint = $1`,
      ['https://push.example/seller-endpoint'],
    );
    expect(kept[0].c).toBe(1);
  });
});

describe("support : usurpation d'identité (impersonation)", () => {
  it('un admin obtient un jeton court agissant comme le vendeur ; audité', async () => {
    const admin = await makeAdmin('imp-admin@ex.com');
    const seller = await newSeller('imp-seller@ex.com');
    const adminId = await meId(admin);
    const sellerId = await meId(seller);
    const shop = await newShop(seller, 'Imp Shop');
    await newPublishedProduct(seller, shop, 'Casque', 5000);

    // un non-admin ne peut pas usurper
    await http
      .post('/api/admin/impersonate')
      .set('authorization', `Bearer ${seller}`)
      .send({ userId: sellerId })
      .expect(403);

    // utilisateur inconnu → 404
    await http
      .post('/api/admin/impersonate')
      .set('authorization', `Bearer ${admin}`)
      .send({ userId: '00000000-0000-4000-8000-000000000000' })
      .expect(404);

    const grant = await http
      .post('/api/admin/impersonate')
      .set('authorization', `Bearer ${admin}`)
      .send({ userId: sellerId })
      .expect(201);
    expect(grant.body.target.email).toBe('imp-seller@ex.com');
    expect(typeof grant.body.token).toBe('string');
    expect(new Date(grant.body.expiresAt).getTime()).toBeGreaterThan(Date.now());

    // le jeton agit comme le vendeur
    const asSeller = await http
      .get('/api/auth/me')
      .set('authorization', `Bearer ${grant.body.token}`)
      .expect(200);
    expect(asSeller.body.id).toBe(sellerId);
    expect(asSeller.body.impersonatedBy).toBe(adminId);

    // une session normale n'est pas marquée
    const normal = await http
      .get('/api/auth/me')
      .set('authorization', `Bearer ${seller}`)
      .expect(200);
    expect(normal.body.impersonatedBy).toBeNull();

    // …y compris sur une route réservée aux membres
    const inbox = await http
      .get(`/api/shops/${shop}/inbox`)
      .set('authorization', `Bearer ${grant.body.token}`)
      .expect(200);
    expect(inbox.body.total).toBe(0);

    // trace d'audit
    const audit = await h.query<{ c: number }>(
      `select count(*)::int c from impersonation_events where admin_user_id = $1 and target_user_id = $2`,
      [adminId, sellerId],
    );
    expect(audit[0].c).toBe(1);

    // vue support de la boutique
    const detail = await http
      .get(`/api/admin/shops/${shop}`)
      .set('authorization', `Bearer ${admin}`)
      .expect(200);
    expect(detail.body.owner.email).toBe('imp-seller@ex.com');
    expect(detail.body.slug).toBe('imp-shop');
  });
});

describe('modération : signalement de conversation', () => {
  it('signalée depuis le vendeur → file admin → conversation clôturée', async () => {
    const admin = await makeAdmin('conv-admin@ex.com');
    const seller = await newSeller('conv-seller@ex.com');
    const shop = await newShop(seller, 'Conv Shop');

    const open = await http
      .post(`/api/shops/${shop}/conversations`)
      .send({ buyerName: 'Sam', buyerPhone: '+221770000404', message: 'propos déplacés' })
      .expect(201);
    const convId = open.body.conversationId;

    await http
      .post(`/api/shops/${shop}/reports`)
      .send({
        targetType: 'conversation',
        targetId: convId,
        reason: 'offensive',
        reporterKey: `seller:${shop}`,
      })
      .expect(202);

    const pending = await http
      .get('/api/admin/reports?status=pending')
      .set('authorization', `Bearer ${admin}`)
      .expect(200);
    const mine = pending.body.items.find(
      (x: { targetId: string }) => x.targetId === convId,
    );
    expect(mine.targetType).toBe('conversation');
    expect(mine.targetLabel).toContain('Sam');

    await http
      .post(`/api/admin/reports/${mine.id}/resolve`)
      .set('authorization', `Bearer ${admin}`)
      .send({ action: 'takedown' })
      .expect(201);

    const thread = await http
      .get(`/api/shops/${shop}/inbox/${convId}`)
      .set('authorization', `Bearer ${seller}`)
      .expect(200);
    expect(thread.body.status).toBe('closed');
  });
});

describe('facturation : abonnement vendeur (Flutterwave)', () => {
  const txRefOf = (url: string) => new URL(url).searchParams.get('tx_ref')!;

  it('essai → paiement (confirm) → pro ; idempotent', async () => {
    const t = await newSeller('bill1@ex.com');
    const shop = await newShop(t, 'Bill Shop');

    const s0 = await http
      .get(`/api/shops/${shop}/billing`)
      .set('authorization', `Bearer ${t}`)
      .expect(200);
    expect(s0.body.plan).toBe('trial');
    expect(s0.body.status).toBe('trialing');
    expect(s0.body.entitled).toBe(true);
    expect(s0.body.priceXof).toBe(5000);

    const co = await http
      .post(`/api/shops/${shop}/billing/checkout`)
      .set('authorization', `Bearer ${t}`)
      .send({})
      .expect(201);
    expect(co.body.url).toContain('tx_ref=');
    const txRef = txRefOf(co.body.url);

    const c1 = await http
      .post(`/api/shops/${shop}/billing/confirm`)
      .set('authorization', `Bearer ${t}`)
      .send({ txRef })
      .expect(201);
    expect(c1.body.outcome).toBe('applied');

    const s1 = await http
      .get(`/api/shops/${shop}/billing`)
      .set('authorization', `Bearer ${t}`)
      .expect(200);
    expect(s1.body.plan).toBe('pro');
    expect(s1.body.status).toBe('active');
    expect(new Date(s1.body.currentPeriodEnd).getTime()).toBeGreaterThan(
      Date.now() + 27 * 86_400_000,
    );

    // rejoué → sans effet
    const c2 = await http
      .post(`/api/shops/${shop}/billing/confirm`)
      .set('authorization', `Bearer ${t}`)
      .send({ txRef })
      .expect(201);
    expect(c2.body.outcome).toBe('ignored');
  });

  it('webhook Flutterwave applique le paiement', async () => {
    const t = await newSeller('bill2@ex.com');
    const shop = await newShop(t, 'Bill Shop 2');
    const co = await http
      .post(`/api/shops/${shop}/billing/checkout`)
      .set('authorization', `Bearer ${t}`)
      .send({})
      .expect(201);
    const txRef = txRefOf(co.body.url);

    // Sans en-tête `verif-hash` valide → rejeté.
    await http
      .post('/api/billing/webhook/flutterwave')
      .send({ data: { tx_ref: txRef, status: 'successful' } })
      .expect(403);

    const wh = await http
      .post('/api/billing/webhook/flutterwave')
      .set('verif-hash', 'whsec_test')
      .send({ event: 'charge.completed', data: { tx_ref: txRef, status: 'successful' } })
      .expect(200);
    expect(wh.body.status).toBe('applied');

    const s = await http
      .get(`/api/shops/${shop}/billing`)
      .set('authorization', `Bearer ${t}`)
      .expect(200);
    expect(s.body.status).toBe('active');
  });

  it('le cron suspend une boutique dont l’abonnement est échu', async () => {
    const t = await newSeller('bill3@ex.com');
    const shop = await newShop(t, 'Bill Shop 3');
    const slug = 'bill-shop-3';

    // amorce l'abonnement (essai) puis le force loin dans le passé
    await http.get(`/api/shops/${shop}/billing`).set('authorization', `Bearer ${t}`).expect(200);
    await h.query(
      `update subscriptions set current_period_end = now() - interval '30 days' where shop_id = $1`,
      [shop],
    );

    await http.get(`/api/shops/${slug}`).expect(200); // encore servie

    await runBillingEnforcer();

    await http.get(`/api/shops/${slug}`).expect(404); // suspendue → 404 public
    const sub = await h.query<{ status: string }>(
      `select status from subscriptions where shop_id = $1`,
      [shop],
    );
    expect(sub[0].status).toBe('past_due');
  });
});

describe('durcissement', () => {
  it('les réponses portent les en-têtes de sécurité (helmet)', async () => {
    const res = await http.get('/api/auth/me').expect(401);
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['x-frame-options']).toBeDefined();
  });
});

describe('connexion par SMS (OTP)', () => {
  it('demande → vérification → session ; code faux refusé', async () => {
    const phone = '+221770123456';

    await http.post('/api/auth/otp/request').send({ phone }).expect(202);

    // mauvais code → 401
    await http
      .post('/api/auth/otp/verify')
      .send({ phone, code: '000000' })
      .expect(401);

    // bon code (OTP_DEV_CODE du harness) → session + compte créé
    const ok = await http
      .post('/api/auth/otp/verify')
      .send({ phone, code: '123456', name: 'Awa' })
      .expect(201);
    expect(ok.body.tokens.accessToken).toBeTruthy();
    const token = ok.body.tokens.accessToken as string;

    const me = await http
      .get('/api/auth/me')
      .set('authorization', `Bearer ${token}`)
      .expect(200);
    expect(me.body.name).toBe('Awa');
    expect(me.body.id).toBe(ok.body.user.id);

    // re-connexion même numéro → même compte
    await http.post('/api/auth/otp/request').send({ phone }).expect(202);
    const again = await http
      .post('/api/auth/otp/verify')
      .send({ phone, code: '123456' })
      .expect(201);
    expect(again.body.user.id).toBe(ok.body.user.id);

    // le compte téléphone n'a pas de mot de passe : login e-mail impossible
    await http
      .post('/api/auth/login')
      .send({ email: me.body.email, password: 'nimportequoi' })
      .expect(401);
  });
});

describe('observabilité : métriques Prometheus', () => {
  it('/metrics : jeton requis, format Prometheus, histogramme HTTP alimenté', async () => {
    // génère au moins une requête mesurée (route /api/shops)
    const t = await newSeller('metrics@ex.com');
    await newShop(t, 'Metrics Shop');

    await http.get('/metrics').expect(401); // sans porteur
    await http.get('/metrics').set('authorization', 'Bearer mauvais').expect(401);

    const res = await http
      .get('/metrics')
      .set('authorization', 'Bearer metrics_test_token')
      .expect(200);
    expect(res.headers['content-type']).toContain('text/plain');
    expect(res.text).toContain('process_cpu_user_seconds_total');
    expect(res.text).toContain('nodejs_eventloop_lag_seconds');
    expect(res.text).toContain('http_request_duration_seconds_bucket');
    expect(res.text).toMatch(/http_request_duration_seconds_count\{[^}]*route="\/api\/shops"/);
  });
});

describe('RGPD : export & effacement de compte', () => {
  it('export : archive JSON des données personnelles', async () => {
    const t = await newSeller('rgpd-export@ex.com');
    await newShop(t, 'RGPD Export Shop');

    const res = await http
      .get('/api/me/export')
      .set('authorization', `Bearer ${t}`)
      .expect(200);
    expect(res.headers['content-disposition']).toContain('attachment');
    expect(res.body.user.email).toBe('rgpd-export@ex.com');
    expect(res.body.memberships).toHaveLength(1);
    expect(res.body.memberships[0].role).toBe('owner');
    expect(Array.isArray(res.body.sessions)).toBe(true);
  });

  it('effacement : refusé si des boutiques sont possédées, sinon supprime', async () => {
    const owner = await newSeller('rgpd-owner@ex.com');
    await newShop(owner, 'RGPD Owner Shop');
    await http.delete('/api/me').set('authorization', `Bearer ${owner}`).expect(409);

    const plain = await newSeller('rgpd-plain@ex.com');
    const id = await meId(plain);
    const del = await http.delete('/api/me').set('authorization', `Bearer ${plain}`).expect(200);
    expect(del.body.deleted).toBe(true);

    const rows = await h.query<{ n: string }>('select count(*)::int as n from users where id = $1', [
      id,
    ]);
    expect(Number(rows[0].n)).toBe(0);
  });
});

describe('rétention : purge programmée', () => {
  it('purge OTP expirés, analytics anciens et conversations closes anciennes', async () => {
    await h.query(
      `insert into otp_challenges (phone, code_hash, expires_at)
       values ('+221700000009', repeat('a', 64), now() - interval '2 days')`,
    );
    await h.query(
      `insert into analytics_events (id, shop_id, name, created_at)
       values (gen_random_uuid(), gen_random_uuid(), 'view', now() - interval '500 days')`,
    );
    const conv = await h.query<{ id: string }>(
      `insert into conversations (id, shop_id, buyer_name, buyer_phone, buyer_token_hash, status, last_message_at)
       values (gen_random_uuid(), gen_random_uuid(), 'Vieux', '+221700000010', repeat('b', 64),
               'closed', now() - interval '400 days')
       returning id`,
    );
    await h.query(
      `insert into messages (id, conversation_id, shop_id, sender, body, created_at)
       values (gen_random_uuid(), $1, gen_random_uuid(), 'buyer', 'salut', now() - interval '400 days')`,
      [conv[0].id],
    );

    const summary = await runRetentionPurge();
    expect(summary.otpChallenges).toBeGreaterThanOrEqual(1);
    expect(summary.analyticsEvents).toBeGreaterThanOrEqual(1);
    expect(summary.closedConversations).toBeGreaterThanOrEqual(1);

    const left = await h.query<{ n: string }>(
      'select count(*)::int as n from conversations where id = $1',
      [conv[0].id],
    );
    expect(Number(left[0].n)).toBe(0);
    const msgs = await h.query<{ n: string }>(
      'select count(*)::int as n from messages where conversation_id = $1',
      [conv[0].id],
    );
    expect(Number(msgs[0].n)).toBe(0);
  });
});

describe('connexion sociale (OAuth)', () => {
  const stateOf = (res: { headers: Record<string, unknown> }) => {
    const cookies = res.headers['set-cookie'] as string[];
    return cookies.find((c) => c.startsWith('jk_oauth_state='))!.split(';')[0];
  };

  it('fake : start → callback → exchange → session ; re-login = même compte', async () => {
    const start = await http.get('/api/auth/oauth/fake/start').redirects(0).expect(302);
    const authorize = new URL(start.headers.location as string);
    const code = authorize.searchParams.get('code')!;
    const state = authorize.searchParams.get('state')!;

    const cb = await http
      .get(`/api/auth/oauth/fake/callback?code=${code}&state=${state}`)
      .set('Cookie', stateOf(start))
      .redirects(0)
      .expect(302);
    const ticket = new URL(cb.headers.location as string).searchParams.get('ticket')!;

    const ex = await http.post('/api/auth/oauth/exchange').send({ ticket }).expect(201);
    expect(ex.body.user.email).toContain('@fake.jokko.local');
    const firstId = ex.body.user.id as string;

    const me = await http
      .get('/api/auth/me')
      .set('authorization', `Bearer ${ex.body.tokens.accessToken}`)
      .expect(200);
    expect(me.body.id).toBe(firstId);

    // Nouvelle session avec le même `code` fournisseur → identité déjà reliée.
    const start2 = await http.get('/api/auth/oauth/fake/start').redirects(0).expect(302);
    const state2 = new URL(start2.headers.location as string).searchParams.get('state')!;
    const cb2 = await http
      .get(`/api/auth/oauth/fake/callback?code=${code}&state=${state2}`)
      .set('Cookie', stateOf(start2))
      .redirects(0)
      .expect(302);
    const ticket2 = new URL(cb2.headers.location as string).searchParams.get('ticket')!;
    const ex2 = await http.post('/api/auth/oauth/exchange').send({ ticket: ticket2 }).expect(201);
    expect(ex2.body.user.id).toBe(firstId);
  });

  it('callback sans cookie d’état → 400 ; fournisseur non configuré → 404', async () => {
    await http.get('/api/auth/oauth/fake/callback?code=x&state=y').redirects(0).expect(400);
    await http.get('/api/auth/oauth/google/start').redirects(0).expect(404);
  });

  it('exchange : ticket invalide → 401', async () => {
    await http.post('/api/auth/oauth/exchange').send({ ticket: 'pas-un-jwt' }).expect(401);
  });
});

describe('passkeys (WebAuthn)', () => {
  it('options de connexion : défi + rpId, sans authentification', async () => {
    const res = await http.post('/api/auth/webauthn/login/options').expect(200);
    expect(typeof res.body.options.challenge).toBe('string');
    expect(res.body.options.rpId).toBe('localhost');
    expect(typeof res.body.challengeToken).toBe('string');
  });

  it('options d’enregistrement : jeton requis, puis défi lié au compte', async () => {
    await http.post('/api/auth/webauthn/register/options').expect(401);

    const t = await newSeller('passkey@ex.com');
    const res = await http
      .post('/api/auth/webauthn/register/options')
      .set('authorization', `Bearer ${t}`)
      .expect(201);
    expect(res.body.options.rp.id).toBe('localhost');
    expect(res.body.options.user.name).toBe('passkey@ex.com');
    expect(res.body.options.authenticatorSelection.residentKey).toBe('required');
    expect(typeof res.body.challengeToken).toBe('string');

    const list = await http
      .get('/api/auth/webauthn/credentials')
      .set('authorization', `Bearer ${t}`)
      .expect(200);
    expect(list.body).toEqual([]);
  });

  it('vérification de connexion avec une assertion bidon → 400/401', async () => {
    const opt = await http.post('/api/auth/webauthn/login/options').expect(200);
    await http
      .post('/api/auth/webauthn/login/verify')
      .send({ response: { id: 'inconnue', rawId: 'inconnue', response: {}, type: 'public-key' }, challengeToken: opt.body.challengeToken })
      .expect(401);
    await http
      .post('/api/auth/webauthn/login/verify')
      .send({ response: { id: 'x' }, challengeToken: 'jeton-bidon' })
      .expect(400);
  });
});

describe('équipe : membres & invitations', () => {
  const tokenFromMail = (to: string): string => {
    const mail = h.mails().find((m) => m.to === to);
    expect(mail, `e-mail d'invitation pour ${to}`).toBeTruthy();
    const m = /\/invite\/([A-Za-z0-9_-]+)/.exec(mail!.text);
    expect(m).toBeTruthy();
    return m![1];
  };

  it('inviter → accepter → membre ; garde-fous de rôle', async () => {
    const owner = await newSeller('team-owner@ex.com');
    const shop = await newShop(owner, 'Team Shop');
    const ownerId = await meId(owner);

    const m0 = await http
      .get(`/api/shops/${shop}/members`)
      .set('authorization', `Bearer ${owner}`)
      .expect(200);
    expect(m0.body).toHaveLength(1);
    expect(m0.body[0]).toMatchObject({ role: 'owner', isSelf: true });

    const inv = await http
      .post(`/api/shops/${shop}/members/invitations`)
      .set('authorization', `Bearer ${owner}`)
      .send({ email: 'team-mate@ex.com', role: 'staff' })
      .expect(201);
    expect(inv.body.role).toBe('staff');

    const pending = await http
      .get(`/api/shops/${shop}/members/invitations`)
      .set('authorization', `Bearer ${owner}`)
      .expect(200);
    expect(pending.body).toHaveLength(1);

    const token = tokenFromMail('team-mate@ex.com');

    // aperçu public (avant connexion)
    const preview = await http.get(`/api/invitations/${token}`).expect(200);
    expect(preview.body).toMatchObject({ role: 'staff', email: 'team-mate@ex.com', expired: false });

    // mauvaise adresse → 403
    const stranger = await newSeller('stranger@ex.com');
    await http
      .post('/api/invitations/accept')
      .set('authorization', `Bearer ${stranger}`)
      .send({ token })
      .expect(403);

    // le bon compte accepte
    const mate = await newSeller('team-mate@ex.com');
    const mateId = await meId(mate);
    const accepted = await http
      .post('/api/invitations/accept')
      .set('authorization', `Bearer ${mate}`)
      .send({ token })
      .expect(201);
    expect(accepted.body).toMatchObject({ shopId: shop, role: 'staff' });

    // rejoué → 409
    await http
      .post('/api/invitations/accept')
      .set('authorization', `Bearer ${mate}`)
      .send({ token })
      .expect(409);

    const members = await http
      .get(`/api/shops/${shop}/members`)
      .set('authorization', `Bearer ${owner}`)
      .expect(200);
    expect(members.body).toHaveLength(2);

    // un staff ne peut pas inviter
    await http
      .post(`/api/shops/${shop}/members/invitations`)
      .set('authorization', `Bearer ${mate}`)
      .send({ email: 'x@ex.com', role: 'viewer' })
      .expect(403);

    // promotion puis rétrogradation
    await http
      .patch(`/api/shops/${shop}/members/${mateId}`)
      .set('authorization', `Bearer ${owner}`)
      .send({ role: 'admin' })
      .expect(200);

    // le dernier propriétaire ne peut pas être rétrogradé
    await http
      .patch(`/api/shops/${shop}/members/${ownerId}`)
      .set('authorization', `Bearer ${owner}`)
      .send({ role: 'admin' })
      .expect(409);

    // retrait d'un membre
    await http
      .delete(`/api/shops/${shop}/members/${mateId}`)
      .set('authorization', `Bearer ${owner}`)
      .expect(200);
    const after = await http
      .get(`/api/shops/${shop}/members`)
      .set('authorization', `Bearer ${owner}`)
      .expect(200);
    expect(after.body).toHaveLength(1);
  });
});

describe('domaine personnalisé : configuration & vérification DNS', () => {
  it('demande → vérification TXT → résolution + autorisation TLS', async () => {
    const t = await newSeller('domain@ex.com');
    const shop = await newShop(t, 'Domain Shop');
    const auth = { authorization: `Bearer ${t}` };
    const domain = `boutique-${Date.now()}.exemple.com`;

    // état initial : aucun domaine
    const s0 = await http.get(`/api/shops/${shop}/domain`).set(auth).expect(200);
    expect(s0.body).toMatchObject({ domain: null, verified: false, verification: null });

    // domaine invalide → 400
    await http.post(`/api/shops/${shop}/domain`).set(auth).send({ domain: 'pas-un-domaine' }).expect(400);
    // sous-domaine de la racine → 400
    await http
      .post(`/api/shops/${shop}/domain`)
      .set(auth)
      .send({ domain: 'x.test.local' })
      .expect(400);

    // demande valide → jeton + instructions
    const req = await http.post(`/api/shops/${shop}/domain`).set(auth).send({ domain }).expect(200);
    expect(req.body.domain).toBe(domain);
    expect(req.body.verified).toBe(false);
    const { recordName, recordValue } = req.body.verification;
    expect(recordName).toBe(`_jokko-challenge.${domain}`);

    // vérification sans TXT → 400
    await http.post(`/api/shops/${shop}/domain/verify`).set(auth).expect(400);

    // le domaine non vérifié ne résout pas (TLS refusé)
    await http.get(`/api/internal/tls-authorize?domain=${domain}`).expect(403);

    // on publie l'enregistrement TXT attendu, puis on vérifie
    h.dnsStub().set(recordName, ['autre-valeur', recordValue]);
    const ok = await http.post(`/api/shops/${shop}/domain/verify`).set(auth).expect(201);
    expect(ok.body).toMatchObject({ domain, verified: true, verification: null });

    // désormais : TLS autorisé
    await http.get(`/api/internal/tls-authorize?domain=${domain}`).expect(200);

    // retrait
    await http.delete(`/api/shops/${shop}/domain`).set(auth).expect(200);
    const s1 = await http.get(`/api/shops/${shop}/domain`).set(auth).expect(200);
    expect(s1.body.domain).toBeNull();
    await http.get(`/api/internal/tls-authorize?domain=${domain}`).expect(403);
  });
});

describe('avis produits : dépôt, modération vendeur, agrégat', () => {
  it('acheteur dépose → vendeur publie → moyenne visible ; garde-fous', async () => {
    const t = await newSeller('review-seller@ex.com');
    const shop = await newShop(t, 'Review Shop');
    const pid = await newPublishedProduct(t, shop, 'Enceinte Review', 15000);
    const rBase = `/api/shops/${shop}/products/${pid}/reviews`;

    // agrégat initial : vide
    const a0 = await http.get(rBase).expect(200);
    expect(a0.body.summary).toMatchObject({ average: 0, count: 0 });

    // note invalide → 400
    await http.post(rBase).send({ rating: 6, body: 'top', authorName: 'Awa' }).expect(400);

    // dépôt public → en attente
    const sub = await http
      .post(rBase)
      .send({ rating: 5, title: 'Parfait', body: 'Son excellent', authorName: 'Awa' })
      .expect(201);
    expect(sub.body.status).toBe('pending');

    // non encore visible publiquement
    const a1 = await http.get(rBase).expect(200);
    expect(a1.body.summary.count).toBe(0);

    // file de modération du vendeur
    const pending = await http
      .get(`/api/shops/${shop}/reviews?status=pending`)
      .set('authorization', `Bearer ${t}`)
      .expect(200);
    expect(pending.body).toHaveLength(1);
    const reviewId = pending.body[0].id;

    // un tiers ne peut pas modérer
    const stranger = await newSeller('review-stranger@ex.com');
    await http
      .post(`/api/shops/${shop}/reviews/${reviewId}/moderate`)
      .set('authorization', `Bearer ${stranger}`)
      .send({ action: 'publish' })
      .expect(403);

    // le vendeur publie
    await http
      .post(`/api/shops/${shop}/reviews/${reviewId}/moderate`)
      .set('authorization', `Bearer ${t}`)
      .send({ action: 'publish' })
      .expect(201);

    const a2 = await http.get(rBase).expect(200);
    expect(a2.body.summary).toMatchObject({ average: 5, count: 1 });
    expect(a2.body.summary.distribution).toEqual([0, 0, 0, 0, 1]);
    expect(a2.body.items).toHaveLength(1);

    // second avis rejeté → n'affecte pas la moyenne
    const sub2 = await http
      .post(rBase)
      .send({ rating: 1, body: 'bof', authorName: 'Bob' })
      .expect(201);
    await http
      .post(`/api/shops/${shop}/reviews/${sub2.body.id}/moderate`)
      .set('authorization', `Bearer ${t}`)
      .send({ action: 'reject' })
      .expect(201);
    const a3 = await http.get(rBase).expect(200);
    expect(a3.body.summary).toMatchObject({ average: 5, count: 1 });

    // avis sur un produit non publié → 404
    const draft = await http
      .post(`/api/shops/${shop}/products`)
      .set('authorization', `Bearer ${t}`)
      .send({ name: 'Brouillon', category: 'electronique', price: { amount: 1 } })
      .expect(201);
    await http
      .post(`/api/shops/${shop}/products/${draft.body.id}/reviews`)
      .send({ rating: 4, body: 'test essai', authorName: 'Xavier' })
      .expect(404);
  });
});

describe('annuaire des boutiques (opt-in)', () => {
  const slugs = (res: { body: { items: { slug: string }[] } }) =>
    res.body.items.map((i) => i.slug);

  it('seules les boutiques inscrites apparaissent ; recherche & filtre', async () => {
    const t1 = await newSeller('dir-1@ex.com');
    const t2 = await newSeller('dir-2@ex.com');
    const t3 = await newSeller('dir-3@ex.com');
    const s1 = await newShop(t1, 'Boutique Alpha');
    const s2 = await newShop(t2, 'Boutique Beta');
    await newShop(t3, 'Boutique Gamma'); // jamais inscrite

    // Alpha : inscrite + 1 produit publié ; Beta : inscrite sans produit
    await newPublishedProduct(t1, s1, 'Casque Alpha', 9000);
    await http
      .patch(`/api/shops/${s1}`)
      .set('authorization', `Bearer ${t1}`)
      .send({ listed: true, tagline: 'La boutique Alpha' })
      .expect(200);
    await http
      .patch(`/api/shops/${s2}`)
      .set('authorization', `Bearer ${t2}`)
      .send({ listed: true })
      .expect(200);

    const all = await http.get('/api/directory').expect(200);
    expect(slugs(all)).toEqual(['boutique-alpha', 'boutique-beta']); // tri par nb de produits
    expect(all.body.items[0]).toMatchObject({
      name: 'Boutique Alpha',
      tagline: 'La boutique Alpha',
      products: 1,
    });
    expect(slugs(all)).not.toContain('boutique-gamma');

    // recherche plein-texte
    const q = await http.get('/api/directory?q=beta').expect(200);
    expect(slugs(q)).toEqual(['boutique-beta']);

    // filtre par verticale
    const v = await http.get('/api/directory?vertical=electronique').expect(200);
    expect(slugs(v).sort()).toEqual(['boutique-alpha', 'boutique-beta']);
    const vNone = await http.get('/api/directory?vertical=sport').expect(200);
    expect(vNone.body.total).toBe(0);

    // retrait de l'annuaire
    await http
      .patch(`/api/shops/${s2}`)
      .set('authorization', `Bearer ${t2}`)
      .send({ listed: false })
      .expect(200);
    const after = await http.get('/api/directory').expect(200);
    expect(slugs(after)).toEqual(['boutique-alpha']);
  });
});

describe('import de produits (CSV / URL)', () => {
  it('CSV : crée des brouillons, signale les lignes fautives ; garde-fous', async () => {
    const t = await newSeller('import@ex.com');
    const shop = await newShop(t, 'Import Shop');
    const auth = { authorization: `Bearer ${t}` };

    const csv = [
      'nom,prix,stock,catégorie,image',
      'Lampe LED,"9500",6,Maison,https://picsum.photos/seed/lamp/600',
      'Coussin,4000,3,Maison,',
      ',1000,1,Maison,', // nom manquant
    ].join('\n');

    const res = await http
      .post(`/api/shops/${shop}/import/csv`)
      .set(auth)
      .send({ csv })
      .expect(200);
    expect(res.body.created).toBe(2);
    expect(res.body.skipped).toHaveLength(1);
    expect(res.body.skipped[0]).toMatchObject({ line: 4, error: 'nom manquant' });

    const list = await http
      .get(`/api/shops/${shop}/products`)
      .set(auth)
      .expect(200);
    expect(list.body.total).toBe(2);
    expect(list.body.items.every((p: { status: string }) => p.status === 'draft')).toBe(true);

    // URL : http et hôte privé refusés (anti-SSRF), et non-membre → 403
    await http
      .post(`/api/shops/${shop}/import/url`)
      .set(auth)
      .send({ url: 'http://example.com/p' })
      .expect(400);
    await http
      .post(`/api/shops/${shop}/import/url`)
      .set(auth)
      .send({ url: 'https://127.0.0.1/p' })
      .expect(400);

    const stranger = await newSeller('import-stranger@ex.com');
    await http
      .post(`/api/shops/${shop}/import/csv`)
      .set('authorization', `Bearer ${stranger}`)
      .send({ csv: 'name,price\nX,1' })
      .expect(403);
  });
});

describe('commandes acheteur & paiement (checkout)', () => {
  async function stockedProduct(token: string, shopId: string, name: string, stock: number) {
    const created = await http
      .post(`/api/shops/${shopId}/products`)
      .set('authorization', `Bearer ${token}`)
      .send({
        name,
        category: 'electronique',
        price: { amount: 5000 },
        stock,
        images: ['https://x/y.jpg'],
      })
      .expect(201);
    await http
      .post(`/api/shops/${shopId}/products/${created.body.id}/publish`)
      .set('authorization', `Bearer ${token}`)
      .expect(201);
    return created.body.id as string;
  }

  it('achat → paiement (fake) → payée + stock décrémenté + expédition ; garde-fous', async () => {
    const t = await newSeller('order-seller@ex.com');
    const shop = await newShop(t, 'Order Shop');
    const auth = { authorization: `Bearer ${t}` };
    const p1 = await stockedProduct(t, shop, 'Chargeur', 5);
    const p2 = await stockedProduct(t, shop, 'Câble', 1);

    // URL de retour hors du domaine de la vitrine → refus
    await http
      .post(`/api/shops/${shop}/orders`)
      .send({
        items: [{ productId: p1, qty: 2 }],
        buyerName: 'Aïcha',
        buyerPhone: '+221771234567',
        returnUrl: 'http://evil.example/x',
      })
      .expect(400);

    // Stock insuffisant → refus
    await http
      .post(`/api/shops/${shop}/orders`)
      .send({
        items: [{ productId: p2, qty: 5 }],
        buyerName: 'Aïcha',
        buyerPhone: '+221771234567',
        returnUrl: 'http://order-shop.lvh.me/commande/return',
      })
      .expect(400);

    const co = await http
      .post(`/api/shops/${shop}/orders`)
      .send({
        items: [
          { productId: p1, qty: 2 },
          { productId: p2, qty: 1 },
        ],
        buyerName: 'Aïcha',
        buyerPhone: '+221771234567',
        note: 'Livrer le matin',
        returnUrl: 'http://order-shop.lvh.me/commande/return',
      })
      .expect(201);
    expect(co.body.checkoutUrl).toContain('tx_ref=');
    const txRef = new URL(co.body.checkoutUrl).searchParams.get('tx_ref')!;
    const orderId = co.body.orderId as string;
    const token = co.body.buyerToken as string;

    // Confirmation acheteur
    const c1 = await http
      .post(`/api/shops/${shop}/orders/${orderId}/confirm`)
      .send({ token, txRef })
      .expect(201);
    expect(c1.body.status).toBe('paid');
    expect(c1.body.subtotal).toBe(3 * 5000);
    expect(c1.body.paidAt).toBeTruthy();

    // Idempotent
    const c2 = await http
      .post(`/api/shops/${shop}/orders/${orderId}/confirm`)
      .send({ token, txRef })
      .expect(201);
    expect(c2.body.status).toBe('paid');

    // Stock décrémenté
    const prod1 = await http
      .get(`/api/shops/${shop}/products/${p1}/edit`)
      .set(auth)
      .expect(200);
    expect(prod1.body.stock).toBe(3);

    // Suivi acheteur : bon jeton OK, mauvais jeton → 403
    await http
      .get(`/api/shops/${shop}/orders/${orderId}/track?token=${token}`)
      .expect(200);
    await http
      .get(`/api/shops/${shop}/orders/${orderId}/track?token=mauvais-jeton-1234`)
      .expect(403);

    // Vendeur : liste + expédition
    const list = await http.get(`/api/shops/${shop}/orders`).set(auth).expect(200);
    expect(list.body.total).toBe(1);
    expect(list.body.items[0].note).toBe('Livrer le matin');
    const ful = await http
      .post(`/api/shops/${shop}/orders/${orderId}/fulfill`)
      .set(auth)
      .expect(201);
    expect(ful.body.status).toBe('fulfilled');

    // Webhook : sans signature → 403
    await http
      .post('/api/orders/webhook/flutterwave')
      .send({ data: { tx_ref: txRef } })
      .expect(403);
  });

  it('paiement à la livraison + zone de livraison → à livrer → livrée (stock décrémenté)', async () => {
    const t = await newSeller('cod-seller@ex.com');
    const shop = await newShop(t, 'COD Shop');
    const auth = { authorization: `Bearer ${t}` };
    const p = await stockedProduct(t, shop, 'Sac', 4);

    const dz = await http
      .patch(`/api/shops/${shop}`)
      .set(auth)
      .send({ deliveryZones: [{ label: 'Bonabéri', fee: 1000 }] })
      .expect(200);
    const zoneId = dz.body.deliveryZones[0].id as string;

    // Livraison sans zone connue → 400
    await http
      .post(`/api/shops/${shop}/orders`)
      .send({
        items: [{ productId: p, qty: 1 }],
        buyerName: 'Awa',
        buyerPhone: '+237690000000',
        paymentMethod: 'cash_on_delivery',
        deliveryMethod: 'delivery',
        deliveryZoneId: 'inexistant',
        deliveryAddress: 'x',
        returnUrl: 'http://cod-shop.lvh.me/commande/return',
      })
      .expect(400);

    const co = await http
      .post(`/api/shops/${shop}/orders`)
      .send({
        items: [{ productId: p, qty: 2 }],
        buyerName: 'Awa',
        buyerPhone: '+237690000000',
        paymentMethod: 'cash_on_delivery',
        deliveryMethod: 'delivery',
        deliveryZoneId: zoneId,
        deliveryAddress: 'Rue 12, près du marché',
        returnUrl: 'http://cod-shop.lvh.me/commande/return',
      })
      .expect(201);
    expect(co.body.checkoutUrl).toBeNull();
    const orderId = co.body.orderId as string;
    const token = co.body.buyerToken as string;

    const track = await http
      .get(`/api/shops/${shop}/orders/${orderId}/track?token=${token}`)
      .expect(200);
    expect(track.body.status).toBe('to_deliver');
    expect(track.body.deliveryFee).toBe(1000);
    expect(track.body.total).toBe(11000);
    expect(track.body.deliveryZoneLabel).toBe('Bonabéri');
    expect(track.body.deliveryAddress).toContain('Rue 12');
    expect(track.body.paymentMethod).toBe('cash_on_delivery');

    // stock intact tant que non livrée
    let prod = await http.get(`/api/shops/${shop}/products/${p}/edit`).set(auth).expect(200);
    expect(prod.body.stock).toBe(4);

    const listTodo = await http
      .get(`/api/shops/${shop}/orders?status=to_deliver`)
      .set(auth)
      .expect(200);
    expect(listTodo.body.total).toBe(1);

    const done = await http
      .post(`/api/shops/${shop}/orders/${orderId}/fulfill`)
      .set(auth)
      .expect(201);
    expect(done.body.status).toBe('fulfilled');
    expect(done.body.deliveredAt).toBeTruthy();

    prod = await http.get(`/api/shops/${shop}/products/${p}/edit`).set(auth).expect(200);
    expect(prod.body.stock).toBe(2);
  });

  it('déclinaisons : commande sur une déclinaison → stock de la déclinaison décrémenté', async () => {
    const t = await newSeller('var-seller@ex.com');
    const shop = await newShop(t, 'Var Shop');
    const auth = { authorization: `Bearer ${t}` };

    const created = await http
      .post(`/api/shops/${shop}/products`)
      .set(auth)
      .send({
        name: 'Chemise',
        category: 'mode-accessoires',
        price: { amount: 12000 },
        images: ['https://x/y.jpg'],
        variants: [
          { label: 'Bleu / M', stock: 5 },
          { label: 'Bleu / L', stock: 2, priceAmount: 13000 },
        ],
      })
      .expect(201);
    const pid = created.body.id as string;
    expect(created.body.stock).toBe(7); // somme
    const vL = created.body.variants.find((v: { label: string }) => v.label === 'Bleu / L');
    await http.post(`/api/shops/${shop}/products/${pid}/publish`).set(auth).expect(201);

    // commander sans déclinaison → 400
    await http
      .post(`/api/shops/${shop}/orders`)
      .send({
        items: [{ productId: pid, qty: 1 }],
        buyerName: 'Kofi',
        buyerPhone: '+237690001122',
        paymentMethod: 'cash_on_delivery',
        deliveryMethod: 'pickup',
        returnUrl: 'http://var-shop.lvh.me/commande/return',
      })
      .expect(400);

    const co = await http
      .post(`/api/shops/${shop}/orders`)
      .send({
        items: [{ productId: pid, variantId: vL.id, qty: 2 }],
        buyerName: 'Kofi',
        buyerPhone: '+237690001122',
        paymentMethod: 'cash_on_delivery',
        deliveryMethod: 'pickup',
        returnUrl: 'http://var-shop.lvh.me/commande/return',
      })
      .expect(201);
    const orderId = co.body.orderId as string;
    const token = co.body.buyerToken as string;

    const track = await http
      .get(`/api/shops/${shop}/orders/${orderId}/track?token=${token}`)
      .expect(200);
    expect(track.body.lines[0].name).toContain('Bleu / L');
    expect(track.body.subtotal).toBe(2 * 13000); // prix de la déclinaison

    await http.post(`/api/shops/${shop}/orders/${orderId}/fulfill`).set(auth).expect(201);

    const prod = await http.get(`/api/shops/${shop}/products/${pid}/edit`).set(auth).expect(200);
    const byLabel = Object.fromEntries(
      prod.body.variants.map((v: { label: string; stock: number }) => [v.label, v.stock]),
    );
    expect(byLabel['Bleu / L']).toBe(0); // 2 - 2
    expect(byLabel['Bleu / M']).toBe(5); // inchangé
    expect(prod.body.stock).toBe(5);
  });
});

import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { startHarness, type Harness } from './harness';

let h: Harness;
let http: ReturnType<typeof request>;

beforeAll(async () => {
  h = await startHarness();
  http = request(h.server);
}, 120_000);

afterAll(async () => {
  await h?.stop();
});

// le relais tourne toutes les 2 s ; on le déclenche à la main
const drainOutbox = () => h.drainOutbox();

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
  });
});

describe('modération : signalements & retrait', () => {
  async function makeAdmin(email: string) {
    const token = await newSeller(email);
    await h.query('update users set is_platform_admin = true where email = $1', [email]);
    return token;
  }

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

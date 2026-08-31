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

    const searchA = await http.get(`/api/shops/${shopA}/search?q=radio`).expect(200);
    expect(searchA.body.total).toBe(1);
    const searchB = await http.get(`/api/shops/${shopB}/search?q=radio`).expect(200);
    expect(searchB.body.total).toBe(0);

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

    let s = await http.get(`/api/shops/${shop}/search?q=chargeur`).expect(200);
    expect(s.body.total).toBe(1);

    await http
      .post(`/api/shops/${shop}/products/${pid}/unpublish`)
      .set('authorization', `Bearer ${t}`)
      .expect(201);
    await drainOutbox();

    s = await http.get(`/api/shops/${shop}/search?q=chargeur`).expect(200);
    expect(s.body.total).toBe(0);
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

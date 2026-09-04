/**
 * Données de démonstration pour tester en local.
 *   pnpm --filter @jokko/api run seed
 * Prérequis : l'API doit tourner (pnpm dev:api ou pnpm dev).
 * Crée un vendeur, une boutique publiée et quelques produits, puis affiche
 * les identifiants et les URLs à ouvrir.
 */
const API = process.env.SEED_API_URL ?? 'http://localhost:3333/api';
const ROOT = process.env.SHOP_ROOT_DOMAIN ?? 'lvh.me';

const EMAIL = process.env.SEED_EMAIL ?? 'demo@jokko.test';
const PASSWORD = process.env.SEED_PASSWORD ?? 'motdepasse1';

async function call<T>(
  path: string,
  init: RequestInit & { token?: string } = {},
): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: {
      // Fastify refuse un corps vide avec content-type JSON.
      ...(init.body ? { 'content-type': 'application/json' } : {}),
      ...(init.token ? { authorization: `Bearer ${init.token}` } : {}),
      ...(init.headers ?? {}),
    },
  });
  const text = await res.text();
  const body = text ? JSON.parse(text) : {};
  if (!res.ok) {
    throw new Error(`${init.method ?? 'GET'} ${path} → ${res.status} ${text}`);
  }
  return body as T;
}

const PRODUCTS = [
  { name: 'Casque Bluetooth ANC', category: 'Audio', amount: 24_900, stock: 12,
    description: 'Réduction de bruit active, 30 h d’autonomie.',
    image: 'https://picsum.photos/seed/casque/800' },
  { name: 'Enceinte portable étanche', category: 'Audio', amount: 18_500, stock: 7,
    description: 'IP67, son 360°, jusqu’à 20 h.',
    image: 'https://picsum.photos/seed/enceinte/800' },
  { name: 'Chargeur rapide 65 W', category: 'Accessoires', amount: 12_000, stock: 30,
    description: 'GaN, 3 ports, charge un ordinateur portable.',
    image: 'https://picsum.photos/seed/chargeur/800' },
  { name: 'Montre connectée sport', category: 'Objets connectés', amount: 39_000, stock: 0,
    description: 'GPS, cardio, 50 m étanche. (Rupture de stock — pour tester)',
    image: 'https://picsum.photos/seed/montre/800' },
];

async function main(): Promise<void> {
  console.log(`→ API : ${API}\n`);

  // 1. Vendeur (register, ou login si déjà créé)
  let token: string;
  try {
    const reg = await call<{ tokens: { accessToken: string } }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email: EMAIL, password: PASSWORD, name: 'Boutique Démo' }),
    });
    token = reg.tokens.accessToken;
    console.log(`✓ Vendeur créé : ${EMAIL} / ${PASSWORD}`);
  } catch {
    const login = await call<{ tokens: { accessToken: string } }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
    });
    token = login.tokens.accessToken;
    console.log(`✓ Vendeur existant réutilisé : ${EMAIL} / ${PASSWORD}`);
  }

  // 2. Boutique (une seule ; si déjà là, on récupère la première)
  const me = await call<{ memberships: { shopId: string; slug: string }[] }>('/auth/me', { token });
  let shop: { id: string; slug: string };
  if (me.memberships.length > 0) {
    shop = { id: me.memberships[0].shopId, slug: me.memberships[0].slug };
    console.log(`✓ Boutique existante : ${shop.slug}`);
  } else {
    const created = await call<{ shop: { id: string; slug: string } }>('/shops', {
      method: 'POST',
      token,
      body: JSON.stringify({
        name: 'La Boutique Démo',
        verticals: ['electronique'],
        whatsapp: '+221771234567',
      }),
    });
    shop = created.shop;
    console.log(`✓ Boutique créée : ${shop.slug}`);
  }

  // 2b. Inscription à l'annuaire public (pour tester la page d'accueil apex)
  try {
    await call(`/shops/${shop.id}`, {
      method: 'PATCH',
      token,
      body: JSON.stringify({ listed: true, tagline: 'Audio & accessoires — livraison Dakar' }),
    });
    console.log('✓ Boutique inscrite à l’annuaire');
  } catch (e) {
    console.log(`  (annuaire ignoré : ${(e as Error).message.slice(0, 60)})`);
  }

  // 3. Produits publiés (idempotent : réutilise les existants)
  const existing = await call<{ items: { id: string; name: string; status: string }[] }>(
    `/shops/${shop.id}/products?pageSize=100`,
    { token },
  );
  for (const p of PRODUCTS) {
    try {
      let prod = existing.items.find((x) => x.name === p.name);
      if (!prod) {
        prod = await call<{ id: string; name: string; status: string }>(
          `/shops/${shop.id}/products`,
          {
            method: 'POST',
            token,
            body: JSON.stringify({
              name: p.name,
              description: p.description,
              category: p.category,
              price: { amount: p.amount, currency: 'XOF' },
              stock: p.stock,
              images: [p.image],
            }),
          },
        );
      }
      if (prod.status !== 'published') {
        await call(`/shops/${shop.id}/products/${prod.id}/publish`, { method: 'POST', token });
      }
      console.log(`  · ${p.name} (${p.amount} XOF, stock ${p.stock}) — publié`);
    } catch (e) {
      console.log(`  · ${p.name} — ignoré (${(e as Error).message.slice(0, 80)})`);
    }
  }

  console.log('\n─────────────────────────────────────────────');
  console.log('À OUVRIR :');
  console.log(`  Vitrine (boutique)   http://${shop.slug}.${ROOT}:3000`);
  console.log(`  Vitrine (annuaire)   http://${ROOT}:3000`);
  console.log('  Back-office vendeur   http://localhost:3001');
  console.log('  Console plateforme    http://localhost:3002');
  console.log('  Mailpit (e-mails)     http://localhost:58025');
  console.log(`\n  Connexion vendeur : ${EMAIL} / ${PASSWORD}`);
  console.log('  L’indexation recherche (Meilisearch) se fait ~2 s après le seed.');
  console.log('─────────────────────────────────────────────');
}

main().catch((e) => {
  console.error('\n✗ Seed échoué :', (e as Error).message);
  console.error('  L’API tourne-t-elle ? (pnpm dev:api ou pnpm dev)');
  process.exit(1);
});

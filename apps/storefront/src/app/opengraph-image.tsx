import { ImageResponse } from 'next/og';
import { currentShop } from '@/lib/shop';
import { searchProducts } from '@/lib/api';

export const runtime = 'nodejs';
export const alt = 'Boutique Jokko';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

/** Carte de partage de la boutique (Facebook / WhatsApp / X / LinkedIn). */
export default async function OgImage() {
  const shop = await currentShop();
  const name = shop?.name ?? 'Jokko';

  let total = 0;
  if (shop) {
    try {
      total = (await searchProducts(shop.id, { pageSize: 1 })).total;
    } catch {
      /* API indisponible : on affiche la carte sans le compteur */
    }
  }

  const verticals = (shop?.verticals ?? [])
    .map((v) => v.replace(/-/g, ' '))
    .slice(0, 3)
    .join('  ·  ');

  return new ImageResponse(
    (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          width: '100%',
          height: '100%',
          padding: 80,
          justifyContent: 'space-between',
          color: '#fff',
          background: 'linear-gradient(135deg, #7c2d12 0%, #c2410c 60%, #ea580c 100%)',
          fontFamily: 'sans-serif',
        }}
      >
        <div style={{ display: 'flex', fontSize: 28, letterSpacing: 3, opacity: 0.85 }}>
          JOKKO · BOUTIQUE
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div style={{ display: 'flex', fontSize: 88, fontWeight: 700, lineHeight: 1.05 }}>
            {name.slice(0, 40)}
          </div>
          {verticals ? (
            <div
              style={{
                display: 'flex',
                fontSize: 34,
                opacity: 0.9,
                textTransform: 'capitalize',
              }}
            >
              {verticals}
            </div>
          ) : null}
        </div>
        <div style={{ display: 'flex', fontSize: 32, opacity: 0.92 }}>
          {total > 0
            ? `${total} produit${total > 1 ? 's' : ''}  ·  Contact direct WhatsApp`
            : 'Toute la gamme, en un lien  ·  Contact direct WhatsApp'}
        </div>
      </div>
    ),
    { ...size },
  );
}

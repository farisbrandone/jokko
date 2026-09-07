import { ImageResponse } from 'next/og';
import { getLocale } from 'next-intl/server';
import { currentShop } from '@/lib/shop';
import { searchProducts } from '@/lib/api';
import { darken } from '@/lib/theme';
import { landingContent } from '@/lib/landing-content';
import type { AppLocale } from '@/i18n/request';

const HEX_RE = /^#[0-9a-f]{6}$/i;

export const runtime = 'nodejs';
export const alt = 'Jokko';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

/** Carte de partage : marketing pour le domaine apex, carte boutique sinon. */
export default async function OgImage() {
  const shop = await currentShop();

  if (!shop) {
    const c = landingContent((await getLocale()) as AppLocale);
    return new ImageResponse(
      (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            width: '100%',
            height: '100%',
            padding: 90,
            justifyContent: 'space-between',
            background: '#fffdf9',
            fontFamily: 'sans-serif',
          }}
        >
          <div style={{ display: 'flex', fontSize: 30, letterSpacing: 4, color: '#c2410c', fontWeight: 700 }}>
            JOKKO
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            <div style={{ display: 'flex', fontSize: 66, fontWeight: 700, color: '#1c1917', lineHeight: 1.12 }}>
              {`${c.hero.title} ${c.hero.highlight}`.slice(0, 80)}
            </div>
            <div style={{ display: 'flex', fontSize: 32, color: '#57534e' }}>{c.hero.reassurance}</div>
          </div>
          <div
            style={{
              display: 'flex',
              alignSelf: 'flex-start',
              background: '#c2410c',
              color: '#fff',
              fontSize: 28,
              fontWeight: 600,
              padding: '16px 32px',
              borderRadius: 14,
            }}
          >
            {c.hero.ctaPrimary}
          </div>
        </div>
      ),
      { ...size },
    );
  }

  let total = 0;
  try {
    total = (await searchProducts(shop.id, { pageSize: 1 })).total;
  } catch {
    /* API indisponible : on affiche la carte sans le compteur */
  }

  const verticals = (shop.verticals ?? [])
    .map((v) => v.replace(/-/g, ' '))
    .slice(0, 3)
    .join('  ·  ');

  const brand = shop.brandColor && HEX_RE.test(shop.brandColor) ? shop.brandColor : null;
  const background = brand
    ? `linear-gradient(135deg, ${darken(brand, 0.42)} 0%, ${brand} 70%, ${darken(brand, -0.18)} 100%)`
    : 'linear-gradient(135deg, #7c2d12 0%, #c2410c 60%, #ea580c 100%)';

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
          background,
          fontFamily: 'sans-serif',
        }}
      >
        <div style={{ display: 'flex', fontSize: 28, letterSpacing: 3, opacity: 0.85 }}>
          JOKKO · BOUTIQUE
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div style={{ display: 'flex', fontSize: 88, fontWeight: 700, lineHeight: 1.05 }}>
            {shop.name.slice(0, 40)}
          </div>
          {verticals ? (
            <div style={{ display: 'flex', fontSize: 34, opacity: 0.9, textTransform: 'capitalize' }}>
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

import { ImageResponse } from 'next/og';
import { currentShop } from '@/lib/shop';
import { brandInk } from '@/lib/theme';

export const size = { width: 512, height: 512 };
export const contentType = 'image/png';

const HEX_RE = /^#[0-9a-f]{6}$/i;

/** Icône de l'app (favicon + PWA) : monogramme de la boutique sur sa couleur. */
export default async function Icon() {
  const shop = await currentShop();
  const brand = shop?.brandColor && HEX_RE.test(shop.brandColor) ? shop.brandColor : '#c2410c';
  const letter = (shop?.name?.trim()?.[0] ?? 'J').toUpperCase();

  return new ImageResponse(
    (
      <div
        style={{
          display: 'flex',
          width: '100%',
          height: '100%',
          alignItems: 'center',
          justifyContent: 'center',
          background: brand,
          color: brandInk(brand),
          fontSize: 300,
          fontWeight: 700,
          fontFamily: 'sans-serif',
        }}
      >
        {letter}
      </div>
    ),
    { ...size },
  );
}

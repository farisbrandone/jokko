import { ImageResponse } from 'next/og';
import { currentShop } from '@/lib/shop';
import { brandInk } from '@/lib/theme';

export const size = { width: 180, height: 180 };
export const contentType = 'image/png';

const HEX_RE = /^#[0-9a-f]{6}$/i;

export default async function AppleIcon() {
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
          fontSize: 110,
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

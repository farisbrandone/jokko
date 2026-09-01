import type { MetadataRoute } from 'next';
import { currentShop } from '@/lib/shop';

const HEX_RE = /^#[0-9a-f]{6}$/i;

/** Manifest PWA propre à la boutique du sous-domaine courant. */
export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const shop = await currentShop();
  const name = shop?.name ?? 'Jokko';
  const brand = shop?.brandColor && HEX_RE.test(shop.brandColor) ? shop.brandColor : '#c2410c';

  return {
    name,
    short_name: name.length > 18 ? name.slice(0, 17) + '…' : name,
    description: shop
      ? `La boutique ${name} — toute la gamme, contact direct.`
      : 'Boutiques sociales Jokko',
    id: '/',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    lang: shop?.locale ?? 'fr',
    theme_color: brand,
    background_color: '#faf8f5',
    icons: [
      { src: '/icon', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icon', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}

import { ImageResponse } from 'next/og';
import { formatMoney } from '@jokko/ui';
import { currentShop } from '@/lib/shop';
import { getProduct } from '@/lib/api';

export const runtime = 'nodejs';
export const alt = 'Produit';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

type Params = { params: Promise<{ slug: string }> };

/** Carte de partage d'un produit : nom, prix, visuel, boutique. */
export default async function OgImage({ params }: Params) {
  const { slug } = await params;
  const shop = await currentShop();
  const shopName = shop?.name ?? 'Jokko';

  let product = null;
  if (shop) {
    try {
      product = await getProduct(shop.id, slug);
    } catch {
      /* produit introuvable : carte de repli boutique */
    }
  }

  if (!product) {
    return new ImageResponse(
      (
        <div
          style={{
            display: 'flex',
            width: '100%',
            height: '100%',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'linear-gradient(135deg, #7c2d12, #ea580c)',
            color: '#fff',
            fontSize: 72,
            fontWeight: 700,
            fontFamily: 'sans-serif',
          }}
        >
          {shopName.slice(0, 40)}
        </div>
      ),
      { ...size },
    );
  }

  const rawImg = product.images[0];
  const img = rawImg
    ? await fetch(rawImg, { method: 'HEAD' })
        .then((r) => (r.ok ? rawImg : null))
        .catch(() => null)
    : null;
  const price = formatMoney(product.price.amount, product.price.currency);

  return new ImageResponse(
    (
      <div style={{ display: 'flex', width: '100%', height: '100%', background: '#ffffff', fontFamily: 'sans-serif' }}>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            width: img ? '56%' : '100%',
            padding: 72,
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', fontSize: 24, letterSpacing: 3, color: '#c2410c' }}>
            {shopName.toUpperCase().slice(0, 32)}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div style={{ display: 'flex', fontSize: 62, fontWeight: 700, color: '#1c1917', lineHeight: 1.1 }}>
              {product.name.slice(0, 90)}
            </div>
            <div style={{ display: 'flex', fontSize: 46, fontWeight: 600, color: '#c2410c' }}>{price}</div>
          </div>
          <div style={{ display: 'flex', fontSize: 26, color: '#78716c' }}>
            {product.stock > 0 ? 'En stock' : 'Sur commande'}  ·  Contact direct WhatsApp
          </div>
        </div>
        {img ? (
          <div style={{ display: 'flex', width: '44%', height: '100%' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={img} alt="" width={528} height={630} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </div>
        ) : null}
      </div>
    ),
    { ...size },
  );
}

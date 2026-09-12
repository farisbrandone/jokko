import { currentShop, siteUrl } from '@/lib/shop';
import { CartCheckout } from '@/components/cart-checkout';
import { ShopUnavailable } from '@/components/shop-unavailable';

export const dynamic = 'force-dynamic';

export default async function CartPage() {
  const shop = await currentShop();
  if (!shop) return <ShopUnavailable />;
  const base = await siteUrl();
  return (
    <CartCheckout
      zones={shop.deliveryZones ?? []}
      currency={shop.currency}
      shopName={shop.name}
      whatsapp={shop.whatsapp}
      siteUrl={base}
    />
  );
}

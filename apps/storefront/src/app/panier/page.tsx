import { currentShop } from '@/lib/shop';
import { CartCheckout } from '@/components/cart-checkout';
import { ShopUnavailable } from '@/components/shop-unavailable';

export const dynamic = 'force-dynamic';

export default async function CartPage() {
  const shop = await currentShop();
  if (!shop) return <ShopUnavailable />;
  return <CartCheckout zones={shop.deliveryZones ?? []} currency={shop.currency} />;
}

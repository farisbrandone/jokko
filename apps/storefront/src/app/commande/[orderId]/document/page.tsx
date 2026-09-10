import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import type { Order } from '@jokko/contracts';
import { OrderDocument } from '@jokko/ui';
import { apiBase } from '@/lib/api';
import { currentShop } from '@/lib/shop';
import { ShopUnavailable } from '@/components/shop-unavailable';
import { PrintButton } from '@/components/print-button';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = { robots: { index: false } };

type Props = {
  params: Promise<{ orderId: string }>;
  searchParams: Promise<{ token?: string; type?: string }>;
};

export default async function OrderDocumentPage({ params, searchParams }: Props) {
  const shop = await currentShop();
  if (!shop) return <ShopUnavailable />;

  const { orderId } = await params;
  const { token, type } = await searchParams;
  if (!token) notFound();

  const res = await fetch(
    `${apiBase}/shops/${shop.id}/orders/${orderId}/track?token=${encodeURIComponent(token)}`,
    { cache: 'no-store' },
  );
  if (!res.ok) notFound();
  const order = (await res.json()) as Order;

  return (
    <div>
      <PrintButton />
      <OrderDocument
        type={type === 'bon' || type === 'delivery' ? 'delivery' : 'invoice'}
        order={{
          id: order.id,
          createdAt: order.createdAt,
          buyerName: order.buyerName,
          buyerPhone: order.buyerPhone,
          buyerEmail: order.buyerEmail,
          lines: order.lines.map((l) => ({ name: l.name, qty: l.qty, unitAmount: l.unitAmount })),
          subtotal: order.subtotal,
          deliveryFee: order.deliveryFee,
          total: order.total,
          currency: order.currency,
          deliveryMethod: order.deliveryMethod,
          deliveryZoneLabel: order.deliveryZoneLabel,
          deliveryAddress: order.deliveryAddress,
          paymentMethod: order.paymentMethod,
          status: order.status,
          note: order.note,
        }}
        shop={{ name: shop.name, tagline: shop.tagline, whatsapp: shop.whatsapp, brandColor: shop.brandColor }}
      />
    </div>
  );
}

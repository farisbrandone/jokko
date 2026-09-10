import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import type { Order } from '@jokko/contracts';
import { OrderDocument } from '@jokko/ui';
import { apiJson, ApiError } from '@/lib/api';
import type { SessionUser, ShopProfile } from '@/lib/types';
import { PrintButton } from '@/components/print-button';

export const dynamic = 'force-dynamic';

type Params = {
  params: Promise<{ shopId: string; orderId: string }>;
  searchParams: Promise<{ type?: string }>;
};

export default async function SellerOrderDocument({ params, searchParams }: Params) {
  const { shopId, orderId } = await params;
  const { type } = await searchParams;

  let me: SessionUser;
  try {
    me = await apiJson<SessionUser>('/auth/me');
  } catch {
    redirect('/login');
  }
  const membership = me.memberships.find((m) => m.shopId === shopId);
  if (!membership) redirect('/');

  let order: Order;
  try {
    order = await apiJson<Order>(`/shops/${shopId}/orders/${orderId}`);
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) notFound();
    throw e;
  }
  const shop = await apiJson<ShopProfile>(`/shops/${membership.slug}`);

  return (
    <div className="min-h-dvh bg-[var(--color-bg)] py-6">
      <div className="no-print mx-auto mb-4 flex max-w-[720px] items-center gap-3 px-8">
        <Link href={`/s/${shopId}/orders`} className="text-sm text-[var(--color-muted)]">
          ← Commandes
        </Link>
        <div className="ml-auto flex gap-2 text-sm">
          <Link
            href={`/s/${shopId}/orders/${orderId}/document?type=invoice`}
            className={`rounded-[var(--radius-btn)] border border-[var(--color-border)] px-3 py-1.5 ${
              type !== 'bon' ? 'bg-[var(--color-surface-2)]' : ''
            }`}
          >
            Facture
          </Link>
          <Link
            href={`/s/${shopId}/orders/${orderId}/document?type=bon`}
            className={`rounded-[var(--radius-btn)] border border-[var(--color-border)] px-3 py-1.5 ${
              type === 'bon' ? 'bg-[var(--color-surface-2)]' : ''
            }`}
          >
            Bon de livraison
          </Link>
          <PrintButton />
        </div>
      </div>

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
        shop={{
          name: shop.name,
          tagline: shop.tagline,
          whatsapp: shop.whatsapp,
          brandColor: shop.brandColor,
        }}
      />
    </div>
  );
}

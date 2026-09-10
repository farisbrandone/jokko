import Link from 'next/link';
import { redirect } from 'next/navigation';
import { apiJson } from '@/lib/api';
import type { DiscountCode, SessionUser } from '@/lib/types';
import { Shell } from '@/components/shell';
import { DiscountCodesManager } from '@/components/discount-codes-manager';

export const dynamic = 'force-dynamic';

type Params = { params: Promise<{ shopId: string }> };

export default async function DiscountsPage({ params }: Params) {
  const { shopId } = await params;

  let me: SessionUser;
  try {
    me = await apiJson<SessionUser>('/auth/me');
  } catch {
    redirect('/login');
  }
  if (!me.memberships.some((m) => m.shopId === shopId)) redirect('/');

  const codes = await apiJson<DiscountCode[]>(`/shops/${shopId}/discounts`).catch(() => []);

  return (
    <Shell email={me.email}>
      <div className="mb-6">
        <Link href={`/s/${shopId}`} className="text-sm text-[var(--color-muted)]">
          ← Boutique
        </Link>
        <h1 className="font-[family-name:var(--font-display)] text-xl font-bold">Codes promo</h1>
        <p className="text-sm text-[var(--color-muted)]">
          Réduction en pourcentage ou montant fixe, appliquée au sous-total du
          panier. Vous pouvez limiter la durée, le nombre d&apos;utilisations et
          exiger un panier minimum.
        </p>
      </div>
      <DiscountCodesManager shopId={shopId} initial={codes} />
    </Shell>
  );
}

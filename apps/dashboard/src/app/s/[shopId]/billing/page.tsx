import Link from 'next/link';
import { redirect } from 'next/navigation';
import { apiJson } from '@/lib/api';
import type { BillingSummary, SessionUser } from '@/lib/types';
import { Shell } from '@/components/shell';
import { BillingCheckout } from '@/components/billing-checkout';

export const dynamic = 'force-dynamic';

type Params = { params: Promise<{ shopId: string }> };

const STATUS_LABEL: Record<BillingSummary['status'], string> = {
  trialing: 'Période d’essai',
  active: 'Actif',
  past_due: 'Paiement en retard',
  canceled: 'Annulé',
};

export default async function BillingPage({ params }: Params) {
  const { shopId } = await params;

  let me: SessionUser;
  try {
    me = await apiJson<SessionUser>('/auth/me');
  } catch {
    redirect('/login');
  }
  if (!me.memberships.some((m) => m.shopId === shopId)) redirect('/');

  const b = await apiJson<BillingSummary>(`/shops/${shopId}/billing`);
  const renew = new Date(b.currentPeriodEnd).toLocaleDateString('fr');

  return (
    <Shell email={me.email}>
      <div className="mb-6">
        <Link href={`/s/${shopId}`} className="text-sm text-[var(--color-muted)]">
          ← Boutique
        </Link>
        <h1 className="font-[family-name:var(--font-display)] text-xl font-bold">Abonnement</h1>
      </div>

      <div className="max-w-lg rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] p-5 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <span className="text-sm text-[var(--color-muted)]">Formule</span>
          <span className="font-medium">{b.plan === 'pro' ? 'Pro' : 'Essai'}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-[var(--color-muted)]">Statut</span>
          <span
            className={`rounded px-2 py-0.5 text-xs ${
              b.entitled
                ? 'bg-[var(--color-brand-soft)] text-[var(--color-brand)]'
                : 'bg-[var(--color-surface-2)] text-[var(--color-danger)]'
            }`}
          >
            {STATUS_LABEL[b.status]}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-[var(--color-muted)]">
            {b.entitled ? 'Prochain renouvellement' : 'Échu le'}
          </span>
          <span className="tabular-nums">{renew}</span>
        </div>

        {!b.entitled ? (
          <p className="text-sm text-[var(--color-danger)]">
            Votre boutique n’est plus visible tant que l’abonnement n’est pas réglé.
          </p>
        ) : null}

        <div className="pt-1">
          <BillingCheckout shopId={shopId} priceXof={b.priceXof} />
        </div>
      </div>
    </Shell>
  );
}

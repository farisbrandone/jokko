import Link from 'next/link';
import { redirect } from 'next/navigation';
import { apiJson } from '@/lib/api';
import type { Dispute, SessionUser } from '@/lib/types';
import { Shell } from '@/components/shell';
import { DisputeRespondForm } from '@/components/dispute-respond-form';

export const dynamic = 'force-dynamic';

const REASON_LABEL: Record<string, string> = {
  not_received: 'Commande non reçue',
  not_as_described: 'Non conforme à la description',
  damaged: 'Article endommagé',
  wrong_item: 'Mauvais article reçu',
  other: 'Autre problème',
};

const STATUS_LABEL: Record<string, string> = {
  open: 'Ouvert',
  seller_responded: 'Répondu',
  resolved: 'Résolu',
  escalated: 'Transmis à Jokko',
  closed: 'Clos par Jokko',
};

const TABS = [
  { value: '', label: 'Tous' },
  { value: 'open', label: 'Ouverts' },
  { value: 'seller_responded', label: 'Répondus' },
  { value: 'escalated', label: 'Transmis' },
  { value: 'resolved', label: 'Résolus' },
  { value: 'closed', label: 'Clos' },
] as const;

type Params = {
  params: Promise<{ shopId: string }>;
  searchParams: Promise<{ status?: string }>;
};

export default async function DisputesPage({ params, searchParams }: Params) {
  const { shopId } = await params;
  const status = (await searchParams).status ?? '';

  let me: SessionUser;
  try {
    me = await apiJson<SessionUser>('/auth/me');
  } catch {
    redirect('/login');
  }
  if (!me.memberships.some((m) => m.shopId === shopId)) redirect('/');

  const disputes = await apiJson<Dispute[]>(
    `/shops/${shopId}/disputes${status ? `?status=${status}` : ''}`,
  );

  return (
    <Shell email={me.email}>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href={`/s/${shopId}`} className="text-sm text-[var(--color-muted)]">
            ← Boutique
          </Link>
          <h1 className="font-[family-name:var(--font-display)] text-xl font-bold">Litiges</h1>
        </div>
        <nav className="flex flex-wrap gap-1 text-sm">
          {TABS.map((t) => (
            <Link
              key={t.value}
              href={`/s/${shopId}/disputes${t.value ? `?status=${t.value}` : ''}`}
              className={`rounded-[var(--radius-btn)] px-2.5 py-1 ${
                status === t.value
                  ? 'bg-[var(--color-brand-soft)] text-[var(--color-brand)]'
                  : 'hover:bg-[var(--color-surface-2)]'
              }`}
            >
              {t.label}
            </Link>
          ))}
        </nav>
      </div>

      {disputes.length === 0 ? (
        <p className="py-10 text-center text-[var(--color-muted)]">Aucun litige.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {disputes.map((d) => (
            <li
              key={d.id}
              className="rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm">
                    <span className="font-medium">{REASON_LABEL[d.reason] ?? d.reason}</span>{' '}
                    <span className="text-[var(--color-muted)]">— {d.buyerPhone}</span>
                  </p>
                  <p className="mt-1 text-sm text-[var(--color-muted)]">{d.description}</p>
                  {d.sellerResponse ? (
                    <p className="mt-1 text-sm">
                      <span className="text-[var(--color-muted)]">Votre réponse : </span>
                      {d.sellerResponse}
                    </p>
                  ) : null}
                  {d.status === 'escalated' && d.escalationNote ? (
                    <p className="mt-1 text-sm text-[var(--color-danger)]">
                      Note de l&apos;acheteur : {d.escalationNote}
                    </p>
                  ) : null}
                  {d.status === 'closed' ? (
                    <p className="mt-1 text-sm text-[var(--color-muted)]">
                      Décision Jokko : {d.resolution}
                      {d.adminNote ? ` — ${d.adminNote}` : ''}
                    </p>
                  ) : null}
                  <p className="mt-2 text-xs text-[var(--color-faint)]">
                    Ouvert le {new Date(d.createdAt).toLocaleString('fr')}
                  </p>
                </div>
                <span className="shrink-0 rounded-full bg-[var(--color-surface-2)] px-2 py-0.5 text-xs text-[var(--color-muted)]">
                  {STATUS_LABEL[d.status] ?? d.status}
                </span>
              </div>
              <a
                href={`/s/${shopId}/orders/${d.orderId}/document`}
                target="_blank"
                rel="noreferrer"
                className="mt-2 inline-block text-xs text-[var(--color-brand)] underline"
              >
                Voir la commande
              </a>
              {d.status === 'open' || d.status === 'seller_responded' ? (
                <DisputeRespondForm shopId={shopId} dispute={d} />
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </Shell>
  );
}

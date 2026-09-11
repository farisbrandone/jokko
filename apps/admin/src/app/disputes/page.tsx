import Link from 'next/link';
import { redirect } from 'next/navigation';
import { apiJson } from '@/lib/api';
import type { AdminDisputeList, SessionUser } from '@/lib/types';
import { Shell } from '@/components/shell';
import { DisputeMediateForm } from '@/components/dispute-mediate-form';

export const dynamic = 'force-dynamic';

const REASON_LABEL: Record<string, string> = {
  not_received: 'Commande non reçue',
  not_as_described: 'Non conforme à la description',
  damaged: 'Article endommagé',
  wrong_item: 'Mauvais article reçu',
  other: 'Autre problème',
};

const TABS = [
  { value: 'escalated', label: 'À médier' },
  { value: 'closed', label: 'Clos' },
] as const;

type Params = { searchParams: Promise<{ status?: string; page?: string }> };

export default async function DisputesPage({ searchParams }: Params) {
  let me: SessionUser;
  try {
    me = await apiJson<SessionUser>('/auth/me');
  } catch {
    redirect('/login');
  }
  if (!me.isPlatformAdmin) redirect('/login');

  const sp = await searchParams;
  const status = TABS.some((t) => t.value === sp.status) ? sp.status! : 'escalated';
  const page = Math.max(1, Number(sp.page ?? '1') || 1);
  const list = await apiJson<AdminDisputeList>(
    `/admin/disputes?status=${status}&page=${page}&pageSize=30`,
  );
  const pages = Math.max(1, Math.ceil(list.total / list.pageSize));

  return (
    <Shell email={me.email}>
      <div className="flex items-center justify-between mb-4">
        <h1 className="font-[family-name:var(--font-display)] text-xl font-bold">
          Litiges ({list.total})
        </h1>
        <nav className="flex gap-1 text-sm">
          {TABS.map((t) => (
            <Link
              key={t.value}
              href={`/disputes?status=${t.value}`}
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

      {list.items.length === 0 ? (
        <p className="text-[var(--color-muted)] py-10 text-center">Aucun litige.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {list.items.map((d) => (
            <li
              key={d.id}
              className="rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4"
            >
              <p className="text-sm">
                <span className="font-medium">{d.shopName}</span>{' '}
                <span className="text-[var(--color-muted)]">— {d.shopSlug} · {d.buyerPhone}</span>
              </p>
              <p className="mt-1 text-sm">
                <span className="font-medium">{REASON_LABEL[d.reason] ?? d.reason}</span>
              </p>
              <p className="mt-1 text-sm text-[var(--color-muted)]">{d.description}</p>
              {d.sellerResponse ? (
                <p className="mt-1 text-sm">
                  <span className="text-[var(--color-muted)]">Réponse vendeur : </span>
                  {d.sellerResponse}
                </p>
              ) : null}
              {d.escalationNote ? (
                <p className="mt-1 text-sm text-[var(--color-danger)]">
                  Note de l&apos;acheteur : {d.escalationNote}
                </p>
              ) : null}
              {d.status === 'closed' ? (
                <p className="mt-1 text-sm text-[var(--color-good)]">
                  Décision : {d.resolution}
                  {d.adminNote ? ` — ${d.adminNote}` : ''}
                </p>
              ) : null}
              <p className="mt-2 text-xs text-[var(--color-faint)]">
                Transmis le {d.escalatedAt ? new Date(d.escalatedAt).toLocaleString('fr') : '—'}
              </p>
              {d.status === 'escalated' ? <DisputeMediateForm disputeId={d.id} /> : null}
            </li>
          ))}
        </ul>
      )}

      {pages > 1 ? (
        <div className="flex gap-2 mt-4 text-sm">
          {page > 1 ? (
            <Link
              href={`/disputes?status=${status}&page=${page - 1}`}
              className="rounded-[var(--radius-btn)] border border-[var(--color-border)] px-3 py-1.5"
            >
              ← Précédent
            </Link>
          ) : null}
          {page < pages ? (
            <Link
              href={`/disputes?status=${status}&page=${page + 1}`}
              className="rounded-[var(--radius-btn)] border border-[var(--color-border)] px-3 py-1.5"
            >
              Suivant →
            </Link>
          ) : null}
        </div>
      ) : null}
    </Shell>
  );
}

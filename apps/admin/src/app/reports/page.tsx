import Link from 'next/link';
import { redirect } from 'next/navigation';
import { apiJson } from '@/lib/api';
import type { AdminReportList, SessionUser } from '@/lib/types';
import { Shell } from '@/components/shell';
import { ReportActions } from '@/components/report-actions';

export const dynamic = 'force-dynamic';

const REASON_LABELS: Record<string, string> = {
  counterfeit: 'Contrefaçon',
  prohibited: 'Produit interdit',
  scam: 'Arnaque',
  offensive: 'Contenu choquant',
  spam: 'Spam',
  other: 'Autre',
};

const TABS = [
  { value: 'pending', label: 'En attente' },
  { value: 'actioned', label: 'Traités' },
  { value: 'dismissed', label: 'Rejetés' },
] as const;

type Params = { searchParams: Promise<{ status?: string; page?: string }> };

export default async function ReportsPage({ searchParams }: Params) {
  let me: SessionUser;
  try {
    me = await apiJson<SessionUser>('/auth/me');
  } catch {
    redirect('/login');
  }
  if (!me.isPlatformAdmin) redirect('/login');

  const sp = await searchParams;
  const status = TABS.some((t) => t.value === sp.status) ? sp.status! : 'pending';
  const page = Math.max(1, Number(sp.page ?? '1') || 1);
  const list = await apiJson<AdminReportList>(
    `/admin/reports?status=${status}&page=${page}&pageSize=30`,
  );
  const pages = Math.max(1, Math.ceil(list.total / list.pageSize));

  return (
    <Shell email={me.email}>
      <div className="flex items-center justify-between mb-4">
        <h1 className="font-[family-name:var(--font-display)] text-xl font-bold">
          Signalements ({list.total})
        </h1>
        <nav className="flex gap-1 text-sm">
          {TABS.map((t) => (
            <Link
              key={t.value}
              href={`/reports?status=${t.value}`}
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
        <p className="text-[var(--color-muted)] py-10 text-center">Aucun signalement.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {list.items.map((r) => (
            <li
              key={r.id}
              className="rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm">
                    <span className="rounded bg-[var(--color-surface-2)] px-1.5 py-0.5 text-xs">
                      {r.targetType === 'product' ? 'Produit' : 'Boutique'}
                    </span>{' '}
                    <span className="font-medium">{r.targetLabel ?? r.targetId}</span>
                  </p>
                  <p className="text-xs text-[var(--color-muted)] mt-0.5">
                    {r.shopName} · {r.shopSlug} · {new Date(r.createdAt).toLocaleString('fr')}
                  </p>
                  <p className="text-sm mt-2">
                    <span className="font-medium">{REASON_LABELS[r.reason] ?? r.reason}</span>
                    {r.note ? <span className="text-[var(--color-muted)]"> — {r.note}</span> : null}
                  </p>
                </div>
                {r.status === 'pending' ? (
                  <ReportActions reportId={r.id} targetType={r.targetType} />
                ) : (
                  <span className="text-xs text-[var(--color-faint)]">{r.status}</span>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {pages > 1 ? (
        <div className="flex gap-2 mt-4 text-sm">
          {page > 1 ? (
            <Link
              href={`/reports?status=${status}&page=${page - 1}`}
              className="rounded-[var(--radius-btn)] border border-[var(--color-border)] px-3 py-1.5"
            >
              ← Précédent
            </Link>
          ) : null}
          {page < pages ? (
            <Link
              href={`/reports?status=${status}&page=${page + 1}`}
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

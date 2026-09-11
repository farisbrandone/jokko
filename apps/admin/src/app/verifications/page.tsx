import Link from 'next/link';
import { redirect } from 'next/navigation';
import { apiJson } from '@/lib/api';
import type { AdminShopVerificationList, SessionUser } from '@/lib/types';
import { Shell } from '@/components/shell';
import { VerificationActions } from '@/components/verification-actions';

export const dynamic = 'force-dynamic';

const TABS = [
  { value: 'pending', label: 'En attente' },
  { value: 'verified', label: 'Vérifiées' },
  { value: 'rejected', label: 'Refusées' },
] as const;

type Params = { searchParams: Promise<{ status?: string; page?: string }> };

export default async function VerificationsPage({ searchParams }: Params) {
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
  const list = await apiJson<AdminShopVerificationList>(
    `/admin/shop-verifications?status=${status}&page=${page}&pageSize=30`,
  );
  const pages = Math.max(1, Math.ceil(list.total / list.pageSize));

  return (
    <Shell email={me.email}>
      <div className="flex items-center justify-between mb-4">
        <h1 className="font-[family-name:var(--font-display)] text-xl font-bold">
          Vérifications de boutique ({list.total})
        </h1>
        <nav className="flex gap-1 text-sm">
          {TABS.map((t) => (
            <Link
              key={t.value}
              href={`/verifications?status=${t.value}`}
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
        <p className="text-[var(--color-muted)] py-10 text-center">Aucune demande.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {list.items.map((v) => (
            <li
              key={v.shopId}
              className="rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm">
                    <span className="font-medium">{v.shopName}</span>{' '}
                    <span className="text-[var(--color-muted)]">— {v.shopSlug}</span>
                  </p>
                  <p className="mt-1 text-sm">
                    {v.legalName} · {v.registryNumber}
                  </p>
                  {v.note ? (
                    <p className="mt-1 text-sm text-[var(--color-muted)]">{v.note}</p>
                  ) : null}
                  {v.proofImageUrl ? (
                    <a
                      href={v.proofImageUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-1 inline-block text-sm text-[var(--color-brand)] underline"
                    >
                      Voir le justificatif
                    </a>
                  ) : null}
                  <p className="mt-2 text-xs text-[var(--color-faint)]">
                    Envoyée le {v.submittedAt ? new Date(v.submittedAt).toLocaleString('fr') : '—'}
                  </p>
                  {v.status !== 'pending' && v.decisionNote ? (
                    <p className="mt-1 text-xs text-[var(--color-muted)]">
                      Motif : {v.decisionNote}
                    </p>
                  ) : null}
                </div>
                {v.status === 'pending' ? (
                  <VerificationActions shopId={v.shopId} />
                ) : (
                  <span className="text-xs text-[var(--color-faint)]">{v.status}</span>
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
              href={`/verifications?status=${status}&page=${page - 1}`}
              className="rounded-[var(--radius-btn)] border border-[var(--color-border)] px-3 py-1.5"
            >
              ← Précédent
            </Link>
          ) : null}
          {page < pages ? (
            <Link
              href={`/verifications?status=${status}&page=${page + 1}`}
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

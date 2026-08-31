import Link from 'next/link';
import { redirect } from 'next/navigation';
import { apiJson } from '@/lib/api';
import type { SessionUser } from '@/lib/types';
import { Shell } from '@/components/shell';

export const dynamic = 'force-dynamic';

interface Summary {
  days: number;
  pageViews: number;
  productViews: number;
  searches: number;
  sessions: number;
  contactClicks: number;
  contactByChannel: Record<string, number>;
  contactRate: number;
  topProducts: { slug: string; name: string; views: number }[];
  topSearches: { term: string; count: number }[];
  byDay: { day: string; views: number }[];
}

type Params = {
  params: Promise<{ shopId: string }>;
  searchParams: Promise<{ days?: string }>;
};

function Kpi({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
      <p className="text-xs uppercase tracking-wide text-[var(--color-faint)]">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums">{value}</p>
    </div>
  );
}

function Bars({ data }: { data: { label: string; value: number }[] }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <ul className="flex flex-col gap-1.5 text-sm">
      {data.map((d) => (
        <li key={d.label} className="flex items-center gap-2">
          <span className="w-28 shrink-0 truncate capitalize">{d.label}</span>
          <span className="flex-1 h-4 rounded bg-[var(--color-surface-2)] overflow-hidden">
            <span
              className="block h-full bg-[var(--color-brand)]"
              style={{ width: `${(d.value / max) * 100}%` }}
            />
          </span>
          <span className="w-10 text-right tabular-nums text-[var(--color-muted)]">{d.value}</span>
        </li>
      ))}
    </ul>
  );
}

export default async function AnalyticsPage({ params, searchParams }: Params) {
  const { shopId } = await params;
  const days = (await searchParams).days === '30' ? 30 : 7;

  let me: SessionUser;
  try {
    me = await apiJson<SessionUser>('/auth/me');
  } catch {
    redirect('/login');
  }
  if (!me.memberships.some((m) => m.shopId === shopId)) redirect('/');

  const s = await apiJson<Summary>(`/shops/${shopId}/analytics/summary?days=${days}`);
  const maxDay = Math.max(1, ...s.byDay.map((d) => d.views));

  return (
    <Shell email={me.email}>
      <div className="flex items-center justify-between mb-4">
        <div>
          <Link href={`/s/${shopId}`} className="text-sm text-[var(--color-muted)]">
            ← Boutique
          </Link>
          <h1 className="font-[family-name:var(--font-display)] text-xl font-bold">
            Statistiques
          </h1>
        </div>
        <div className="flex gap-2 text-sm">
          {[7, 30].map((d) => (
            <Link
              key={d}
              href={`/s/${shopId}/analytics?days=${d}`}
              className={`rounded-[var(--radius-btn)] border px-2.5 py-1 ${
                days === d
                  ? 'border-[var(--color-brand)] bg-[var(--color-brand-soft)]'
                  : 'border-[var(--color-border)]'
              }`}
            >
              {d} j
            </Link>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <Kpi label="Visites" value={s.pageViews} />
        <Kpi label="Sessions" value={s.sessions} />
        <Kpi label="Vues produit" value={s.productViews} />
        <Kpi label="Recherches" value={s.searches} />
        <Kpi label="Contacts" value={s.contactClicks} />
        <Kpi label="Taux de contact" value={`${Math.round(s.contactRate * 100)} %`} />
      </div>

      <div className="grid md:grid-cols-2 gap-6 mt-6">
        <section>
          <h2 className="font-medium mb-2">Visites par jour</h2>
          {s.byDay.length === 0 ? (
            <p className="text-sm text-[var(--color-muted)]">Pas encore de données.</p>
          ) : (
            <div className="flex items-end gap-1 h-24">
              {s.byDay.map((d) => (
                <div
                  key={d.day}
                  title={`${d.day} — ${d.views}`}
                  className="flex-1 bg-[var(--color-brand)] rounded-t"
                  style={{ height: `${(d.views / maxDay) * 100}%`, minHeight: 2 }}
                />
              ))}
            </div>
          )}
        </section>

        <section>
          <h2 className="font-medium mb-2">Contacts par canal</h2>
          {s.contactClicks === 0 ? (
            <p className="text-sm text-[var(--color-muted)]">Aucun contact.</p>
          ) : (
            <Bars
              data={Object.entries(s.contactByChannel).map(([label, value]) => ({ label, value }))}
            />
          )}
        </section>

        <section>
          <h2 className="font-medium mb-2">Produits les plus vus</h2>
          {s.topProducts.length === 0 ? (
            <p className="text-sm text-[var(--color-muted)]">Pas encore de données.</p>
          ) : (
            <Bars
              data={s.topProducts.map((p) => ({ label: p.name || p.slug, value: p.views }))}
            />
          )}
        </section>

        <section>
          <h2 className="font-medium mb-2">Recherches fréquentes</h2>
          {s.topSearches.length === 0 ? (
            <p className="text-sm text-[var(--color-muted)]">Pas encore de données.</p>
          ) : (
            <Bars data={s.topSearches.map((t) => ({ label: t.term, value: t.count }))} />
          )}
        </section>
      </div>
    </Shell>
  );
}

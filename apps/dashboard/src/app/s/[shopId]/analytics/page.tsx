import Link from 'next/link';
import { redirect } from 'next/navigation';
import { formatMoney } from '@jokko/ui';
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
  funnel: {
    productViews: number;
    addToCart: number;
    ordersCreated: number;
    ordersConfirmed: number;
  };
  revenue: {
    currency: string;
    total: number;
    byDay: { day: string; amount: number }[];
  };
  topProductsBySales: { productId: string; name: string; qty: number; revenue: number }[];
  repeatPurchaseRate: number;
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

function Bars({
  data,
  formatValue,
}: {
  data: { label: string; value: number }[];
  formatValue?: (v: number) => string;
}) {
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
          <span className="w-16 shrink-0 text-right tabular-nums text-[var(--color-muted)]">
            {formatValue ? formatValue(d.value) : d.value}
          </span>
        </li>
      ))}
    </ul>
  );
}

/** Entonnoir de conversion : chaque étape affiche son taux par rapport à la première. */
function Funnel({ steps }: { steps: { label: string; value: number }[] }) {
  const max = Math.max(1, steps[0]?.value ?? 0);
  return (
    <ul className="flex flex-col gap-3">
      {steps.map((s, i) => {
        const pct = Math.round((s.value / max) * 100);
        return (
          <li key={s.label}>
            <div className="flex items-center justify-between text-sm">
              <span>{s.label}</span>
              <span className="tabular-nums text-[var(--color-muted)]">
                {s.value}
                {i > 0 ? ` (${pct} %)` : ''}
              </span>
            </div>
            <div className="mt-1 h-3 overflow-hidden rounded bg-[var(--color-surface-2)]">
              <div className="h-full bg-[var(--color-brand)]" style={{ width: `${pct}%` }} />
            </div>
          </li>
        );
      })}
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
        <div className="flex items-center gap-2 text-sm">
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
          <a
            href={`/api/proxy/shops/${shopId}/analytics/export.csv?days=${Math.max(days, 30)}`}
            className="ml-1 rounded-[var(--radius-btn)] border border-[var(--color-border)] px-2.5 py-1 hover:bg-[var(--color-surface-2)]"
          >
            Exporter les commandes (CSV)
          </a>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <Kpi label="Visites" value={s.pageViews} />
        <Kpi label="Sessions" value={s.sessions} />
        <Kpi label="Vues produit" value={s.productViews} />
        <Kpi label="Chiffre d'affaires" value={formatMoney(s.revenue.total, s.revenue.currency)} />
        <Kpi label="Taux de contact" value={`${Math.round(s.contactRate * 100)} %`} />
        <Kpi label="Taux de réachat" value={`${Math.round(s.repeatPurchaseRate * 100)} %`} />
      </div>

      <div className="grid md:grid-cols-2 gap-6 mt-6">
        <section>
          <h2 className="font-medium mb-2">Entonnoir de conversion</h2>
          <Funnel
            steps={[
              { label: 'Vues produit', value: s.funnel.productViews },
              { label: 'Ajouts au panier', value: s.funnel.addToCart },
              { label: 'Commandes créées', value: s.funnel.ordersCreated },
              { label: 'Commandes confirmées', value: s.funnel.ordersConfirmed },
            ]}
          />
          <p className="mt-2 text-xs text-[var(--color-muted)]">
            « Confirmée » = à livrer, payée ou terminée (paiement en ligne accepté ou
            commande à la livraison prise en charge).
          </p>
        </section>

        <section>
          <h2 className="font-medium mb-2">Chiffre d&apos;affaires par jour</h2>
          {s.revenue.byDay.length === 0 ? (
            <p className="text-sm text-[var(--color-muted)]">Pas encore de données.</p>
          ) : (
            <div className="flex items-end gap-1 h-24">
              {s.revenue.byDay.map((d) => {
                const maxRevenue = Math.max(1, ...s.revenue.byDay.map((r) => r.amount));
                return (
                  <div
                    key={d.day}
                    title={`${d.day} — ${formatMoney(d.amount, s.revenue.currency)}`}
                    className="flex-1 bg-[var(--color-brand)] rounded-t"
                    style={{ height: `${(d.amount / maxRevenue) * 100}%`, minHeight: 2 }}
                  />
                );
              })}
            </div>
          )}
        </section>

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
          <h2 className="font-medium mb-2">Produits les plus vendus</h2>
          {s.topProductsBySales.length === 0 ? (
            <p className="text-sm text-[var(--color-muted)]">Pas encore de données.</p>
          ) : (
            <Bars
              data={s.topProductsBySales.map((p) => ({ label: p.name, value: p.revenue }))}
              formatValue={(v) => formatMoney(v, s.revenue.currency)}
            />
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

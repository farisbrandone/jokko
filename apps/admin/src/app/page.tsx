import { redirect } from 'next/navigation';
import { apiJson } from '@/lib/api';
import type { PlatformOverview, SessionUser } from '@/lib/types';
import { Shell } from '@/components/shell';

export const dynamic = 'force-dynamic';

function Kpi({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
      <p className="text-xs uppercase tracking-wide text-[var(--color-faint)]">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums">{value}</p>
      {sub ? <p className="text-xs text-[var(--color-muted)]">{sub}</p> : null}
    </div>
  );
}

export default async function OverviewPage() {
  let me: SessionUser;
  try {
    me = await apiJson<SessionUser>('/auth/me');
  } catch {
    redirect('/login');
  }
  if (!me.isPlatformAdmin) redirect('/login');

  const o = await apiJson<PlatformOverview>('/admin/overview');

  return (
    <Shell email={me.email}>
      <h1 className="font-[family-name:var(--font-display)] text-xl font-bold mb-4">
        Vue d&apos;ensemble
      </h1>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        <Kpi
          label="Boutiques"
          value={o.shops.total}
          sub={`${o.shops.active} actives · ${o.shops.suspended} suspendues`}
        />
        <Kpi label="Nouvelles (7 j)" value={o.newShops7d} />
        <Kpi label="Utilisateurs" value={o.users} />
        <Kpi
          label="Produits"
          value={o.products.total}
          sub={`${o.products.published} publiés`}
        />
        <Kpi label="Conversations ouvertes" value={o.conversationsOpen} />
        <Kpi label="Événements (7 j)" value={o.eventsLast7d} />
        <Kpi label="Signalements en attente" value={o.pendingReports} />
      </div>
    </Shell>
  );
}

import Link from 'next/link';
import { redirect } from 'next/navigation';
import { apiJson } from '@/lib/api';
import type { AdminShopList, SessionUser } from '@/lib/types';
import { Shell } from '@/components/shell';
import { ShopStatusToggle } from '@/components/shop-status-toggle';

export const dynamic = 'force-dynamic';

type Params = { searchParams: Promise<{ q?: string; page?: string }> };

export default async function ShopsPage({ searchParams }: Params) {
  let me: SessionUser;
  try {
    me = await apiJson<SessionUser>('/auth/me');
  } catch {
    redirect('/login');
  }
  if (!me.isPlatformAdmin) redirect('/login');

  const sp = await searchParams;
  const q = sp.q ?? '';
  const page = Math.max(1, Number(sp.page ?? '1') || 1);
  const qs = new URLSearchParams({ page: String(page), pageSize: '30' });
  if (q) qs.set('q', q);
  const list = await apiJson<AdminShopList>(`/admin/shops?${qs.toString()}`);
  const pages = Math.max(1, Math.ceil(list.total / list.pageSize));

  return (
    <Shell email={me.email}>
      <div className="flex items-center justify-between mb-4">
        <h1 className="font-[family-name:var(--font-display)] text-xl font-bold">
          Boutiques ({list.total})
        </h1>
        <form className="flex gap-2 text-sm">
          <input
            name="q"
            defaultValue={q}
            placeholder="slug ou nom…"
            className="rounded-[var(--radius-btn)] border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-1.5"
          />
          <button className="rounded-[var(--radius-btn)] border border-[var(--color-border)] px-3 py-1.5">
            Rechercher
          </button>
        </form>
      </div>

      <div className="overflow-x-auto rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)]">
        <table className="w-full text-sm min-w-[640px]">
          <thead className="text-left text-xs uppercase tracking-wide text-[var(--color-faint)]">
            <tr>
              <th className="py-2 px-3 font-medium">Boutique</th>
              <th className="py-2 pr-3 font-medium">Propriétaire</th>
              <th className="py-2 pr-3 font-medium">Produits</th>
              <th className="py-2 pr-3 font-medium">Conv.</th>
              <th className="py-2 pr-3 font-medium">Créée</th>
              <th className="py-2 pr-3 font-medium">Statut</th>
              <th className="py-2 px-3" />
            </tr>
          </thead>
          <tbody>
            {list.items.map((s) => (
              <tr key={s.id} className="border-t border-[var(--color-border)]">
                <td className="py-2 px-3">
                  <span className="font-medium">{s.name}</span>
                  <span className="block text-xs text-[var(--color-muted)]">{s.slug}</span>
                </td>
                <td className="py-2 pr-3">{s.ownerEmail ?? '—'}</td>
                <td className="py-2 pr-3 tabular-nums">{s.products}</td>
                <td className="py-2 pr-3 tabular-nums">{s.conversations}</td>
                <td className="py-2 pr-3">{s.createdAt.slice(0, 10)}</td>
                <td className="py-2 pr-3">
                  <span
                    className={`rounded px-2 py-0.5 text-xs ${
                      s.status === 'active'
                        ? 'bg-[var(--color-brand-soft)] text-[var(--color-brand)]'
                        : 'bg-[var(--color-surface-2)] text-[var(--color-faint)]'
                    }`}
                  >
                    {s.status}
                  </span>
                </td>
                <td className="py-2 px-3 text-right">
                  <ShopStatusToggle shopId={s.id} status={s.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {pages > 1 ? (
        <div className="flex gap-1 mt-3 text-sm">
          {Array.from({ length: pages }, (_, i) => i + 1).map((p) => (
            <Link
              key={p}
              href={`/shops?${q ? `q=${encodeURIComponent(q)}&` : ''}page=${p}`}
              className={`rounded-[var(--radius-btn)] border px-2.5 py-1 ${
                p === page
                  ? 'border-[var(--color-brand)] bg-[var(--color-brand-soft)]'
                  : 'border-[var(--color-border)]'
              }`}
            >
              {p}
            </Link>
          ))}
        </div>
      ) : null}
    </Shell>
  );
}

import Link from 'next/link';
import { redirect } from 'next/navigation';
import { apiJson, apiJsonAs } from '@/lib/api';
import type { AdminShopDetail, ImpersonationGrant, SessionUser } from '@/lib/types';
import { Shell } from '@/components/shell';
import { ShopStatusToggle } from '@/components/shop-status-toggle';

export const dynamic = 'force-dynamic';

type Params = { params: Promise<{ id: string }> };

interface ProductList {
  items: { id: string; name: string; status: string; stock: number; price: { amount: number; currency: string } }[];
  total: number;
}
interface InboxList {
  items: { id: string; buyerName: string; status: string; productName: string | null }[];
  total: number;
}
interface Summary {
  pageViews: number;
  productViews: number;
  contactClicks: number;
  sessions: number;
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
      <h2 className="font-medium mb-2 text-sm">{title}</h2>
      {children}
    </section>
  );
}

export default async function ShopDetailPage({ params }: Params) {
  const { id } = await params;

  let me: SessionUser;
  try {
    me = await apiJson<SessionUser>('/auth/me');
  } catch {
    redirect('/login');
  }
  if (!me.isPlatformAdmin) redirect('/login');

  const shop = await apiJson<AdminShopDetail>(`/admin/shops/${id}`);

  const dashboardUrl = process.env.DASHBOARD_PUBLIC_URL ?? 'http://localhost:3001';
  let view: { products: ProductList; inbox: InboxList; summary: Summary } | null = null;
  let viewError: string | null = null;
  let handoffToken: string | null = null;
  if (shop.owner) {
    try {
      const grant = await apiJson<ImpersonationGrant>('/admin/impersonate', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ userId: shop.owner.id }),
      });
      handoffToken = grant.token;
      const [products, inbox, summary] = await Promise.all([
        apiJsonAs<ProductList>(`/shops/${id}/products?pageSize=50`, grant.token),
        apiJsonAs<InboxList>(`/shops/${id}/inbox?pageSize=20`, grant.token),
        apiJsonAs<Summary>(`/shops/${id}/analytics/summary?days=7`, grant.token),
      ]);
      view = { products, inbox, summary };
    } catch (e) {
      viewError = (e as Error).message;
    }
  }

  return (
    <Shell email={me.email}>
      <div className="flex items-center justify-between mb-1">
        <div>
          <Link href="/shops" className="text-sm text-[var(--color-muted)]">
            ← Boutiques
          </Link>
          <h1 className="font-[family-name:var(--font-display)] text-xl font-bold">{shop.name}</h1>
          <p className="text-xs text-[var(--color-muted)]">
            {shop.slug} · créée le {shop.createdAt.slice(0, 10)} ·{' '}
            {shop.owner ? shop.owner.email : 'sans propriétaire'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {handoffToken ? (
            <a
              href={`${dashboardUrl}/impersonate?token=${encodeURIComponent(handoffToken)}&shopId=${shop.id}`}
              target="_blank"
              rel="noreferrer"
              className="rounded-[var(--radius-btn)] bg-[var(--color-brand)] text-[var(--color-brand-ink)] px-3 py-1.5 text-xs font-medium"
            >
              Ouvrir le tableau de bord
            </a>
          ) : null}
          <ShopStatusToggle shopId={shop.id} status={shop.status} />
        </div>
      </div>

      <p className="text-xs text-[var(--color-faint)] mb-4">
        Vue support en lecture seule (jeton d’usurpation temporaire, 15 min, audité).
      </p>

      {viewError ? (
        <p className="text-sm text-[var(--color-danger)]">Inspection indisponible : {viewError}</p>
      ) : !view ? (
        <p className="text-sm text-[var(--color-muted)]">Boutique sans propriétaire à usurper.</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          <Panel title={`Statistiques (7 j)`}>
            <ul className="text-sm grid grid-cols-2 gap-1 tabular-nums">
              <li>Visites : {view.summary.pageViews}</li>
              <li>Sessions : {view.summary.sessions}</li>
              <li>Vues produit : {view.summary.productViews}</li>
              <li>Contacts : {view.summary.contactClicks}</li>
            </ul>
          </Panel>

          <Panel title={`Boîte de réception (${view.inbox.total})`}>
            {view.inbox.items.length === 0 ? (
              <p className="text-sm text-[var(--color-muted)]">Aucune conversation.</p>
            ) : (
              <ul className="text-sm flex flex-col gap-1">
                {view.inbox.items.slice(0, 8).map((c) => (
                  <li key={c.id} className="flex justify-between gap-2">
                    <span className="truncate">
                      {c.buyerName}{' '}
                      <span className="text-[var(--color-faint)]">
                        {c.productName ?? 'sans produit'}
                      </span>
                    </span>
                    <span className="text-[var(--color-faint)]">{c.status}</span>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <Panel title={`Produits (${view.products.total})`}>
            {view.products.items.length === 0 ? (
              <p className="text-sm text-[var(--color-muted)]">Aucun produit.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm min-w-[360px]">
                  <tbody>
                    {view.products.items.slice(0, 15).map((p) => (
                      <tr key={p.id} className="border-t border-[var(--color-border)]">
                        <td className="py-1.5 pr-2">{p.name}</td>
                        <td className="py-1.5 pr-2 tabular-nums text-[var(--color-muted)]">
                          {(p.price.amount / 100).toLocaleString('fr')} {p.price.currency}
                        </td>
                        <td className="py-1.5 pr-2 text-[var(--color-faint)]">{p.status}</td>
                        <td className="py-1.5 tabular-nums text-[var(--color-faint)]">
                          stock {p.stock}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Panel>
        </div>
      )}
    </Shell>
  );
}

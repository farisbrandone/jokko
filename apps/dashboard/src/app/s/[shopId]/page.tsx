import Link from 'next/link';
import { redirect } from 'next/navigation';
import { apiJson } from '@/lib/api';
import { storefrontUrl } from '@/lib/origin';
import type { ProductList, SessionUser } from '@/lib/types';

type CountOnly = { total: number };
import { Shell } from '@/components/shell';
import { ProductRow } from '@/components/product-row';
import { IconExternal } from '@/components/nav-icons';

export const dynamic = 'force-dynamic';

type Params = { params: Promise<{ shopId: string }> };

function Kpi({ label, value, href }: { label: string; value: number | string; href: string }) {
  return (
    <Link
      href={href}
      className="rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4 transition-colors hover:border-[var(--color-brand)]"
    >
      <div className="font-[family-name:var(--font-display)] text-2xl font-bold">{value}</div>
      <div className="mt-0.5 text-xs text-[var(--color-muted)]">{label}</div>
    </Link>
  );
}

export default async function ShopPage({ params }: Params) {
  const { shopId } = await params;

  let me: SessionUser;
  try {
    me = await apiJson<SessionUser>('/auth/me');
  } catch {
    redirect('/login');
  }
  const membership = me.memberships.find((m) => m.shopId === shopId);
  if (!membership) redirect('/');

  const [products, toDeliver, toShip, openThreads] = await Promise.all([
    apiJson<ProductList>(`/shops/${shopId}/products?pageSize=100`),
    apiJson<CountOnly>(`/shops/${shopId}/orders?status=to_deliver&pageSize=1`).catch(() => ({ total: 0 })),
    apiJson<CountOnly>(`/shops/${shopId}/orders?status=paid&pageSize=1`).catch(() => ({ total: 0 })),
    apiJson<CountOnly>(`/shops/${shopId}/inbox?status=open&pageSize=1`).catch(() => ({ total: 0 })),
  ]);
  const published = products.items.filter((p) => p.status === 'published').length;
  const shopHref = `/s/${shopId}`;

  return (
    <Shell email={me.email}>
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-[family-name:var(--font-display)] text-xl font-bold capitalize">
            {membership.slug}
          </h1>
          <a
            href={storefrontUrl(membership.slug)}
            target="_blank"
            rel="noreferrer"
            className="mt-0.5 inline-flex items-center gap-1 text-sm text-[var(--color-muted)] hover:text-[var(--color-ink)]"
          >
            {storefrontUrl(membership.slug).replace(/^https?:\/\//, '')}
            <IconExternal className="h-3.5 w-3.5" />
          </a>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href={`${shopHref}/products/import`}
            className="rounded-[var(--radius-btn)] border border-[var(--color-border)] px-3 py-2 text-sm"
          >
            Importer
          </Link>
          <Link
            href={`${shopHref}/products/new`}
            className="rounded-[var(--radius-btn)] bg-[var(--color-brand)] px-3 py-2 text-sm font-medium text-[var(--color-brand-ink)]"
          >
            Ajouter un produit
          </Link>
        </div>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Kpi label="Produits publiés" value={published} href={shopHref} />
        <Kpi label="À livrer" value={toDeliver.total} href={`${shopHref}/orders`} />
        <Kpi label="À expédier" value={toShip.total} href={`${shopHref}/orders`} />
        <Kpi label="Messages ouverts" value={openThreads.total} href={`${shopHref}/inbox`} />
      </div>

      {products.items.length === 0 ? (
        <div className="rounded-[var(--radius-card)] border border-dashed border-[var(--color-border)] py-14 text-center">
          <p className="text-[var(--color-muted)]">Aucun produit pour l&apos;instant.</p>
          <Link
            href={`${shopHref}/products/new`}
            className="mt-3 inline-block rounded-[var(--radius-btn)] bg-[var(--color-brand)] px-4 py-2 text-sm font-medium text-[var(--color-brand-ink)]"
          >
            Ajouter votre premier article
          </Link>
        </div>
      ) : (
        <>
          {/* Cartes — mobile */}
          <div className="flex flex-col gap-2 sm:hidden">
            {products.items.map((p) => (
              <ProductRow key={p.id} shopId={shopId} product={p} variant="card" />
            ))}
          </div>
          {/* Tableau — desktop */}
          <div className="hidden overflow-x-auto rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] sm:block">
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase tracking-wide text-[var(--color-faint)]">
                <tr>
                  <th className="px-3 py-2 font-medium">Produit</th>
                  <th className="py-2 pr-3 font-medium">Prix</th>
                  <th className="py-2 pr-3 font-medium">Stock</th>
                  <th className="py-2 pr-3 font-medium">Statut</th>
                  <th className="px-3 py-2" />
                </tr>
              </thead>
              <tbody>
                {products.items.map((p) => (
                  <ProductRow key={p.id} shopId={shopId} product={p} />
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </Shell>
  );
}

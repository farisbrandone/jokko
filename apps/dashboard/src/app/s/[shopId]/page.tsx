import Link from 'next/link';
import { redirect } from 'next/navigation';
import { apiJson } from '@/lib/api';
import type { ProductList, SessionUser } from '@/lib/types';
import { Shell } from '@/components/shell';
import { ProductRow } from '@/components/product-row';

export const dynamic = 'force-dynamic';

type Params = { params: Promise<{ shopId: string }> };

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

  const products = await apiJson<ProductList>(`/shops/${shopId}/products?pageSize=100`);

  return (
    <Shell email={me.email}>
      <div className="flex items-center justify-between mb-4">
        <div>
          <Link href="/" className="text-sm text-[var(--color-muted)]">
            ← Boutiques
          </Link>
          <h1 className="font-[family-name:var(--font-display)] text-xl font-bold">
            {membership.slug}
          </h1>
        </div>
        <div className="flex gap-2">
          <Link
            href={`/s/${shopId}/analytics`}
            className="rounded-[var(--radius-btn)] border border-[var(--color-border)] px-3 py-2 text-sm"
          >
            Statistiques
          </Link>
          <Link
            href={`/s/${shopId}/inbox`}
            className="rounded-[var(--radius-btn)] border border-[var(--color-border)] px-3 py-2 text-sm"
          >
            Boîte de réception
          </Link>
          <Link
            href={`/s/${shopId}/settings`}
            className="rounded-[var(--radius-btn)] border border-[var(--color-border)] px-3 py-2 text-sm"
          >
            Notifications
          </Link>
          <Link
            href={`/s/${shopId}/products/new`}
            className="rounded-[var(--radius-btn)] bg-[var(--color-brand)] text-[var(--color-brand-ink)] px-3 py-2 text-sm font-medium"
          >
            Ajouter un produit
          </Link>
        </div>
      </div>

      {products.items.length === 0 ? (
        <p className="text-[var(--color-muted)] py-10 text-center">
          Aucun produit. Ajoutez votre premier article.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)]">
          <table className="w-full text-sm min-w-[520px]">
            <thead className="text-left text-xs uppercase tracking-wide text-[var(--color-faint)]">
              <tr>
                <th className="py-2 px-3 font-medium">Produit</th>
                <th className="py-2 pr-3 font-medium">Prix</th>
                <th className="py-2 pr-3 font-medium">Stock</th>
                <th className="py-2 pr-3 font-medium">Statut</th>
                <th className="py-2 px-3" />
              </tr>
            </thead>
            <tbody>
              {products.items.map((p) => (
                <ProductRow key={p.id} shopId={shopId} product={p} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Shell>
  );
}

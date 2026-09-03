import Link from 'next/link';
import { redirect } from 'next/navigation';
import { apiJson } from '@/lib/api';
import type { SessionUser } from '@/lib/types';
import { Shell } from '@/components/shell';
import { ProductImport } from '@/components/product-import';

export const dynamic = 'force-dynamic';

type Params = { params: Promise<{ shopId: string }> };

export default async function ImportPage({ params }: Params) {
  const { shopId } = await params;

  let me: SessionUser;
  try {
    me = await apiJson<SessionUser>('/auth/me');
  } catch {
    redirect('/login');
  }
  if (!me.memberships.some((m) => m.shopId === shopId)) redirect('/');

  return (
    <Shell email={me.email}>
      <div className="mb-6">
        <Link href={`/s/${shopId}`} className="text-sm text-[var(--color-muted)]">
          ← Boutique
        </Link>
        <h1 className="font-[family-name:var(--font-display)] text-xl font-bold">
          Importer des produits
        </h1>
        <p className="text-sm text-[var(--color-muted)]">
          Depuis une page produit (extraction automatique) ou un fichier CSV. Les produits
          sont créés en <strong>brouillon</strong> : vérifiez-les avant publication.
        </p>
      </div>
      <ProductImport shopId={shopId} />
    </Shell>
  );
}

import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { apiJson, ApiError } from '@/lib/api';
import type { Product } from '@/lib/types';
import { Shell } from '@/components/shell';
import { ProductForm } from '@/components/product-form';

export const dynamic = 'force-dynamic';

type Params = { params: Promise<{ shopId: string; productId: string }> };

export default async function EditProductPage({ params }: Params) {
  const { shopId, productId } = await params;

  let product: Product;
  try {
    product = await apiJson<Product>(`/shops/${shopId}/products/${productId}/edit`);
  } catch (e) {
    if (e instanceof ApiError && e.status === 401) redirect('/login');
    if (e instanceof ApiError && e.status === 404) notFound();
    throw e;
  }

  return (
    <Shell>
      <Link href={`/s/${shopId}`} className="text-sm text-[var(--color-muted)]">
        ← Retour
      </Link>
      <div className="flex items-center gap-3 my-3">
        <h1 className="font-[family-name:var(--font-display)] text-xl font-bold">
          {product.name}
        </h1>
        <span className="rounded bg-[var(--color-surface-2)] px-2 py-0.5 text-xs text-[var(--color-muted)]">
          {product.status}
        </span>
      </div>
      <ProductForm shopId={shopId} product={product} />
    </Shell>
  );
}

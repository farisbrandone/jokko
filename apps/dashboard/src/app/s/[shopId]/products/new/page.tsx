import Link from 'next/link';
import { shopCategories } from '@/lib/shop';
import { Shell } from '@/components/shell';
import { ProductForm } from '@/components/product-form';

export const dynamic = 'force-dynamic';

type Params = { params: Promise<{ shopId: string }> };

export default async function NewProductPage({ params }: Params) {
  const { shopId } = await params;
  const categories = await shopCategories(shopId);
  return (
    <Shell>
      <Link href={`/s/${shopId}`} className="text-sm text-[var(--color-muted)]">
        ← Retour
      </Link>
      <h1 className="font-[family-name:var(--font-display)] text-xl font-bold my-3">
        Nouveau produit
      </h1>
      <ProductForm shopId={shopId} categories={categories} />
    </Shell>
  );
}

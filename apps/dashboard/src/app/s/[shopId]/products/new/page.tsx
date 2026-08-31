import Link from 'next/link';
import { Shell } from '@/components/shell';
import { ProductForm } from '@/components/product-form';

type Params = { params: Promise<{ shopId: string }> };

export default async function NewProductPage({ params }: Params) {
  const { shopId } = await params;
  return (
    <Shell>
      <Link href={`/s/${shopId}`} className="text-sm text-[var(--color-muted)]">
        ← Retour
      </Link>
      <h1 className="font-[family-name:var(--font-display)] text-xl font-bold my-3">
        Nouveau produit
      </h1>
      <ProductForm shopId={shopId} />
    </Shell>
  );
}

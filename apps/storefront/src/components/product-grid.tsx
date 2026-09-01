import { getTranslations } from 'next-intl/server';
import type { SearchHit } from '@jokko/contracts';
import { ProductCard } from './product-card';

export async function ProductGrid({ hits }: { hits: SearchHit[] }) {
  if (hits.length === 0) {
    const t = await getTranslations('search');
    return <p className="text-[var(--color-muted)] py-12 text-center">{t('empty')}</p>;
  }
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
      {hits.map((h) => (
        <ProductCard key={h.id} hit={h} />
      ))}
    </div>
  );
}

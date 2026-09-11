import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { currentShop } from '@/lib/shop';
import { ShopUnavailable } from '@/components/shop-unavailable';
import { FavoritesList } from '@/components/favorites-list';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = { robots: { index: false } };

export default async function FavoritesPage() {
  const shop = await currentShop();
  if (!shop) return <ShopUnavailable />;
  const t = await getTranslations('favorites');

  return (
    <div>
      <h1 className="font-[family-name:var(--font-display)] text-2xl font-bold">{t('title')}</h1>
      <p className="mt-1 text-sm text-[var(--color-muted)]">{t('subtitle')}</p>
      <div className="mt-6">
        <FavoritesList />
      </div>
    </div>
  );
}

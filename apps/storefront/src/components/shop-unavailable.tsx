import { getTranslations } from 'next-intl/server';

export async function ShopUnavailable() {
  const t = await getTranslations('errors');
  return (
    <div className="py-20 text-center">
      <h1 className="font-[family-name:var(--font-display)] text-xl font-bold">
        {t('shopUnavailableTitle')}
      </h1>
      <p className="mt-2 text-[var(--color-muted)]">{t('shopUnavailableBody')}</p>
    </div>
  );
}

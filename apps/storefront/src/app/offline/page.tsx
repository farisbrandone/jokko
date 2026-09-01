import Link from 'next/link';
import { getTranslations } from 'next-intl/server';

export const metadata = { title: 'Hors ligne / Offline' };

export default async function OfflinePage() {
  const t = await getTranslations('errors');
  return (
    <div className="py-20 text-center">
      <h1 className="font-[family-name:var(--font-display)] text-xl font-bold">
        {t('offlineTitle')}
      </h1>
      <p className="mt-2 text-[var(--color-muted)]">{t('offlineBody')}</p>
      <p className="mt-4">
        <Link href="/" className="text-[var(--color-brand)] underline">
          {t('retry')}
        </Link>
      </p>
    </div>
  );
}

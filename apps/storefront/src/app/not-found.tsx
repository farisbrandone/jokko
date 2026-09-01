import Link from 'next/link';
import { getTranslations } from 'next-intl/server';

export default async function NotFound() {
  const t = await getTranslations('errors');
  return (
    <div className="py-20 text-center">
      <h1 className="font-[family-name:var(--font-display)] text-xl font-bold">
        {t('notFoundTitle')}
      </h1>
      <p className="mt-2">
        <Link href="/" className="text-[var(--color-brand)] underline">
          {t('backToShop')}
        </Link>
      </p>
    </div>
  );
}

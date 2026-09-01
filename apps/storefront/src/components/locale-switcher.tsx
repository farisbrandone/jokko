'use client';

import { useTransition } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';

const LOCALES = ['fr', 'en'] as const;

export function LocaleSwitcher() {
  const active = useLocale();
  const t = useTranslations('locale');
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const set = (loc: string) => {
    document.cookie = `NEXT_LOCALE=${loc}; path=/; max-age=31536000; samesite=lax`;
    startTransition(() => router.refresh());
  };

  return (
    <div className="flex items-center gap-1" aria-label={t('label')}>
      {LOCALES.map((loc) => (
        <button
          key={loc}
          onClick={() => set(loc)}
          disabled={pending || loc === active}
          className={`rounded px-1.5 py-0.5 text-xs uppercase ${
            loc === active
              ? 'font-semibold text-[var(--color-ink)]'
              : 'text-[var(--color-muted)] hover:text-[var(--color-ink)]'
          }`}
        >
          {loc}
        </button>
      ))}
    </div>
  );
}

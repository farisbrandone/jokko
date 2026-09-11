'use client';

import { useTranslations } from 'next-intl';
import { useDisplayCurrency, setDisplayCurrency, type DisplayPref } from '@/lib/currency-store';

const OPTIONS: DisplayPref[] = ['none', 'EUR', 'USD'];

export function CurrencySwitcher() {
  const active = useDisplayCurrency();
  const t = useTranslations('currency');

  return (
    <div className="flex items-center gap-1" aria-label={t('label')} title={t('disclaimer')}>
      {OPTIONS.map((opt) => (
        <button
          key={opt}
          type="button"
          onClick={() => setDisplayCurrency(opt)}
          disabled={opt === active}
          className={`rounded px-1.5 py-0.5 text-xs uppercase ${
            opt === active
              ? 'font-semibold text-[var(--color-ink)]'
              : 'text-[var(--color-muted)] hover:text-[var(--color-ink)]'
          }`}
        >
          {opt === 'none' ? t('none') : opt}
        </button>
      ))}
    </div>
  );
}

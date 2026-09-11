'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useDisplayCurrency } from '@/lib/currency-store';
import { formatEstimate } from '@/lib/fx';

/** Estimation « ≈ 18,80 € » à côté d'un prix — masquée si le visiteur n'a pas activé l'affichage. */
export function PriceEstimate({
  amount,
  currency,
  className,
}: {
  amount: number;
  currency: string;
  className?: string;
}) {
  const pref = useDisplayCurrency();
  const locale = useLocale();
  const t = useTranslations('currency');

  if (pref === 'none') return null;
  const text = formatEstimate(amount, currency, pref, locale);
  if (!text) return null;

  return (
    <span className={className ?? 'text-[var(--color-faint)]'} title={t('disclaimer')}>
      {' '}
      ≈ {text}
    </span>
  );
}

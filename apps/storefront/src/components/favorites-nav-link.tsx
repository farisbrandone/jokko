'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useFavorites } from '@/lib/favorites';

export function FavoritesNavLink() {
  const t = useTranslations('nav');
  const ids = useFavorites();
  if (ids.length === 0) return null;
  return (
    <Link
      href="/favoris"
      className="relative shrink-0 rounded-[var(--radius-btn)] border border-[var(--color-border)] px-3 py-2 text-sm font-medium"
      aria-label={`${t('favorites')} (${ids.length})`}
    >
      {t('favorites')}
      <span className="ml-1 rounded-full bg-[var(--color-brand)] px-1.5 text-xs text-[var(--color-brand-ink)]">
        {ids.length}
      </span>
    </Link>
  );
}

'use client';

import { useTranslations } from 'next-intl';
import { favorites, useIsFavorite } from '@/lib/favorites';

/** Cœur plein/vide — favori sans compte, stocké sur cet appareil. */
export function FavoriteButton({
  productId,
  variant = 'overlay',
}: {
  productId: string;
  /** `overlay` : rond flottant sur une image de carte. `inline` : bouton autonome. */
  variant?: 'overlay' | 'inline';
}) {
  const t = useTranslations('product');
  const active = useIsFavorite(productId);
  const label = active ? t('removeFromFavorites') : t('addToFavorites');

  const onClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    favorites.toggle(productId);
  };

  const base =
    variant === 'overlay'
      ? // Coin bas-droit de l'image : les badges rupture/promo occupent déjà le haut.
        'absolute bottom-2 right-2 z-10 grid h-8 w-8 place-items-center rounded-full bg-[var(--color-bg)]/80 backdrop-blur transition-transform hover:scale-110'
      : 'inline-flex items-center gap-1.5 rounded-[var(--radius-btn)] border border-[var(--color-border)] px-3 py-2 text-sm hover:bg-[var(--color-surface-2)]';

  return (
    <button type="button" onClick={onClick} aria-pressed={active} aria-label={label} title={label} className={base}>
      <svg
        viewBox="0 0 24 24"
        className="h-[18px] w-[18px]"
        fill={active ? 'currentColor' : 'none'}
        stroke="currentColor"
        strokeWidth={1.8}
        style={{ color: active ? 'var(--color-danger)' : 'currentColor' }}
      >
        <path d="M12 20.5s-7.5-4.6-10-9.2C.4 8 1.7 4.5 5 3.4c2.2-.7 4.4.2 5.6 2 .3.5.9.5 1.2 0 1.2-1.8 3.4-2.7 5.6-2 3.3 1.1 4.6 4.6 3 7.9-2.5 4.6-10 9.2-10 9.2Z" />
      </svg>
      {variant === 'inline' ? <span>{label}</span> : null}
    </button>
  );
}

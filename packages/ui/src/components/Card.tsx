import type { HTMLAttributes } from 'react';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  /** Retire le padding interne (utile pour les listes/tables). */
  flush?: boolean;
}

/** Conteneur de surface : fond, bordure et rayon du système de design. */
export function Card({ flush = false, style, ...rest }: CardProps) {
  return (
    <div
      {...rest}
      style={{
        background: 'var(--color-surface, #fff)',
        border: '1px solid var(--color-border, hsl(40 12% 88%))',
        borderRadius: 'var(--radius-card, 0.75rem)',
        padding: flush ? 0 : '1rem',
        color: 'var(--color-ink, hsl(30 10% 12%))',
        ...style,
      }}
    />
  );
}

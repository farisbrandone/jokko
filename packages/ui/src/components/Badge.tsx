import type { CSSProperties, ReactNode } from 'react';

export type BadgeTone = 'neutral' | 'brand' | 'good' | 'danger';

const tones: Record<BadgeTone, CSSProperties> = {
  neutral: {
    background: 'var(--color-surface-2, hsl(40 20% 95%))',
    color: 'var(--color-muted, hsl(30 6% 40%))',
  },
  brand: {
    background: 'var(--color-brand-soft, hsl(28 70% 94%))',
    color: 'var(--color-brand, hsl(24 84% 45%))',
  },
  good: { background: 'hsl(160 60% 34% / 0.14)', color: 'var(--color-good, hsl(160 60% 34%))' },
  danger: { background: 'hsl(2 68% 48% / 0.14)', color: 'var(--color-danger, hsl(2 68% 48%))' },
};

export interface BadgeProps {
  tone?: BadgeTone;
  children: ReactNode;
}

/** Pastille d'état (statut de commande, rôle, etc.). */
export function Badge({ tone = 'neutral', children }: BadgeProps) {
  return (
    <span
      style={{
        ...tones[tone],
        display: 'inline-flex',
        alignItems: 'center',
        borderRadius: '999px',
        padding: '0.15rem 0.55rem',
        fontSize: '0.75rem',
        fontWeight: 600,
        lineHeight: 1.4,
      }}
    >
      {children}
    </span>
  );
}

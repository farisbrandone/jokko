import type { ButtonHTMLAttributes, CSSProperties } from 'react';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md';

const base: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '0.5rem',
  borderRadius: 'var(--radius-btn, 0.625rem)',
  fontWeight: 600,
  lineHeight: 1.2,
  border: '1px solid transparent',
  fontFamily: 'inherit',
  textDecoration: 'none',
  transition: 'opacity .15s ease',
};

const sizes: Record<ButtonSize, CSSProperties> = {
  sm: { padding: '0.35rem 0.7rem', fontSize: '0.8125rem' },
  md: { padding: '0.55rem 1rem', fontSize: '0.875rem' },
};

const variants: Record<ButtonVariant, CSSProperties> = {
  primary: {
    background: 'var(--color-brand, hsl(24 84% 45%))',
    color: 'var(--color-brand-ink, #fff)',
  },
  secondary: {
    background: 'var(--color-surface, #fff)',
    color: 'var(--color-ink, hsl(30 10% 12%))',
    borderColor: 'var(--color-border, hsl(40 12% 88%))',
  },
  ghost: { background: 'transparent', color: 'var(--color-ink, hsl(30 10% 12%))' },
  danger: { background: 'var(--color-danger, hsl(2 68% 48%))', color: '#fff' },
};

/** Styles du bouton du design system — réutilisable sur un `<a>`/`<Link>`. */
export function buttonStyles(opts: {
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
} = {}): CSSProperties {
  const { variant = 'primary', size = 'md', disabled = false } = opts;
  return {
    ...base,
    ...sizes[size],
    ...variants[variant],
    opacity: disabled ? 0.5 : 1,
    cursor: disabled ? 'not-allowed' : 'pointer',
  };
}

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

/** Bouton du système de design Jokko — stylé par variables CSS (thème d'app). */
export function Button({
  variant = 'primary',
  size = 'md',
  style,
  disabled,
  ...rest
}: ButtonProps) {
  return (
    <button
      {...rest}
      disabled={disabled}
      style={{ ...buttonStyles({ variant, size, disabled: !!disabled }), ...style }}
    />
  );
}

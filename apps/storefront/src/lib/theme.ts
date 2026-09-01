const HEX_RE = /^#[0-9a-f]{6}$/i;

function channels(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** Noir ou blanc selon la luminance relative WCAG — pour le texte sur la couleur de marque. */
export function brandInk(hex: string): string {
  const lin = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  const [r, g, b] = channels(hex);
  const luminance = 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
  return luminance > 0.42 ? '#1c1917' : '#ffffff';
}

/** Assombrit une couleur hex (0 → identique, 1 → noir ; négatif → éclaircit). */
export function darken(hex: string, amount: number): string {
  const clamp = (c: number) => Math.max(0, Math.min(255, Math.round(c * (1 - amount))));
  const [r, g, b] = channels(hex).map(clamp);
  return `#${[r, g, b].map((c) => c.toString(16).padStart(2, '0')).join('')}`;
}

/**
 * Bloc CSS surchargeant les tokens de marque pour la boutique courante.
 * `--color-brand-soft` via `color-mix` (large support navigateur 2023+).
 */
export function brandThemeCss(brandColor: string | null | undefined): string | null {
  if (!brandColor || !HEX_RE.test(brandColor)) return null;
  const hex = brandColor.toLowerCase();
  return [
    ':root{',
    `--color-brand:${hex};`,
    `--color-brand-ink:${brandInk(hex)};`,
    `--color-brand-soft:color-mix(in srgb, ${hex} 14%, white);`,
    '}',
    `@media (prefers-color-scheme: dark){:root:not([data-theme="light"]){`,
    `--color-brand-soft:color-mix(in srgb, ${hex} 26%, black);`,
    '}}',
  ].join('');
}

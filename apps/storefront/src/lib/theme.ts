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
export function brandThemeCss(
  brandColor: string | null | undefined,
  accentColor?: string | null,
): string | null {
  const brand = brandColor && HEX_RE.test(brandColor) ? brandColor.toLowerCase() : null;
  const accent = accentColor && HEX_RE.test(accentColor) ? accentColor.toLowerCase() : null;
  if (!brand && !accent) return null;

  const light: string[] = [];
  const dark: string[] = [];
  if (brand) {
    light.push(
      `--color-brand:${brand};`,
      `--color-brand-ink:${brandInk(brand)};`,
      `--color-brand-soft:color-mix(in srgb, ${brand} 14%, white);`,
    );
    dark.push(`--color-brand-soft:color-mix(in srgb, ${brand} 26%, black);`);
  }
  if (accent) {
    light.push(
      `--color-accent:${accent};`,
      `--color-accent-ink:${brandInk(accent)};`,
      `--color-accent-soft:color-mix(in srgb, ${accent} 14%, white);`,
    );
    dark.push(`--color-accent-soft:color-mix(in srgb, ${accent} 26%, black);`);
  }
  return [
    ':root{',
    light.join(''),
    '}',
    `@media (prefers-color-scheme: dark){:root:not([data-theme="light"]){`,
    dark.join(''),
    '}}',
  ].join('');
}

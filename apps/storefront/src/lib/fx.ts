/**
 * Estimation de prix en devise étrangère, pour les acheteurs de la diaspora —
 * jamais la devise réellement facturée (toujours celle de la boutique, XOF).
 *
 * Le XOF (et le XAF) est arrimé à l'euro à un taux fixe depuis 1999
 * (mécanisme de caisse d'émission, pas un taux de marché) : la conversion
 * en EUR est donc exacte. La conversion en USD dépend elle du taux
 * EUR/USD, qui flotte — la valeur ci-dessous est une approximation
 * statique (fixée le 2026-09-11) à ajuster périodiquement ; elle n'a pas
 * vocation à être précise à la journée.
 */
const XOF_PER_EUR = 655.957;
const EUR_PER_USD_APPROX = 1.08;

const PEGGED_CURRENCIES = new Set(['XOF', 'XAF']);

export type DisplayCurrency = 'EUR' | 'USD';

/** `null` si la devise d'origine n'est pas arrimée à l'euro (pas d'estimation fiable). */
export function estimateAmount(
  amountMinor: number,
  fromCurrency: string,
  to: DisplayCurrency,
): number | null {
  if (!PEGGED_CURRENCIES.has(fromCurrency)) return null;
  // XOF/XAF sont des devises « zéro décimale » : amountMinor est déjà l'unité majeure.
  const eur = amountMinor / XOF_PER_EUR;
  return to === 'EUR' ? eur : eur * EUR_PER_USD_APPROX;
}

export function formatEstimate(
  amountMinor: number,
  fromCurrency: string,
  to: DisplayCurrency,
  locale: string,
): string | null {
  const value = estimateAmount(amountMinor, fromCurrency, to);
  if (value === null) return null;
  try {
    return new Intl.NumberFormat(locale, { style: 'currency', currency: to }).format(value);
  } catch {
    return `${value.toFixed(2)} ${to}`;
  }
}

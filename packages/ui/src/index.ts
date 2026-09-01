export type ClassValue = string | number | false | null | undefined | ClassValue[];

/** Concatène des classes conditionnelles (mini-clsx). */
export function cn(...values: ClassValue[]): string {
  const out: string[] = [];
  for (const v of values) {
    if (!v) continue;
    if (Array.isArray(v)) out.push(cn(...v));
    else out.push(String(v));
  }
  return out.join(' ');
}

const ZERO_DECIMAL = new Set(['XOF', 'XAF', 'JPY', 'KRW', 'CLP', 'VND']);

/** Formate un montant exprimé dans la plus petite unité de la devise. */
export function formatMoney(amount: number, currency = 'XOF', locale = 'fr'): string {
  const factor = ZERO_DECIMAL.has(currency) ? 1 : 100;
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      maximumFractionDigits: factor === 1 ? 0 : 2,
    }).format(amount / factor);
  } catch {
    return `${(amount / factor).toLocaleString(locale)} ${currency}`;
  }
}

/** Lien WhatsApp pré-rempli. `phone` au format E.164 sans « + » ni espaces. */
export function whatsappLink(phone: string, text: string): string {
  return `https://wa.me/${phone.replace(/[^\d]/g, '')}?text=${encodeURIComponent(text)}`;
}

export function smsLink(phone: string, body: string): string {
  return `sms:${phone}?body=${encodeURIComponent(body)}`;
}

export function telLink(phone: string): string {
  return `tel:${phone}`;
}

export {
  LEGAL_DOCUMENTS,
  LEGAL_SLUGS,
  LEGAL_UPDATED,
  type LegalDocument,
  type LegalSection,
  type LegalSlug,
} from './legal';

export { Button, type ButtonProps, type ButtonVariant, type ButtonSize } from './components/Button';
export { Badge, type BadgeProps, type BadgeTone } from './components/Badge';
export { Card, type CardProps } from './components/Card';

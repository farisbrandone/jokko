import { cookies, headers } from 'next/headers';
import { getRequestConfig } from 'next-intl/server';
import { SHOP_HEADER } from '@/lib/shop';

export const SUPPORTED_LOCALES = ['fr', 'en'] as const;
export type AppLocale = (typeof SUPPORTED_LOCALES)[number];
export const LOCALE_COOKIE = 'NEXT_LOCALE';

function supported(v: string | undefined | null): v is AppLocale {
  return !!v && (SUPPORTED_LOCALES as readonly string[]).includes(v);
}

/**
 * Locale de la requête, sans routing par URL :
 *  1. cookie `NEXT_LOCALE` choisi par le visiteur
 *  2. `locale` par défaut de la boutique (en-tête injecté par le middleware)
 *  3. repli `fr`
 */
export default getRequestConfig(async () => {
  const cookieLocale = (await cookies()).get(LOCALE_COOKIE)?.value;
  let locale: AppLocale | null = supported(cookieLocale) ? cookieLocale : null;

  if (!locale) {
    const raw = (await headers()).get(SHOP_HEADER);
    if (raw) {
      try {
        const shop = JSON.parse(decodeURIComponent(raw)) as { locale?: string };
        if (supported(shop.locale)) locale = shop.locale;
      } catch {
        /* en-tête illisible */
      }
    }
  }

  locale ??= 'fr';
  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
  };
});

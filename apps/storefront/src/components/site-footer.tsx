import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import type { ShopView } from '@/lib/api';
import { LocaleSwitcher } from './locale-switcher';
import { CurrencySwitcher } from './currency-switcher';

export async function SiteFooter({ shop }: { shop: ShopView | null }) {
  const t = await getTranslations('footer');
  // XOF/XAF sont tous deux vulgairement appelés « FCFA » en Afrique de
  // l'Ouest et Centrale — on affiche ce libellé plutôt que le code ISO.
  const cur = shop?.currency ?? 'XOF';
  const currencyLabel = cur === 'XOF' || cur === 'XAF' ? 'FCFA' : cur;
  return (
    <footer className="border-t border-[var(--color-border)] bg-[var(--color-surface)] mt-8">
      <div className="mx-auto max-w-6xl px-4 py-6 text-sm text-[var(--color-muted)] flex flex-wrap items-center gap-x-6 gap-y-2 justify-between">
        <span>{shop ? t('poweredBy', { shop: shop.name }) : 'Jokko'}</span>
        <nav className="flex flex-wrap items-center gap-x-4 gap-y-1">
          <Link href="/cgu" className="hover:underline">
            {t('terms')}
          </Link>
          <Link href="/confidentialite" className="hover:underline">
            {t('privacy')}
          </Link>
          <Link href="/mentions-legales" className="hover:underline">
            {t('legal')}
          </Link>
        </nav>
        <div className="flex items-center gap-4">
          <span>{currencyLabel}</span>
          <CurrencySwitcher />
          <LocaleSwitcher />
        </div>
      </div>
    </footer>
  );
}

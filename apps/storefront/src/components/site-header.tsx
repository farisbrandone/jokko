import Link from 'next/link';
import { getLocale, getTranslations } from 'next-intl/server';
import { whatsappLink } from '@jokko/ui';
import type { ShopView } from '@/lib/api';
import { DASHBOARD_URL, landingContent } from '@/lib/landing-content';
import type { AppLocale } from '@/i18n/request';
import { SearchBox } from './search-box';
import { CartButton } from './cart-button';

export async function SiteHeader({ shop }: { shop: ShopView | null }) {
  const t = await getTranslations('nav');

  // Domaine apex (pas de boutique) : en-tête « site Jokko », pas de recherche produit.
  if (!shop) {
    const locale = (await getLocale()) as AppLocale;
    const c = landingContent(locale);
    return (
      <header className="border-b border-[var(--color-border)] bg-[var(--color-surface)]">
        <div className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-3">
          <Link href="/" className="font-[family-name:var(--font-display)] text-lg font-bold shrink-0">
            Jokko
          </Link>
          <nav className="ml-auto flex items-center gap-4 text-sm">
            <Link
              href="/boutiques"
              className="hidden text-[var(--color-muted)] hover:text-[var(--color-ink)] sm:inline"
            >
              {c.hero.ctaSecondary}
            </Link>
            <a
              href={DASHBOARD_URL}
              className="rounded-[var(--radius-btn)] bg-[var(--color-brand)] px-3 py-2 font-medium text-[var(--color-brand-ink)]"
            >
              {c.hero.ctaPrimary}
            </a>
          </nav>
        </div>
      </header>
    );
  }

  return (
    <header className="border-b border-[var(--color-border)] bg-[var(--color-surface)]">
      <div className="mx-auto max-w-6xl px-4 py-3 flex items-center gap-4">
        <Link
          href="/"
          className="font-[family-name:var(--font-display)] font-bold text-lg shrink-0"
        >
          {shop.name}
        </Link>
        <div className="flex-1 max-w-md">
          <SearchBox />
        </div>
        <CartButton />
        {shop.whatsapp ? (
          <a
            href={whatsappLink(shop.whatsapp, `${shop.name}, `)}
            target="_blank"
            rel="noreferrer"
            className="shrink-0 rounded-[var(--radius-btn)] bg-[var(--color-brand)] text-[var(--color-brand-ink)] px-3 py-2 text-sm font-medium"
          >
            {t('whatsapp')}
          </a>
        ) : null}
      </div>
    </header>
  );
}

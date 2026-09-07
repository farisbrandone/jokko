import type { Metadata } from 'next';
import { getLocale, getTranslations } from 'next-intl/server';
import { currentShop, siteUrl } from '@/lib/shop';
import { getDirectory, searchProducts } from '@/lib/api';
import { landingContent } from '@/lib/landing-content';
import { ProductGrid } from '@/components/product-grid';
import { Facets } from '@/components/facets';
import { LandingPage } from '@/components/landing/landing-page';
import type { AppLocale } from '@/i18n/request';

export const revalidate = 60;

export async function generateMetadata(): Promise<Metadata> {
  const shop = await currentShop();
  if (shop) return {}; // la home de boutique hérite des métadonnées du layout

  const [base, locale] = await Promise.all([siteUrl(), getLocale()]);
  const c = landingContent(locale as AppLocale);
  return {
    title: c.meta.title,
    description: c.meta.description,
    keywords: c.meta.keywords,
    alternates: { canonical: '/' },
    openGraph: {
      type: 'website',
      siteName: 'Jokko',
      title: c.meta.title,
      description: c.meta.description,
      url: base,
      locale: locale.replace('-', '_'),
    },
    twitter: { card: 'summary_large_image', title: c.meta.title, description: c.meta.description },
  };
}

export default async function HomePage() {
  const shop = await currentShop();

  // Domaine apex : page d'accueil marketing + aperçu de l'annuaire.
  if (!shop) {
    const [base, locale, directory] = await Promise.all([
      siteUrl(),
      getLocale(),
      getDirectory({ page: 1 }).catch(() => ({ items: [], total: 0, page: 1, pageSize: 24 })),
    ]);
    return (
      <LandingPage locale={locale as AppLocale} apex={base} featured={directory.items} />
    );
  }

  const [results, t] = await Promise.all([
    searchProducts(shop.id, { sort: 'newest', pageSize: 24 }),
    getTranslations('home'),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <section className="rounded-[var(--radius-card)] bg-[var(--color-brand-soft)] px-5 py-8">
        <h1 className="font-[family-name:var(--font-display)] text-2xl font-bold">
          {shop.name}
        </h1>
        <p className="mt-1 text-[var(--color-muted)]">
          {t('tagline')} {t('productsAvailable', { count: results.total })}
        </p>
      </section>

      <div className="grid md:grid-cols-[180px_1fr] gap-6">
        <aside className="hidden md:block">
          <Facets basePath="/" facets={results.facets} />
        </aside>
        <ProductGrid hits={results.items} />
      </div>
    </div>
  );
}

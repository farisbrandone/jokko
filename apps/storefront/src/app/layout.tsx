import type { Metadata, Viewport } from 'next';
import {
  Bricolage_Grotesque,
  Inter,
  Nunito_Sans,
  Playfair_Display,
  Poppins,
  Source_Sans_3,
  Space_Grotesk,
} from 'next/font/google';
import { NextIntlClientProvider } from 'next-intl';
import { getLocale, getMessages } from 'next-intl/server';
import { SHOP_PALETTES, type ShopPaletteId } from '@jokko/contracts';
import './globals.css';
import { currentShop, siteUrl } from '@/lib/shop';
import { paletteThemeCss } from '@/lib/theme';
import { SiteHeader } from '@/components/site-header';
import { SiteFooter } from '@/components/site-footer';
import { PageViewTracker } from '@/components/track-event';
import { ServiceWorkerRegistrar } from '@/components/sw-register';
import { InstallPrompt } from '@/components/install-prompt';

const HEX_RE = /^#[0-9a-f]{6}$/i;

// Palette « modern » (défaut) — pilote directement --font-display/--font-sans.
const display = Bricolage_Grotesque({
  subsets: ['latin'],
  variable: '--font-display',
  weight: ['500', '600', '700'],
});
const sans = Inter({ subsets: ['latin'], variable: '--font-sans' });

// Paires supplémentaires des autres palettes — chargées une fois, activées
// par boutique via une variable CSS (voir `paletteThemeCss`).
const editorialDisplay = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-editorial-display',
  weight: ['600', '700'],
});
const editorialSans = Source_Sans_3({ subsets: ['latin'], variable: '--font-editorial-sans' });
const friendlyDisplay = Poppins({
  subsets: ['latin'],
  variable: '--font-friendly-display',
  weight: ['600', '700'],
});
const friendlySans = Nunito_Sans({ subsets: ['latin'], variable: '--font-friendly-sans' });
const boldDisplay = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-bold-display',
  weight: ['500', '600', '700'],
});
const boldSans = Space_Grotesk({ subsets: ['latin'], variable: '--font-bold-sans' });

const paletteFontVars = [
  editorialDisplay.variable,
  editorialSans.variable,
  friendlyDisplay.variable,
  friendlySans.variable,
  boldDisplay.variable,
  boldSans.variable,
].join(' ');

export async function generateMetadata(): Promise<Metadata> {
  const [shop, base] = await Promise.all([currentShop(), siteUrl()]);
  const title = shop?.name ?? 'Jokko';
  const description = shop
    ? `La boutique ${shop.name} — parcourez toute la gamme et contactez le vendeur directement.`
    : 'Boutiques sociales Jokko';
  return {
    metadataBase: new URL(base),
    title: shop ? { default: shop.name, template: `%s · ${shop.name}` } : 'Jokko',
    description,
    applicationName: title,
    alternates: { canonical: '/' },
    openGraph: {
      type: 'website',
      siteName: title,
      title,
      description,
      url: '/',
      locale: (shop?.locale ?? 'fr').replace('-', '_'),
    },
    twitter: { card: 'summary_large_image', title, description },
    appleWebApp: { capable: true, title, statusBarStyle: 'default' },
  };
}

export async function generateViewport(): Promise<Viewport> {
  const shop = await currentShop();
  const palette =
    shop?.themePalette && shop.themePalette !== 'custom'
      ? SHOP_PALETTES[shop.themePalette as Exclude<ShopPaletteId, 'custom'>]
      : undefined;
  const brand =
    palette?.accent ??
    (shop?.brandColor && HEX_RE.test(shop.brandColor) ? shop.brandColor : '#c2410c');
  return {
    themeColor: brand,
    colorScheme: 'light dark',
  };
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const [shop, locale, messages] = await Promise.all([
    currentShop(),
    getLocale(),
    getMessages(),
  ]);
  const themeCss = paletteThemeCss(shop?.themePalette, shop?.brandColor, shop?.accentColor);
  return (
    <html
      lang={locale}
      className={`${display.variable} ${sans.variable} ${paletteFontVars}`}
    >
      {themeCss ? (
        <head>
          <style dangerouslySetInnerHTML={{ __html: themeCss }} />
        </head>
      ) : null}
      <body className="min-h-dvh flex flex-col">
        <NextIntlClientProvider locale={locale} messages={messages}>
          <ServiceWorkerRegistrar />
          {shop ? <PageViewTracker /> : null}
          {shop?.announcement ? (
            <div className="bg-[var(--color-brand)] px-4 py-1.5 text-center text-xs font-medium text-[var(--color-brand-ink)]">
              {shop.announcement}
            </div>
          ) : null}
          <SiteHeader shop={shop} />
          <main className="flex-1 w-full mx-auto max-w-6xl px-4 py-6">{children}</main>
          <SiteFooter shop={shop} />
          <InstallPrompt />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}

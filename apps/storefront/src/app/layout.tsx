import type { Metadata } from 'next';
import { Bricolage_Grotesque, Inter } from 'next/font/google';
import './globals.css';
import { currentShop, siteUrl } from '@/lib/shop';
import { brandThemeCss } from '@/lib/theme';
import { SiteHeader } from '@/components/site-header';
import { SiteFooter } from '@/components/site-footer';
import { PageViewTracker } from '@/components/track-event';

const display = Bricolage_Grotesque({
  subsets: ['latin'],
  variable: '--font-display',
  weight: ['500', '600', '700'],
});
const sans = Inter({ subsets: ['latin'], variable: '--font-sans' });

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
  };
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const shop = await currentShop();
  const themeCss = brandThemeCss(shop?.brandColor);
  return (
    <html lang={shop?.locale ?? 'fr'} className={`${display.variable} ${sans.variable}`}>
      {themeCss ? (
        <head>
          <style dangerouslySetInnerHTML={{ __html: themeCss }} />
          <meta name="theme-color" content={shop?.brandColor ?? ''} />
        </head>
      ) : null}
      <body className="min-h-dvh flex flex-col">
        {shop ? <PageViewTracker /> : null}
        <SiteHeader shop={shop} />
        <main className="flex-1 w-full mx-auto max-w-6xl px-4 py-6">{children}</main>
        <SiteFooter shop={shop} />
      </body>
    </html>
  );
}

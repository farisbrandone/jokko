import type { Metadata } from 'next';
import { Bricolage_Grotesque, Inter } from 'next/font/google';
import './globals.css';
import { currentShop } from '@/lib/shop';
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
  const shop = await currentShop();
  return {
    title: shop ? { default: shop.name, template: `%s · ${shop.name}` } : 'Jokko',
    description: shop
      ? `La boutique ${shop.name} — parcourez toute la gamme.`
      : 'Boutiques sociales Jokko',
  };
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const shop = await currentShop();
  return (
    <html lang={shop?.locale ?? 'fr'} className={`${display.variable} ${sans.variable}`}>
      <body className="min-h-dvh flex flex-col">
        {shop ? <PageViewTracker /> : null}
        <SiteHeader shop={shop} />
        <main className="flex-1 w-full mx-auto max-w-6xl px-4 py-6">{children}</main>
        <SiteFooter shop={shop} />
      </body>
    </html>
  );
}

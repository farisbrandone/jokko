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
import './globals.css';
import { apiJson } from '@/lib/api';
import type { SessionUser } from '@/lib/types';
import { SupportBanner } from '@/components/support-banner';
import { QueryProvider } from '@/components/query-provider';

const display = Bricolage_Grotesque({
  subsets: ['latin'],
  variable: '--font-display',
  weight: ['500', '600', '700'],
});
const sans = Inter({ subsets: ['latin'], variable: '--font-sans' });

// Paires supplémentaires des palettes de boutique — chargées pour que
// l'aperçu en direct des Réglages affiche les vraies polices.
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

export const metadata: Metadata = {
  title: 'Jokko · Espace vendeur',
};

export const viewport: Viewport = {
  colorScheme: 'light dark',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#faf9f7' },
    { media: '(prefers-color-scheme: dark)', color: '#141210' },
  ],
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  let impersonatedEmail: string | null = null;
  try {
    const me = await apiJson<SessionUser>('/auth/me');
    if (me.impersonatedBy) impersonatedEmail = me.email;
  } catch {
    /* non connecté : pas de bandeau */
  }

  return (
    <html lang="fr" className={`${display.variable} ${sans.variable} ${paletteFontVars}`}>
      <body className="min-h-dvh">
        <QueryProvider>
          {impersonatedEmail ? <SupportBanner email={impersonatedEmail} /> : null}
          {children}
        </QueryProvider>
      </body>
    </html>
  );
}

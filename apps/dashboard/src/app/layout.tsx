import type { Metadata } from 'next';
import { Bricolage_Grotesque, Inter } from 'next/font/google';
import './globals.css';
import { apiJson } from '@/lib/api';
import type { SessionUser } from '@/lib/types';
import { SupportBanner } from '@/components/support-banner';

const display = Bricolage_Grotesque({
  subsets: ['latin'],
  variable: '--font-display',
  weight: ['500', '600', '700'],
});
const sans = Inter({ subsets: ['latin'], variable: '--font-sans' });

export const metadata: Metadata = {
  title: 'Jokko · Espace vendeur',
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
    <html lang="fr" className={`${display.variable} ${sans.variable}`}>
      <body className="min-h-dvh">
        {impersonatedEmail ? <SupportBanner email={impersonatedEmail} /> : null}
        {children}
      </body>
    </html>
  );
}

import Link from 'next/link';

/** Liens légaux — pied de page du tableau de bord et écran de connexion. */
export function LegalLinks({ className = '' }: { className?: string }) {
  return (
    <nav
      className={`flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[var(--color-muted)] ${className}`}
    >
      <Link href="/legal/cgu" className="hover:underline">
        CGU
      </Link>
      <Link href="/legal/confidentialite" className="hover:underline">
        Confidentialité
      </Link>
      <Link href="/legal/mentions-legales" className="hover:underline">
        Mentions légales
      </Link>
    </nav>
  );
}

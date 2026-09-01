import Link from 'next/link';

export const metadata = { title: 'Hors ligne' };

export default function OfflinePage() {
  return (
    <div className="py-20 text-center">
      <h1 className="font-[family-name:var(--font-display)] text-xl font-bold">
        Vous êtes hors ligne
      </h1>
      <p className="mt-2 text-[var(--color-muted)]">
        Reconnectez-vous pour voir les derniers produits.
      </p>
      <p className="mt-4">
        <Link href="/" className="text-[var(--color-brand)] underline">
          Réessayer
        </Link>
      </p>
    </div>
  );
}

import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="py-20 text-center">
      <h1 className="font-[family-name:var(--font-display)] text-xl font-bold">
        Page introuvable
      </h1>
      <p className="mt-2">
        <Link href="/" className="text-[var(--color-brand)] underline">
          Retour à la boutique
        </Link>
      </p>
    </div>
  );
}

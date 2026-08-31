export function ShopUnavailable() {
  return (
    <div className="py-20 text-center">
      <h1 className="font-[family-name:var(--font-display)] text-xl font-bold">
        Boutique introuvable
      </h1>
      <p className="mt-2 text-[var(--color-muted)]">
        Ce lien ne correspond à aucune boutique, ou le service est momentanément
        indisponible.
      </p>
    </div>
  );
}

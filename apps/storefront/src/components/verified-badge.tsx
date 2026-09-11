/** Badge « boutique vérifiée » — contrôle de registre effectué par l'équipe Jokko. */
export function VerifiedBadge({ title = 'Boutique vérifiée' }: { title?: string }) {
  return (
    <span
      title={title}
      aria-label={title}
      className="inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-[var(--color-brand)] text-[10px] text-[var(--color-brand-ink)]"
    >
      ✓
    </span>
  );
}

'use client';

export function PrintButton({ label = 'Imprimer / Enregistrer en PDF' }: { label?: string }) {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="no-print rounded-[var(--radius-btn)] bg-[var(--color-brand)] px-4 py-2 text-sm font-semibold text-[var(--color-brand-ink)]"
    >
      {label}
    </button>
  );
}

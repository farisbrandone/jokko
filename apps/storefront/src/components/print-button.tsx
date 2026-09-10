'use client';

export function PrintButton({ label = 'Imprimer / Enregistrer en PDF' }: { label?: string }) {
  return (
    <div className="no-print mx-auto max-w-[720px] px-8 pt-6">
      <button
        type="button"
        onClick={() => window.print()}
        className="rounded-[var(--radius-btn)] bg-[var(--color-brand)] px-4 py-2 text-sm font-semibold text-[var(--color-brand-ink)]"
      >
        {label}
      </button>
    </div>
  );
}

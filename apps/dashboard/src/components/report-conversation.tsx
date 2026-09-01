'use client';

import { useState } from 'react';
import { post } from '@/lib/client';

const REASONS = [
  { value: 'scam', label: 'Arnaque / fraude' },
  { value: 'offensive', label: 'Contenu choquant / harcèlement' },
  { value: 'spam', label: 'Spam' },
  { value: 'other', label: 'Autre' },
];

export function ReportConversation({ shopId, convId }: { shopId: string; convId: string }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('scam');
  const [note, setNote] = useState('');
  const [state, setState] = useState<'idle' | 'sending' | 'done' | 'error'>('idle');

  if (state === 'done') {
    return (
      <p className="text-xs text-[var(--color-muted)]">
        Signalement transmis à l’équipe Jokko.
      </p>
    );
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-xs text-[var(--color-faint)] underline underline-offset-2"
      >
        Signaler cette conversation
      </button>
    );
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setState('sending');
    try {
      await post(`/api/proxy/shops/${shopId}/reports`, {
        targetType: 'conversation',
        targetId: convId,
        reason,
        note,
        reporterKey: `seller:${shopId}`,
      });
      setState('done');
    } catch {
      setState('error');
    }
  };

  return (
    <form
      onSubmit={submit}
      className="mt-2 flex flex-col gap-2 rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] p-3 text-sm"
    >
      <select
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        className="rounded-[var(--radius-btn)] border border-[var(--color-border)] bg-[var(--color-bg)] px-2 py-1.5"
      >
        {REASONS.map((r) => (
          <option key={r.value} value={r.value}>
            {r.label}
          </option>
        ))}
      </select>
      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        maxLength={500}
        rows={2}
        placeholder="Détail (facultatif)"
        className="rounded-[var(--radius-btn)] border border-[var(--color-border)] bg-[var(--color-bg)] px-2 py-1.5"
      />
      {state === 'error' ? (
        <p className="text-xs text-[var(--color-danger)]">Envoi impossible. Réessayez.</p>
      ) : null}
      <div className="flex gap-2">
        <button
          disabled={state === 'sending'}
          className="rounded-[var(--radius-btn)] bg-[var(--color-brand)] text-[var(--color-brand-ink)] px-3 py-1.5 text-xs font-medium disabled:opacity-50"
        >
          Envoyer
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded-[var(--radius-btn)] border border-[var(--color-border)] px-3 py-1.5 text-xs"
        >
          Annuler
        </button>
      </div>
    </form>
  );
}

'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';

const REASON_KEYS = ['counterfeit', 'prohibited', 'scam', 'offensive', 'spam', 'other'] as const;

/** Identifiant d'appareil stable (dédoublonnage des signalements). */
function reporterKey(): string {
  try {
    const k = 'jokko_rk';
    let v = localStorage.getItem(k);
    if (!v) {
      v = crypto.randomUUID();
      localStorage.setItem(k, v);
    }
    return v;
  } catch {
    return '';
  }
}

export function ReportButton({
  targetType,
  targetId,
}: {
  targetType: 'product' | 'shop';
  targetId: string;
}) {
  const t = useTranslations('report');
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('counterfeit');
  const [note, setNote] = useState('');
  const [state, setState] = useState<'idle' | 'sending' | 'done' | 'error'>('idle');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setState('sending');
    try {
      const res = await fetch('/api/report', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ targetType, targetId, reason, note, reporterKey: reporterKey() }),
      });
      setState(res.ok ? 'done' : 'error');
    } catch {
      setState('error');
    }
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-xs text-[var(--color-faint)] underline underline-offset-2"
      >
        {t('open')}
      </button>
    );
  }

  return (
    <div className="mt-2 rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] p-3 text-sm">
      {state === 'done' ? (
        <p className="text-[var(--color-muted)]">{t('thanks')}</p>
      ) : (
        <form onSubmit={submit} className="flex flex-col gap-2">
          <label className="flex flex-col gap-1">
            <span className="text-xs text-[var(--color-muted)]">{t('reasonLabel')}</span>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="rounded-[var(--radius-btn)] border border-[var(--color-border)] bg-[var(--color-bg)] px-2 py-1.5"
            >
              {REASON_KEYS.map((key) => (
                <option key={key} value={key}>
                  {t(`reasons.${key}`)}
                </option>
              ))}
            </select>
          </label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            maxLength={500}
            rows={2}
            placeholder={t('detail')}
            className="rounded-[var(--radius-btn)] border border-[var(--color-border)] bg-[var(--color-bg)] px-2 py-1.5"
          />
          {state === 'error' ? (
            <p className="text-xs text-[var(--color-danger)]">{t('error')}</p>
          ) : null}
          <div className="flex gap-2">
            <button
              disabled={state === 'sending'}
              className="rounded-[var(--radius-btn)] bg-[var(--color-brand)] text-[var(--color-brand-ink)] px-3 py-1.5 text-xs font-medium disabled:opacity-50"
            >
              {t('send')}
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-[var(--radius-btn)] border border-[var(--color-border)] px-3 py-1.5 text-xs"
            >
              {t('cancel')}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import type { PublicReviews } from '@jokko/contracts';

function Stars({ value }: { value: number }) {
  const full = Math.round(value);
  return (
    <span aria-hidden className="tracking-tight text-[var(--color-brand)]">
      {'★'.repeat(full)}
      <span className="text-[var(--color-border)]">{'★'.repeat(5 - full)}</span>
    </span>
  );
}

export function ProductReviews({
  productId,
  initial,
}: {
  productId: string;
  initial: PublicReviews;
}) {
  const t = useTranslations('reviews');
  const [rating, setRating] = useState(5);
  const [authorName, setAuthorName] = useState('');
  const [body, setBody] = useState('');
  const [state, setState] = useState<'idle' | 'sending' | 'done' | 'error'>('idle');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setState('sending');
    try {
      const res = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ productId, rating, authorName, body }),
      });
      setState(res.ok ? 'done' : 'error');
      if (res.ok) {
        setBody('');
        setAuthorName('');
      }
    } catch {
      setState('error');
    }
  };

  const { summary, items } = initial;

  return (
    <section className="mt-10 border-t border-[var(--color-border)] pt-6">
      <h2 className="font-[family-name:var(--font-display)] text-lg font-bold">{t('title')}</h2>

      <div className="mt-2 flex items-center gap-2 text-sm">
        {summary.count > 0 ? (
          <>
            <Stars value={summary.average} />
            <span className="font-medium">{summary.average.toFixed(1)}</span>
            <span className="text-[var(--color-muted)]">
              {t('count', { count: summary.count })}
            </span>
          </>
        ) : (
          <span className="text-[var(--color-muted)]">{t('empty')}</span>
        )}
      </div>

      {items.length > 0 ? (
        <ul className="mt-4 flex flex-col gap-4">
          {items.map((r) => (
            <li key={r.id} className="text-sm">
              <div className="flex items-center gap-2">
                <Stars value={r.rating} />
                <span className="font-medium">{r.authorName}</span>
              </div>
              {r.title ? <p className="mt-1 font-medium">{r.title}</p> : null}
              <p className="mt-1 whitespace-pre-line text-[var(--color-ink)]">{r.body}</p>
            </li>
          ))}
        </ul>
      ) : null}

      {state === 'done' ? (
        <p className="mt-6 text-sm text-[var(--color-good)]">{t('thanks')}</p>
      ) : (
        <form onSubmit={submit} className="mt-6 flex max-w-md flex-col gap-2">
          <p className="text-sm font-medium">{t('formTitle')}</p>
          <label className="flex items-center gap-2 text-sm">
            {t('rating')}
            <select
              value={rating}
              onChange={(e) => setRating(Number(e.target.value))}
              className="rounded-[var(--radius-btn)] border border-[var(--color-border)] bg-[var(--color-surface)] px-2 py-1"
            >
              {[5, 4, 3, 2, 1].map((n) => (
                <option key={n} value={n}>
                  {n} ★
                </option>
              ))}
            </select>
          </label>
          <input
            required
            minLength={2}
            maxLength={80}
            placeholder={t('name')}
            value={authorName}
            onChange={(e) => setAuthorName(e.target.value)}
            className="rounded-[var(--radius-btn)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm"
          />
          <textarea
            required
            minLength={3}
            maxLength={2000}
            rows={3}
            placeholder={t('body')}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            className="rounded-[var(--radius-btn)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm"
          />
          <button
            type="submit"
            disabled={state === 'sending'}
            className="self-start rounded-[var(--radius-btn)] bg-[var(--color-brand)] px-4 py-2 text-sm font-medium text-[var(--color-brand-ink)] disabled:opacity-60"
          >
            {state === 'sending' ? '…' : t('send')}
          </button>
          {state === 'error' ? (
            <p className="text-sm text-[var(--color-danger)]">{t('error')}</p>
          ) : null}
        </form>
      )}
    </section>
  );
}

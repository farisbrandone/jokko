'use client';

import { useState } from 'react';
import Link from 'next/link';
import { smsLink, telLink, whatsappLink } from '@jokko/ui';

interface Props {
  shopName: string;
  whatsapp: string | null;
  productId: string;
  productName: string;
  productUrl: string;
}

const btn =
  'rounded-[var(--radius-btn)] border border-[var(--color-border)] px-4 py-2.5 text-sm';
const btnPrimary =
  'rounded-[var(--radius-btn)] bg-[var(--color-brand)] text-[var(--color-brand-ink)] px-4 py-2.5 text-sm font-medium';

export function ContactBar({ shopName, whatsapp, productId, productName, productUrl }: Props) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ buyerName: '', buyerPhone: '', message: '' });
  const [state, setState] = useState<
    { kind: 'idle' } | { kind: 'sending' } | { kind: 'sent'; id: string; token: string } | { kind: 'error'; msg: string }
  >({ kind: 'idle' });

  const message = `Bonjour ${shopName}, je suis intéressé(e) par « ${productName} » : ${productUrl}`;

  const share = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: productName, url: productUrl });
      } catch {
        /* annulé */
      }
    } else {
      await navigator.clipboard.writeText(productUrl);
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setState({ kind: 'sending' });
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ ...form, productId, productName }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message ?? 'Envoi impossible');
      setState({ kind: 'sent', id: data.conversationId, token: data.buyerToken });
    } catch (err) {
      setState({ kind: 'error', msg: (err as Error).message });
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2">
        {whatsapp ? (
          <a href={whatsappLink(whatsapp, message)} target="_blank" rel="noreferrer" className={btnPrimary}>
            Commander sur WhatsApp
          </a>
        ) : null}
        <button type="button" onClick={() => setOpen((v) => !v)} className={whatsapp ? btn : btnPrimary}>
          Envoyer un message
        </button>
        {whatsapp ? (
          <a href={smsLink(whatsapp, message)} className={btn}>
            SMS
          </a>
        ) : null}
        {whatsapp ? (
          <a href={telLink(whatsapp)} className={btn}>
            Appeler
          </a>
        ) : null}
        <button type="button" onClick={share} className={btn}>
          Partager
        </button>
      </div>

      {open && state.kind !== 'sent' ? (
        <form
          onSubmit={submit}
          className="rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4 flex flex-col gap-2 max-w-md"
        >
          <input
            required
            placeholder="Votre nom"
            value={form.buyerName}
            onChange={(e) => setForm({ ...form, buyerName: e.target.value })}
            className="rounded-[var(--radius-btn)] border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm"
          />
          <input
            required
            placeholder="Téléphone / WhatsApp"
            value={form.buyerPhone}
            onChange={(e) => setForm({ ...form, buyerPhone: e.target.value })}
            className="rounded-[var(--radius-btn)] border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm"
          />
          <textarea
            required
            rows={3}
            placeholder={`À propos de « ${productName} »…`}
            value={form.message}
            onChange={(e) => setForm({ ...form, message: e.target.value })}
            className="rounded-[var(--radius-btn)] border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm"
          />
          {state.kind === 'error' ? (
            <p className="text-sm text-[var(--color-danger)]">{state.msg}</p>
          ) : null}
          <button disabled={state.kind === 'sending'} className={btnPrimary}>
            {state.kind === 'sending' ? 'Envoi…' : 'Envoyer'}
          </button>
        </form>
      ) : null}

      {state.kind === 'sent' ? (
        <p className="text-sm text-[var(--color-good)]">
          Message envoyé.{' '}
          <Link href={`/m/${state.id}?token=${state.token}`} className="underline">
            Suivre la conversation
          </Link>
        </p>
      ) : null}
    </div>
  );
}

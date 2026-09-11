'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { smsLink, telLink, whatsappLink } from '@jokko/ui';
import { track } from '@/lib/track';
import { Modal } from './modal';

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
  const t = useTranslations('contact');
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ buyerName: '', buyerPhone: '', message: '' });
  const [state, setState] = useState<
    { kind: 'idle' } | { kind: 'sending' } | { kind: 'sent'; id: string; token: string } | { kind: 'error'; msg: string }
  >({ kind: 'idle' });

  const message = `${shopName} — « ${productName} » : ${productUrl}`;

  const share = async () => {
    track('contact_click', { channel: 'share', productId });
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
      track('contact_click', { channel: 'message', productId });
      setState({ kind: 'sent', id: data.conversationId, token: data.buyerToken });
    } catch (err) {
      setState({ kind: 'error', msg: (err as Error).message });
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2">
        {whatsapp ? (
          <a
            href={whatsappLink(whatsapp, message)}
            target="_blank"
            rel="noreferrer"
            onClick={() => track('contact_click', { channel: 'whatsapp', productId })}
            className={btnPrimary}
          >
            {t('whatsapp')}
          </a>
        ) : null}
        <button type="button" onClick={() => setOpen(true)} className={whatsapp ? btn : btnPrimary}>
          {t('message')}
        </button>
        {whatsapp ? (
          <a
            href={smsLink(whatsapp, message)}
            onClick={() => track('contact_click', { channel: 'sms', productId })}
            className={btn}
          >
            {t('sms')}
          </a>
        ) : null}
        {whatsapp ? (
          <a
            href={telLink(whatsapp)}
            onClick={() => track('contact_click', { channel: 'call', productId })}
            className={btn}
          >
            {t('call')}
          </a>
        ) : null}
        <button type="button" onClick={share} className={btn}>
          {t('share')}
        </button>
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title={t('formTitle')}>
        {state.kind === 'sent' ? (
          <p className="text-sm text-[var(--color-good)]">
            {t('sent')}{' '}
            <Link href={`/m/${state.id}?token=${state.token}`} className="underline">
              {t('seeConversation')}
            </Link>
          </p>
        ) : (
          <form onSubmit={submit} className="flex flex-col gap-2">
            <input
              required
              placeholder={t('name')}
              value={form.buyerName}
              onChange={(e) => setForm({ ...form, buyerName: e.target.value })}
              className="rounded-[var(--radius-btn)] border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm"
            />
            <input
              required
              placeholder={t('phone')}
              value={form.buyerPhone}
              onChange={(e) => setForm({ ...form, buyerPhone: e.target.value })}
              className="rounded-[var(--radius-btn)] border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm"
            />
            <textarea
              required
              rows={3}
              placeholder={t('yourMessage')}
              value={form.message}
              onChange={(e) => setForm({ ...form, message: e.target.value })}
              className="rounded-[var(--radius-btn)] border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm"
            />
            {state.kind === 'error' ? (
              <p className="text-sm text-[var(--color-danger)]">{state.msg}</p>
            ) : null}
            <button disabled={state.kind === 'sending'} className={btnPrimary}>
              {state.kind === 'sending' ? t('sending') : t('send')}
            </button>
          </form>
        )}
      </Modal>
    </div>
  );
}

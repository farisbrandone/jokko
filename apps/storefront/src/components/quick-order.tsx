'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { formatMoney, smsLink, whatsappLink } from '@jokko/ui';
import { track } from '@/lib/track';
import { Modal } from './modal';

type Channel = 'whatsapp' | 'sms' | 'email';

interface Props {
  shopName: string;
  whatsapp: string | null;
  productId: string;
  productName: string;
  productUrl: string;
  unitAmount: number;
  currency: string;
  stock: number;
  siteUrl: string;
}

const DELIVERY = ['home', 'pickup', 'relay', 'agree'] as const;
const PAYMENT = ['cash', 'mobile', 'transfer', 'card', 'agree'] as const;

const field =
  'rounded-[var(--radius-btn)] border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm';

export function QuickOrder(props: Props) {
  const t = useTranslations('order');
  const [channel, setChannel] = useState<Channel | null>(null);
  const [qty, setQty] = useState(1);
  const [f, setF] = useState({
    name: '',
    phone: '',
    email: '',
    address: '',
    city: '',
    delivery: 'home',
    payment: 'cash',
    note: '',
  });
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState<{ id: string; token: string } | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const maxQty = props.stock > 0 ? props.stock : 99;
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((p) => ({ ...p, [k]: v }));

  function buildMessage(): string {
    const m = (k: string) => t(`msg.${k}`);
    const none = m('none');
    return [
      `🛒 ${m('heading')} — ${props.shopName}`,
      '',
      `${m('product')} : ${props.productName}`,
      `${m('ref')} : ${props.productUrl}`,
      `${m('unitPrice')} : ${formatMoney(props.unitAmount, props.currency)}`,
      `${m('quantity')} : ${qty}`,
      `${m('estimatedTotal')} : ${formatMoney(props.unitAmount * qty, props.currency)}`,
      '',
      `👤 ${m('customer')}`,
      `${m('name')} : ${f.name.trim()}`,
      `${m('phone')} : ${f.phone.trim()}`,
      `${m('email')} : ${f.email.trim() || none}`,
      '',
      `🚚 ${m('deliveryTitle')}`,
      `${m('address')} : ${f.address.trim()}`,
      `${m('city')} : ${f.city.trim()}`,
      `${m('method')} : ${t(`delivery.${f.delivery}`)}`,
      '',
      `💳 ${m('paymentTitle')} : ${t(`payment.${f.payment}`)}`,
      '',
      `📝 ${m('note')} : ${f.note.trim() || none}`,
      '',
      `— ${m('sentFrom')} ${props.siteUrl}`,
    ].join('\n');
  }

  const canSubmit =
    f.name.trim() && f.phone.trim() && f.address.trim() && f.city.trim() && !sending;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit || !channel) return;
    const message = buildMessage();
    track('order_click', { channel, productId: props.productId, qty });

    if (channel === 'whatsapp' && props.whatsapp) {
      window.open(whatsappLink(props.whatsapp, message), '_blank', 'noopener');
      setChannel(null);
      return;
    }
    if (channel === 'sms' && props.whatsapp) {
      window.location.href = smsLink(props.whatsapp, message);
      setChannel(null);
      return;
    }

    setSending(true);
    setErr(null);
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          buyerName: f.name.trim(),
          buyerPhone: f.phone.trim(),
          buyerEmail: f.email.trim() || undefined,
          productId: props.productId,
          productName: props.productName,
          message,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message ?? t('error'));
      setSent({ id: data.conversationId, token: data.buyerToken });
    } catch (e2) {
      setErr((e2 as Error).message);
    } finally {
      setSending(false);
    }
  };

  const chBtn = (c: Channel, label: string, primary = false) => (
    <button
      key={c}
      type="button"
      onClick={() => {
        setChannel(c);
        setSent(null);
        setErr(null);
      }}
      aria-pressed={channel === c}
      className={`rounded-[var(--radius-btn)] px-4 py-2.5 text-sm font-medium ${
        channel === c
          ? 'bg-[var(--color-brand)] text-[var(--color-brand-ink)]'
          : primary
            ? 'bg-[var(--color-good)] text-white'
            : 'border border-[var(--color-border)] bg-[var(--color-surface)]'
      }`}
    >
      {label}
    </button>
  );

  const submitLabel =
    channel === 'whatsapp'
      ? t('submitWhatsapp')
      : channel === 'sms'
        ? t('submitSms')
        : sending
          ? t('sending')
          : t('submitEmail');

  return (
    <section className="rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
      <p className="mb-3 text-sm font-medium">{t('orderVia')}</p>
      <div className="flex flex-wrap gap-2">
        {props.whatsapp ? chBtn('whatsapp', t('viaWhatsapp'), true) : null}
        {props.whatsapp ? chBtn('sms', t('viaSms')) : null}
        {chBtn('email', t('viaEmail'))}
      </div>

      <Modal
        open={channel !== null}
        onClose={() => {
          setChannel(null);
          setSent(null);
          setErr(null);
        }}
        title={t('orderVia')}
      >
      {sent ? (
        <p className="text-sm text-[var(--color-good)]">
          {t('sentEmail')}{' '}
          <Link href={`/m/${sent.id}?token=${sent.token}`} className="underline">
            {t('seeConversation')}
          </Link>
        </p>
      ) : channel ? (
        <form onSubmit={submit} className="flex flex-col gap-2.5">
          <p className="text-xs text-[var(--color-muted)]">{t('formHint')}</p>

          <div className="flex items-center gap-2">
            <span className="text-sm">{t('quantity')}</span>
            <div className="flex items-center rounded-[var(--radius-btn)] border border-[var(--color-border)]">
              <button
                type="button"
                onClick={() => setQty((q) => Math.max(1, q - 1))}
                className="px-3 py-1.5 text-sm"
                aria-label="−"
              >
                −
              </button>
              <span className="w-8 text-center text-sm tabular-nums">{qty}</span>
              <button
                type="button"
                onClick={() => setQty((q) => Math.min(maxQty, q + 1))}
                className="px-3 py-1.5 text-sm"
                aria-label="+"
              >
                +
              </button>
            </div>
          </div>

          <input
            required
            placeholder={t('name')}
            value={f.name}
            onChange={(e) => set('name', e.target.value)}
            className={field}
          />
          <input
            required
            inputMode="tel"
            placeholder={t('phone')}
            value={f.phone}
            onChange={(e) => set('phone', e.target.value)}
            className={field}
          />
          <input
            type="email"
            placeholder={t('email')}
            value={f.email}
            onChange={(e) => set('email', e.target.value)}
            className={field}
          />
          <textarea
            required
            rows={2}
            placeholder={t('address')}
            value={f.address}
            onChange={(e) => set('address', e.target.value)}
            className={field}
          />
          <input
            required
            placeholder={t('city')}
            value={f.city}
            onChange={(e) => set('city', e.target.value)}
            className={field}
          />
          <label className="flex flex-col gap-1 text-xs text-[var(--color-muted)]">
            {t('deliveryMethod')}
            <select
              value={f.delivery}
              onChange={(e) => set('delivery', e.target.value)}
              className={field}
            >
              {DELIVERY.map((d) => (
                <option key={d} value={d}>
                  {t(`delivery.${d}`)}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs text-[var(--color-muted)]">
            {t('paymentMethod')}
            <select
              value={f.payment}
              onChange={(e) => set('payment', e.target.value)}
              className={field}
            >
              {PAYMENT.map((p) => (
                <option key={p} value={p}>
                  {t(`payment.${p}`)}
                </option>
              ))}
            </select>
          </label>
          <textarea
            rows={2}
            placeholder={t('note')}
            value={f.note}
            onChange={(e) => set('note', e.target.value)}
            className={field}
          />

          {err ? <p className="text-sm text-[var(--color-danger)]">{err}</p> : null}

          <button
            disabled={!canSubmit}
            className="mt-1 rounded-[var(--radius-btn)] bg-[var(--color-brand)] px-4 py-2.5 text-sm font-semibold text-[var(--color-brand-ink)] disabled:opacity-50"
          >
            {submitLabel}
          </button>
        </form>
      ) : null}
      </Modal>
    </section>
  );
}

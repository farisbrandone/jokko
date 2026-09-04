'use client';

import { useState } from 'react';
import Link from 'next/link';
import { formatMoney } from '@jokko/ui';
import { cart, rememberOrder, useCart } from '@/lib/cart';

export default function CartPage() {
  const items = useCart();
  const [form, setForm] = useState({ buyerName: '', buyerPhone: '', buyerEmail: '', note: '' });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const currency = items[0]?.currency ?? 'XOF';
  const subtotal = items.reduce((s, i) => s + i.unitAmount * i.qty, 0);

  if (items.length === 0) {
    return (
      <div className="py-16 text-center">
        <p className="text-[var(--color-muted)]">Votre panier est vide.</p>
        <Link href="/" className="mt-2 inline-block text-[var(--color-brand)] underline">
          Retour à la boutique
        </Link>
      </div>
    );
  }

  const checkout = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          items: items.map((i) => ({ productId: i.productId, qty: i.qty })),
          buyerName: form.buyerName.trim(),
          buyerPhone: form.buyerPhone.trim(),
          buyerEmail: form.buyerEmail.trim() || undefined,
          note: form.note.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message ?? 'Commande impossible');
      rememberOrder(data.orderId, data.buyerToken);
      window.location.href = data.checkoutUrl;
    } catch (e) {
      setErr((e as Error).message);
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-xl">
      <h1 className="font-[family-name:var(--font-display)] text-2xl font-bold">Panier</h1>

      <ul className="mt-4 flex flex-col gap-3">
        {items.map((i) => (
          <li
            key={i.productId}
            className="flex items-center justify-between gap-3 rounded-[var(--radius-card)] border border-[var(--color-border)] p-3"
          >
            <div className="min-w-0">
              <Link href={`/p/${i.slug}`} className="font-medium">
                {i.name}
              </Link>
              <p className="text-sm text-[var(--color-muted)]">
                {formatMoney(i.unitAmount, i.currency)}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={1}
                max={99}
                value={i.qty}
                onChange={(e) => cart.setQty(i.productId, Number(e.target.value) || 1)}
                className="w-14 rounded-[var(--radius-btn)] border border-[var(--color-border)] bg-[var(--color-bg)] px-2 py-1 text-sm"
              />
              <button
                type="button"
                onClick={() => cart.remove(i.productId)}
                className="text-xs text-[var(--color-danger)] underline"
              >
                Retirer
              </button>
            </div>
          </li>
        ))}
      </ul>

      <p className="mt-4 text-right text-lg font-semibold">
        Total : {formatMoney(subtotal, currency)}
      </p>

      <form onSubmit={checkout} className="mt-6 flex flex-col gap-3">
        <input
          required
          placeholder="Votre nom"
          value={form.buyerName}
          onChange={(e) => setForm({ ...form, buyerName: e.target.value })}
          className="rounded-[var(--radius-btn)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm"
        />
        <input
          required
          type="tel"
          placeholder="Téléphone (+221…)"
          value={form.buyerPhone}
          onChange={(e) => setForm({ ...form, buyerPhone: e.target.value.replace(/\s/g, '') })}
          className="rounded-[var(--radius-btn)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm"
        />
        <input
          type="email"
          placeholder="E-mail (facultatif)"
          value={form.buyerEmail}
          onChange={(e) => setForm({ ...form, buyerEmail: e.target.value })}
          className="rounded-[var(--radius-btn)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm"
        />
        <textarea
          rows={2}
          placeholder="Note pour le vendeur (facultatif)"
          value={form.note}
          onChange={(e) => setForm({ ...form, note: e.target.value })}
          className="rounded-[var(--radius-btn)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm"
        />
        {err ? <p className="text-sm text-[var(--color-danger)]">{err}</p> : null}
        <button
          type="submit"
          disabled={busy}
          className="rounded-[var(--radius-btn)] bg-[var(--color-brand)] px-4 py-2.5 text-sm font-medium text-[var(--color-brand-ink)] disabled:opacity-60"
        >
          {busy ? '…' : `Payer ${formatMoney(subtotal, currency)}`}
        </button>
      </form>
    </div>
  );
}

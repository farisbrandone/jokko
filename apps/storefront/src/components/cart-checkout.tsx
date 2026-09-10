'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { formatMoney } from '@jokko/ui';
import { cart, lineKey, rememberOrder, useCart } from '@/lib/cart';

type Zone = { id?: string; label: string; fee: number };

const field =
  'rounded-[var(--radius-btn)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm';

export function CartCheckout({ zones, currency }: { zones: Zone[]; currency: string }) {
  const items = useCart();
  const [form, setForm] = useState({ buyerName: '', buyerPhone: '', buyerEmail: '', note: '' });
  const [deliveryMethod, setDeliveryMethod] = useState<'pickup' | 'delivery'>('pickup');
  const [zoneId, setZoneId] = useState(zones[0]?.id ?? '');
  const [address, setAddress] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'online' | 'cash_on_delivery'>('online');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [codeInput, setCodeInput] = useState('');
  const [discount, setDiscount] = useState<{ code: string; label: string; amount: number } | null>(
    null,
  );
  const [discountBusy, setDiscountBusy] = useState(false);
  const [discountErr, setDiscountErr] = useState<string | null>(null);

  const cartCurrency = items[0]?.currency ?? currency;
  const subtotal = items.reduce((s, i) => s + i.unitAmount * i.qty, 0);
  const selectedZone = useMemo(() => zones.find((z) => z.id === zoneId), [zones, zoneId]);
  const deliveryFee = deliveryMethod === 'delivery' ? (selectedZone?.fee ?? 0) : 0;
  const discountAmount = discount ? Math.min(discount.amount, subtotal) : 0;
  const total = Math.max(0, subtotal - discountAmount + deliveryFee);

  // Le montant d'une remise en % dépend du sous-total : si le panier change
  // après application, on invalide le code (l'acheteur le ré-applique).
  useEffect(() => {
    setDiscount(null);
    setDiscountErr(null);
  }, [subtotal]);

  const applyCode = async () => {
    const code = codeInput.trim();
    if (!code) return;
    setDiscountBusy(true);
    setDiscountErr(null);
    try {
      const res = await fetch('/api/discounts/preview', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ code, subtotal }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(
          data?.message ?? (data?.issues?.[0]?.message as string) ?? 'Code invalide',
        );
      }
      setDiscount({ code: data.code, label: data.label, amount: data.discountAmount });
    } catch (e) {
      setDiscount(null);
      setDiscountErr((e as Error).message);
    } finally {
      setDiscountBusy(false);
    }
  };

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
    if (deliveryMethod === 'delivery' && (!selectedZone || !address.trim())) {
      setErr('Choisissez une zone de livraison et indiquez votre adresse.');
      return;
    }
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          items: items.map((i) => ({
            productId: i.productId,
            variantId: i.variantId ?? undefined,
            qty: i.qty,
          })),
          buyerName: form.buyerName.trim(),
          buyerPhone: form.buyerPhone.trim(),
          buyerEmail: form.buyerEmail.trim() || undefined,
          note: form.note.trim() || undefined,
          paymentMethod,
          deliveryMethod,
          deliveryZoneId: deliveryMethod === 'delivery' ? selectedZone?.id : undefined,
          deliveryAddress: deliveryMethod === 'delivery' ? address.trim() : undefined,
          discountCode: discount?.code,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message ?? 'Commande impossible');
      rememberOrder(data.orderId, data.buyerToken);
      if (data.checkoutUrl) {
        // Paiement en ligne : le panier est vidé au retour, après confirmation.
        window.location.href = data.checkoutUrl;
      } else {
        // Paiement à la livraison : commande ferme, on peut vider le panier.
        cart.clear();
        window.location.href = `/commande/${data.orderId}`;
      }
    } catch (e2) {
      setErr((e2 as Error).message);
      setBusy(false);
    }
  };

  const radio = (checked: boolean) =>
    `flex-1 cursor-pointer rounded-[var(--radius-btn)] border px-3 py-2 text-sm ${
      checked
        ? 'border-[var(--color-brand)] bg-[var(--color-brand-soft)]'
        : 'border-[var(--color-border)]'
    }`;

  return (
    <div className="mx-auto max-w-xl">
      <h1 className="font-[family-name:var(--font-display)] text-2xl font-bold">Panier</h1>

      <ul className="mt-4 flex flex-col gap-3">
        {items.map((i) => {
          const k = lineKey(i.productId, i.variantId);
          return (
          <li
            key={k}
            className="flex items-center justify-between gap-3 rounded-[var(--radius-card)] border border-[var(--color-border)] p-3"
          >
            <div className="min-w-0">
              <Link href={`/p/${i.slug}`} className="font-medium">
                {i.name}
              </Link>
              {i.variantLabel ? (
                <p className="text-xs text-[var(--color-faint)]">{i.variantLabel}</p>
              ) : null}
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
                onChange={(e) => cart.setQty(k, Number(e.target.value) || 1)}
                className="w-14 rounded-[var(--radius-btn)] border border-[var(--color-border)] bg-[var(--color-bg)] px-2 py-1 text-sm"
              />
              <button
                type="button"
                onClick={() => cart.remove(k)}
                className="text-xs text-[var(--color-danger)] underline"
              >
                Retirer
              </button>
            </div>
          </li>
          );
        })}
      </ul>

      <form onSubmit={checkout} className="mt-6 flex flex-col gap-4">
        {/* Livraison */}
        <fieldset className="flex flex-col gap-2">
          <span className="text-sm font-medium">Livraison</span>
          <div className="flex gap-2">
            <label className={radio(deliveryMethod === 'pickup')}>
              <input
                type="radio"
                name="dm"
                className="sr-only"
                checked={deliveryMethod === 'pickup'}
                onChange={() => setDeliveryMethod('pickup')}
              />
              Retrait en boutique — gratuit
            </label>
            {zones.length > 0 ? (
              <label className={radio(deliveryMethod === 'delivery')}>
                <input
                  type="radio"
                  name="dm"
                  className="sr-only"
                  checked={deliveryMethod === 'delivery'}
                  onChange={() => setDeliveryMethod('delivery')}
                />
                Livraison
              </label>
            ) : null}
          </div>
          {deliveryMethod === 'delivery' ? (
            <div className="flex flex-col gap-2">
              <select
                value={zoneId}
                onChange={(e) => setZoneId(e.target.value)}
                className={field}
              >
                {zones.map((z) => (
                  <option key={z.id ?? z.label} value={z.id}>
                    {z.label} — {formatMoney(z.fee, cartCurrency)}
                  </option>
                ))}
              </select>
              <textarea
                required
                rows={2}
                placeholder="Adresse de livraison (rue, repère)"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className={field}
              />
            </div>
          ) : null}
        </fieldset>

        {/* Paiement */}
        <fieldset className="flex flex-col gap-2">
          <span className="text-sm font-medium">Paiement</span>
          <div className="flex gap-2">
            <label className={radio(paymentMethod === 'online')}>
              <input
                type="radio"
                name="pm"
                className="sr-only"
                checked={paymentMethod === 'online'}
                onChange={() => setPaymentMethod('online')}
              />
              Payer en ligne
            </label>
            <label className={radio(paymentMethod === 'cash_on_delivery')}>
              <input
                type="radio"
                name="pm"
                className="sr-only"
                checked={paymentMethod === 'cash_on_delivery'}
                onChange={() => setPaymentMethod('cash_on_delivery')}
              />
              Paiement à la livraison
            </label>
          </div>
        </fieldset>

        {/* Coordonnées */}
        <input
          required
          placeholder="Votre nom"
          value={form.buyerName}
          onChange={(e) => setForm({ ...form, buyerName: e.target.value })}
          className={field}
        />
        <input
          required
          type="tel"
          placeholder="Téléphone (+237…)"
          value={form.buyerPhone}
          onChange={(e) => setForm({ ...form, buyerPhone: e.target.value.replace(/\s/g, '') })}
          className={field}
        />
        <input
          type="email"
          placeholder="E-mail (facultatif)"
          value={form.buyerEmail}
          onChange={(e) => setForm({ ...form, buyerEmail: e.target.value })}
          className={field}
        />
        <textarea
          rows={2}
          placeholder="Note pour le vendeur (facultatif)"
          value={form.note}
          onChange={(e) => setForm({ ...form, note: e.target.value })}
          className={field}
        />

        {/* Code promo */}
        <fieldset className="flex flex-col gap-1.5">
          <span className="text-sm font-medium">Code promo</span>
          {discount ? (
            <div className="flex items-center justify-between rounded-[var(--radius-btn)] border border-[var(--color-brand)] bg-[var(--color-brand-soft)] px-3 py-2 text-sm">
              <span>
                <strong>{discount.code}</strong> appliqué — {discount.label}
              </span>
              <button
                type="button"
                onClick={() => {
                  setDiscount(null);
                  setCodeInput('');
                }}
                className="text-xs text-[var(--color-danger)] underline"
              >
                Retirer
              </button>
            </div>
          ) : (
            <div className="flex gap-2">
              <input
                value={codeInput}
                onChange={(e) => setCodeInput(e.target.value.toUpperCase())}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    void applyCode();
                  }
                }}
                placeholder="Ex. BIENVENUE10"
                maxLength={24}
                className={`${field} flex-1 uppercase`}
              />
              <button
                type="button"
                onClick={() => void applyCode()}
                disabled={discountBusy || !codeInput.trim()}
                className="rounded-[var(--radius-btn)] border border-[var(--color-border)] px-3 py-2 text-sm disabled:opacity-50"
              >
                {discountBusy ? '…' : 'Appliquer'}
              </button>
            </div>
          )}
          {discountErr ? (
            <p className="text-xs text-[var(--color-danger)]">{discountErr}</p>
          ) : null}
        </fieldset>

        {/* Récapitulatif */}
        <div className="rounded-[var(--radius-card)] border border-[var(--color-border)] p-3 text-sm">
          <div className="flex justify-between">
            <span className="text-[var(--color-muted)]">Sous-total</span>
            <span>{formatMoney(subtotal, cartCurrency)}</span>
          </div>
          {discountAmount > 0 ? (
            <div className="mt-1 flex justify-between text-[var(--color-good)]">
              <span>Remise{discount ? ` (${discount.code})` : ''}</span>
              <span>− {formatMoney(discountAmount, cartCurrency)}</span>
            </div>
          ) : null}
          <div className="mt-1 flex justify-between">
            <span className="text-[var(--color-muted)]">Livraison</span>
            <span>{deliveryFee > 0 ? formatMoney(deliveryFee, cartCurrency) : 'Gratuit'}</span>
          </div>
          <div className="mt-2 flex justify-between border-t border-[var(--color-border)] pt-2 text-base font-semibold">
            <span>Total</span>
            <span>{formatMoney(total, cartCurrency)}</span>
          </div>
        </div>

        {err ? <p className="text-sm text-[var(--color-danger)]">{err}</p> : null}
        <button
          type="submit"
          disabled={busy}
          className="rounded-[var(--radius-btn)] bg-[var(--color-brand)] px-4 py-2.5 text-sm font-semibold text-[var(--color-brand-ink)] disabled:opacity-60"
        >
          {busy
            ? '…'
            : paymentMethod === 'online'
              ? `Payer ${formatMoney(total, cartCurrency)}`
              : `Commander — ${formatMoney(total, cartCurrency)} à la livraison`}
        </button>
      </form>
    </div>
  );
}

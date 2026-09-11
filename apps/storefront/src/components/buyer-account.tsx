'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import type { Buyer } from '@jokko/contracts';
import { BuyerOrders } from './buyer-orders';

type Address = { id?: string; label: string; address: string };

const field =
  'rounded-[var(--radius-btn)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm';

export function BuyerAccount({ initial }: { initial: Buyer }) {
  const t = useTranslations('account');
  const router = useRouter();
  const [name, setName] = useState(initial.name ?? '');
  const [addresses, setAddresses] = useState<Address[]>(initial.addresses);
  const [draft, setDraft] = useState({ label: '', address: '' });
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);

  const dirty =
    name !== (initial.name ?? '') || JSON.stringify(addresses) !== JSON.stringify(initial.addresses);

  const addAddress = () => {
    const label = draft.label.trim();
    const address = draft.address.trim();
    if (!label || !address || addresses.length >= 5) return;
    setAddresses((a) => [...a, { label, address }]);
    setDraft({ label: '', address: '' });
    setSaved(false);
  };
  const removeAddress = (i: number) => {
    setAddresses((a) => a.filter((_, idx) => idx !== i));
    setSaved(false);
  };

  const save = async () => {
    setBusy(true);
    try {
      await fetch('/api/buyer/me', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name: name.trim() || null, addresses }),
      });
      setSaved(true);
      router.refresh();
    } finally {
      setBusy(false);
    }
  };

  const logout = async () => {
    await fetch('/api/buyer/logout', { method: 'POST' });
    router.refresh();
  };

  return (
    <div className="flex flex-col gap-8">
      <section className="flex max-w-sm flex-col gap-3">
        <h2 className="font-medium">{t('profile')}</h2>
        <p className="text-sm text-[var(--color-muted)]">{initial.phone}</p>
        <input
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            setSaved(false);
          }}
          placeholder={t('yourName')}
          className={field}
        />

        <h3 className="mt-2 text-sm font-medium">{t('addresses')}</h3>
        <p className="text-xs text-[var(--color-muted)]">{t('addressesHint')}</p>
        {addresses.length === 0 ? (
          <p className="text-sm text-[var(--color-muted)]">{t('noAddresses')}</p>
        ) : (
          <ul className="flex flex-col gap-1.5">
            {addresses.map((a, i) => (
              <li
                key={a.id ?? `${a.label}-${i}`}
                className="flex items-center gap-2 rounded-[var(--radius-btn)] border border-[var(--color-border)] px-3 py-1.5 text-sm"
              >
                <span className="flex-1">
                  <strong>{a.label}</strong> — {a.address}
                </span>
                <button
                  type="button"
                  onClick={() => removeAddress(i)}
                  className="text-xs text-[var(--color-danger)] underline"
                >
                  {t('remove')}
                </button>
              </li>
            ))}
          </ul>
        )}
        {addresses.length < 5 ? (
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              value={draft.label}
              onChange={(e) => setDraft((d) => ({ ...d, label: e.target.value }))}
              placeholder={t('addressLabel')}
              maxLength={40}
              className={`${field} sm:w-40`}
            />
            <input
              value={draft.address}
              onChange={(e) => setDraft((d) => ({ ...d, address: e.target.value }))}
              placeholder={t('addressValue')}
              maxLength={300}
              className={`${field} flex-1`}
            />
            <button
              type="button"
              onClick={addAddress}
              disabled={!draft.label.trim() || !draft.address.trim()}
              className="rounded-[var(--radius-btn)] border border-[var(--color-border)] px-3 py-2 text-sm disabled:opacity-50"
            >
              {t('add')}
            </button>
          </div>
        ) : null}

        <div className="mt-2 flex items-center gap-3">
          <button
            type="button"
            onClick={save}
            disabled={busy || !dirty}
            className="rounded-[var(--radius-btn)] bg-[var(--color-brand)] px-4 py-2 text-sm font-medium text-[var(--color-brand-ink)] disabled:opacity-50"
          >
            {t('save')}
          </button>
          {saved && !dirty ? (
            <span className="text-xs text-[var(--color-good)]">✓ {t('saved')}</span>
          ) : null}
          <button
            type="button"
            onClick={logout}
            className="ml-auto text-sm text-[var(--color-muted)] underline"
          >
            {t('logout')}
          </button>
        </div>
      </section>

      <section>
        <h2 className="mb-3 font-medium">{t('orders')}</h2>
        <BuyerOrders />
      </section>
    </div>
  );
}

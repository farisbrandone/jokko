'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';

const field =
  'rounded-[var(--radius-btn)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm';

export function BuyerLoginForm() {
  const t = useTranslations('account');
  const router = useRouter();
  const [step, setStep] = useState<'phone' | 'code'>('phone');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const requestCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch('/api/buyer/otp/request', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ phone }),
      });
      if (!res.ok) throw new Error();
      setStep('code');
    } catch {
      setErr(t('error'));
    } finally {
      setBusy(false);
    }
  };

  const verify = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch('/api/buyer/otp/verify', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ phone, code, name: name.trim() || undefined }),
      });
      if (!res.ok) throw new Error();
      router.refresh();
    } catch {
      setErr(t('error'));
    } finally {
      setBusy(false);
    }
  };

  if (step === 'phone') {
    return (
      <form onSubmit={requestCode} className="flex max-w-sm flex-col gap-3">
        <p className="text-sm text-[var(--color-muted)]">{t('loginIntro')}</p>
        <label className="flex flex-col gap-1 text-sm">
          {t('phone')}
          <input
            required
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value.replace(/\s/g, ''))}
            placeholder={t('phonePlaceholder')}
            className={field}
          />
        </label>
        {err ? <p className="text-sm text-[var(--color-danger)]">{err}</p> : null}
        <button
          type="submit"
          disabled={busy || !phone.trim()}
          className="rounded-[var(--radius-btn)] bg-[var(--color-brand)] px-4 py-2 text-sm font-semibold text-[var(--color-brand-ink)] disabled:opacity-60"
        >
          {busy ? t('sending') : t('sendCode')}
        </button>
      </form>
    );
  }

  return (
    <form onSubmit={verify} className="flex max-w-sm flex-col gap-3">
      <p className="text-sm text-[var(--color-muted)]">{t('codeSent', { phone })}</p>
      <label className="flex flex-col gap-1 text-sm">
        {t('code')}
        <input
          required
          inputMode="numeric"
          autoFocus
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
          className={field}
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        {t('yourName')}
        <input value={name} onChange={(e) => setName(e.target.value)} className={field} />
      </label>
      {err ? <p className="text-sm text-[var(--color-danger)]">{err}</p> : null}
      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={busy || code.length < 4}
          className="rounded-[var(--radius-btn)] bg-[var(--color-brand)] px-4 py-2 text-sm font-semibold text-[var(--color-brand-ink)] disabled:opacity-60"
        >
          {busy ? t('sending') : t('verify')}
        </button>
        <button
          type="button"
          onClick={() => setStep('phone')}
          className="text-sm text-[var(--color-muted)] underline"
        >
          {t('changeNumber')}
        </button>
      </div>
    </form>
  );
}

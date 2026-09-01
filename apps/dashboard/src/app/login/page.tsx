'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { post } from '@/lib/client';
import { LegalLinks } from '@/components/legal-links';

const inputCls =
  'rounded-[var(--radius-btn)] border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm';
const btnCls =
  'rounded-[var(--radius-btn)] bg-[var(--color-brand)] text-[var(--color-brand-ink)] px-4 py-2 text-sm font-medium disabled:opacity-60';

function EmailForm({ onDone }: { onDone: () => void }) {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [form, setForm] = useState({ email: '', password: '', name: '' });
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      await post(mode === 'login' ? '/api/auth/login' : '/api/auth/register', form);
      onDone();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-3">
      {mode === 'register' ? (
        <input
          required
          placeholder="Votre nom"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          className={inputCls}
        />
      ) : null}
      <input
        required
        type="email"
        placeholder="E-mail"
        value={form.email}
        onChange={(e) => setForm({ ...form, email: e.target.value })}
        className={inputCls}
      />
      <input
        required
        type="password"
        placeholder="Mot de passe"
        minLength={8}
        value={form.password}
        onChange={(e) => setForm({ ...form, password: e.target.value })}
        className={inputCls}
      />
      {err ? <p className="text-sm text-[var(--color-danger)]">{err}</p> : null}
      <button disabled={busy} className={btnCls}>
        {busy ? '…' : mode === 'login' ? 'Se connecter' : 'Créer le compte'}
      </button>
      <button
        type="button"
        onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
        className="text-sm text-[var(--color-muted)] underline self-start"
      >
        {mode === 'login' ? 'Pas encore de compte ?' : 'J’ai déjà un compte'}
      </button>
    </form>
  );
}

function PhoneForm({ onDone }: { onDone: () => void }) {
  const [step, setStep] = useState<'phone' | 'code'>('phone');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const request = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      await post('/api/auth/otp/request', { phone });
      setStep('code');
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const verify = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      await post('/api/auth/otp/verify', { phone, code, name: name || undefined });
      onDone();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  if (step === 'phone') {
    return (
      <form onSubmit={request} className="flex flex-col gap-3">
        <input
          required
          type="tel"
          placeholder="+221 77 123 45 67"
          value={phone}
          onChange={(e) => setPhone(e.target.value.replace(/\s/g, ''))}
          className={inputCls}
        />
        {err ? <p className="text-sm text-[var(--color-danger)]">{err}</p> : null}
        <button disabled={busy} className={btnCls}>
          {busy ? '…' : 'Recevoir un code'}
        </button>
      </form>
    );
  }

  return (
    <form onSubmit={verify} className="flex flex-col gap-3">
      <p className="text-sm text-[var(--color-muted)]">Code envoyé au {phone}.</p>
      <input
        required
        inputMode="numeric"
        placeholder="Code à 6 chiffres"
        value={code}
        onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 8))}
        className={inputCls}
      />
      <input
        placeholder="Votre nom (si nouveau compte)"
        value={name}
        onChange={(e) => setName(e.target.value)}
        className={inputCls}
      />
      {err ? <p className="text-sm text-[var(--color-danger)]">{err}</p> : null}
      <button disabled={busy} className={btnCls}>
        {busy ? '…' : 'Valider'}
      </button>
      <button
        type="button"
        onClick={() => setStep('phone')}
        className="text-sm text-[var(--color-muted)] underline self-start"
      >
        Changer de numéro
      </button>
    </form>
  );
}

function LoginForm() {
  const router = useRouter();
  const next = useSearchParams().get('next') || '/';
  const [channel, setChannel] = useState<'email' | 'phone'>('email');

  const done = () => {
    router.push(next);
    router.refresh();
  };

  return (
    <div className="w-full max-w-sm rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] p-6 flex flex-col gap-4">
      <h1 className="font-[family-name:var(--font-display)] text-lg font-bold">Connexion vendeur</h1>
      <div className="flex gap-1 text-sm">
        {(['email', 'phone'] as const).map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setChannel(c)}
            className={`rounded-[var(--radius-btn)] px-3 py-1 ${
              channel === c
                ? 'bg-[var(--color-brand-soft)] text-[var(--color-brand)]'
                : 'text-[var(--color-muted)]'
            }`}
          >
            {c === 'email' ? 'E-mail' : 'Téléphone'}
          </button>
        ))}
      </div>
      {channel === 'email' ? <EmailForm onDone={done} /> : <PhoneForm onDone={done} />}
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-dvh grid place-items-center bg-[var(--color-bg)] text-[var(--color-ink)] p-4">
      <div className="flex flex-col items-center gap-4">
        <Suspense>
          <LoginForm />
        </Suspense>
        <LegalLinks />
      </div>
    </div>
  );
}

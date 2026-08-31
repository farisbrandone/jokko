'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { post } from '@/lib/client';

function LoginForm() {
  const router = useRouter();
  const next = useSearchParams().get('next') || '/';
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
      router.push(next);
      router.refresh();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form
      onSubmit={submit}
      className="w-full max-w-sm rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] p-6 flex flex-col gap-3"
    >
      <h1 className="font-[family-name:var(--font-display)] text-lg font-bold">
        {mode === 'login' ? 'Connexion vendeur' : 'Créer un compte'}
      </h1>
      {mode === 'register' ? (
        <input
          required
          placeholder="Votre nom"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          className="rounded-[var(--radius-btn)] border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm"
        />
      ) : null}
      <input
        required
        type="email"
        placeholder="E-mail"
        value={form.email}
        onChange={(e) => setForm({ ...form, email: e.target.value })}
        className="rounded-[var(--radius-btn)] border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm"
      />
      <input
        required
        type="password"
        placeholder="Mot de passe"
        minLength={8}
        value={form.password}
        onChange={(e) => setForm({ ...form, password: e.target.value })}
        className="rounded-[var(--radius-btn)] border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm"
      />
      {err ? <p className="text-sm text-[var(--color-danger)]">{err}</p> : null}
      <button
        disabled={busy}
        className="rounded-[var(--radius-btn)] bg-[var(--color-brand)] text-[var(--color-brand-ink)] px-4 py-2 text-sm font-medium disabled:opacity-60"
      >
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

export default function LoginPage() {
  return (
    <div className="min-h-dvh grid place-items-center bg-[var(--color-bg)] text-[var(--color-ink)] p-4">
      <Suspense>
        <LoginForm />
      </Suspense>
    </div>
  );
}

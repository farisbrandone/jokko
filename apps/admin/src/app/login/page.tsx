'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { post } from '@/lib/client';

function LoginForm() {
  const router = useRouter();
  const next = useSearchParams().get('next') || '/';
  const [form, setForm] = useState({ email: '', password: '' });
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      const { user } = await post<{ user: { isPlatformAdmin: boolean } }>(
        '/api/auth/login',
        form,
      );
      if (!user.isPlatformAdmin) {
        await post('/api/auth/logout');
        setErr('Ce compte n’a pas accès à la console plateforme.');
        return;
      }
      router.push(next);
      router.refresh();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const field =
    'rounded-[var(--radius-btn)] border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm';

  return (
    <form
      onSubmit={submit}
      className="w-full max-w-sm rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] p-6 flex flex-col gap-3"
    >
      <h1 className="font-[family-name:var(--font-display)] text-lg font-bold">
        Console plateforme
      </h1>
      <input
        required
        type="email"
        placeholder="E-mail"
        value={form.email}
        onChange={(e) => setForm({ ...form, email: e.target.value })}
        className={field}
      />
      <input
        required
        type="password"
        placeholder="Mot de passe"
        value={form.password}
        onChange={(e) => setForm({ ...form, password: e.target.value })}
        className={field}
      />
      {err ? <p className="text-sm text-[var(--color-danger)]">{err}</p> : null}
      <button
        disabled={busy}
        className="rounded-[var(--radius-btn)] bg-[var(--color-brand)] text-[var(--color-brand-ink)] px-4 py-2 text-sm font-medium disabled:opacity-60"
      >
        {busy ? '…' : 'Se connecter'}
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

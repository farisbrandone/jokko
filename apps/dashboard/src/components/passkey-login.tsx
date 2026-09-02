'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { browserSupportsWebAuthn, startAuthentication } from '@simplewebauthn/browser';
import { buttonStyles } from '@jokko/ui';
import { bffSend } from '@/lib/bff';

export function PasskeyLogin() {
  const router = useRouter();
  const [supported, setSupported] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => setSupported(browserSupportsWebAuthn()), []);
  if (!supported) return null;

  const run = async () => {
    setBusy(true);
    setErr(null);
    try {
      const opt = await bffSend<{ options: Parameters<typeof startAuthentication>[0]['optionsJSON']; challengeToken: string }>(
        '/api/auth/webauthn/login/options',
        'POST',
      );
      const response = await startAuthentication({ optionsJSON: opt.options });
      await bffSend('/api/auth/webauthn/login/verify', 'POST', {
        response,
        challengeToken: opt.challengeToken,
      });
      router.push('/');
      router.refresh();
    } catch (e) {
      const name = (e as { name?: string }).name;
      if (name !== 'AbortError') {
        setErr((e as Error).message || 'Connexion par passkey impossible');
      }
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-1">
      <button
        type="button"
        onClick={run}
        disabled={busy}
        style={{ ...buttonStyles({ variant: 'secondary' }), width: '100%' }}
      >
        {busy ? '…' : 'Se connecter avec une passkey'}
      </button>
      {err ? <p className="text-xs text-[var(--color-danger)]">{err}</p> : null}
    </div>
  );
}

'use client';

import { useCallback, useEffect, useState } from 'react';

type State = 'loading' | 'unsupported' | 'unavailable' | 'denied' | 'off' | 'on' | 'busy';

function urlBase64ToArrayBuffer(base64: string): ArrayBuffer {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + padding).replace(/-/g, '+').replace(/_/g, '/'));
  const buf = new ArrayBuffer(raw.length);
  const view = new Uint8Array(buf);
  for (let i = 0; i < raw.length; i++) view[i] = raw.charCodeAt(i);
  return buf;
}

async function getRegistration(): Promise<ServiceWorkerRegistration> {
  return (
    (await navigator.serviceWorker.getRegistration('/sw.js')) ??
    (await navigator.serviceWorker.register('/sw.js'))
  );
}

export function PushToggle() {
  const [state, setState] = useState<State>('loading');
  const [key, setKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      if (
        typeof window === 'undefined' ||
        !('serviceWorker' in navigator) ||
        !('PushManager' in window) ||
        !('Notification' in window)
      ) {
        setState('unsupported');
        return;
      }
      try {
        const res = await fetch('/api/proxy/push/public-key');
        const body = (await res.json()) as { key: string | null };
        if (!body.key) {
          setState('unavailable');
          return;
        }
        setKey(body.key);
        if (Notification.permission === 'denied') {
          setState('denied');
          return;
        }
        const reg = await getRegistration();
        const existing = await reg.pushManager.getSubscription();
        setState(existing ? 'on' : 'off');
      } catch {
        setState('unavailable');
      }
    })();
  }, []);

  const enable = useCallback(async () => {
    if (!key) return;
    setState('busy');
    setError(null);
    try {
      const perm = await Notification.requestPermission();
      if (perm !== 'granted') {
        setState(perm === 'denied' ? 'denied' : 'off');
        return;
      }
      const reg = await getRegistration();
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToArrayBuffer(key),
      });
      const res = await fetch('/api/proxy/push/subscriptions', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(sub.toJSON()),
      });
      if (!res.ok) throw new Error(`API ${res.status}`);
      setState('on');
    } catch (e) {
      setError((e as Error).message);
      setState('off');
    }
  }, [key]);

  const disable = useCallback(async () => {
    setState('busy');
    setError(null);
    try {
      const reg = await getRegistration();
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await fetch('/api/proxy/push/subscriptions', {
          method: 'DELETE',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ endpoint: sub.endpoint }),
        });
        await sub.unsubscribe();
      }
      setState('off');
    } catch (e) {
      setError((e as Error).message);
      setState('on');
    }
  }, []);

  const box = 'rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] p-3 text-sm';

  if (state === 'loading') return <div className={box}>…</div>;
  if (state === 'unsupported')
    return <div className={box}>Ce navigateur ne prend pas en charge les notifications push.</div>;
  if (state === 'unavailable')
    return <div className={box}>Les notifications push ne sont pas configurées sur ce serveur.</div>;
  if (state === 'denied')
    return (
      <div className={box}>
        Notifications bloquées pour ce site. Autorisez-les dans les réglages du navigateur.
      </div>
    );

  return (
    <div className={box}>
      <div className="flex items-center justify-between gap-3">
        <span>
          Notifications sur cet appareil : <strong>{state === 'on' ? 'activées' : 'désactivées'}</strong>
        </span>
        <button
          onClick={state === 'on' ? disable : enable}
          disabled={state === 'busy'}
          className={`rounded-[var(--radius-btn)] px-3 py-1.5 text-xs font-medium disabled:opacity-50 ${
            state === 'on'
              ? 'border border-[var(--color-border)]'
              : 'bg-[var(--color-brand)] text-[var(--color-brand-ink)]'
          }`}
        >
          {state === 'on' ? 'Désactiver' : 'Activer'}
        </button>
      </div>
      {error ? <p className="mt-1 text-xs text-[var(--color-danger)]">{error}</p> : null}
    </div>
  );
}

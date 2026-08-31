'use client';

let sessionId: string | null = null;

function getSession(): string {
  if (sessionId) return sessionId;
  try {
    const k = 'jk_sid';
    let v = localStorage.getItem(k);
    if (!v) {
      v = crypto.randomUUID();
      localStorage.setItem(k, v);
    }
    sessionId = v;
    return v;
  } catch {
    return (sessionId = crypto.randomUUID());
  }
}

type Props = Record<string, string | number | boolean>;

/** Envoie un événement d'analytics vers le BFF (id de boutique injecté serveur). */
export function track(name: string, props: Props = {}): void {
  try {
    void fetch('/api/ev', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ events: [{ name, props, sessionId: getSession() }] }),
      keepalive: true,
    });
  } catch {
    /* silencieux */
  }
}

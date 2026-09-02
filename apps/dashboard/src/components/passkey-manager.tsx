'use client';

import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { browserSupportsWebAuthn, startRegistration } from '@simplewebauthn/browser';
import { Button } from '@jokko/ui';
import { bffGet, bffSend } from '@/lib/bff';

interface Passkey {
  id: string;
  deviceName: string | null;
  createdAt: string;
  lastUsedAt: string | null;
}

function guessDeviceName(): string {
  const ua = navigator.userAgent;
  if (/iPhone|iPad|iOS/.test(ua)) return 'Appareil Apple';
  if (/Android/.test(ua)) return 'Appareil Android';
  if (/Mac OS X/.test(ua)) return 'Mac';
  if (/Windows/.test(ua)) return 'Windows';
  return 'Cet appareil';
}

export function PasskeyManager() {
  const qc = useQueryClient();
  const [supported, setSupported] = useState(false);
  useEffect(() => setSupported(browserSupportsWebAuthn()), []);

  const list = useQuery({
    queryKey: ['webauthn', 'credentials'],
    queryFn: () => bffGet<Passkey[]>('/api/proxy/auth/webauthn/credentials'),
  });

  const add = useMutation({
    mutationFn: async () => {
      const opt = await bffSend<{
        options: Parameters<typeof startRegistration>[0]['optionsJSON'];
        challengeToken: string;
      }>('/api/proxy/auth/webauthn/register/options', 'POST');
      const response = await startRegistration({ optionsJSON: opt.options });
      return bffSend('/api/proxy/auth/webauthn/register/verify', 'POST', {
        response,
        challengeToken: opt.challengeToken,
        deviceName: guessDeviceName(),
      });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['webauthn', 'credentials'] }),
  });

  const del = useMutation({
    mutationFn: (id: string) =>
      bffSend(`/api/proxy/auth/webauthn/credentials/${id}`, 'DELETE'),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['webauthn', 'credentials'] }),
  });

  const addError =
    add.error && (add.error as { name?: string }).name !== 'NotAllowedError'
      ? (add.error as Error).message
      : null;

  return (
    <section>
      <h2 className="font-medium mb-1">Passkeys</h2>
      <p className="text-sm text-[var(--color-muted)] mb-3">
        Connectez-vous sans mot de passe avec l&apos;empreinte, le visage ou le code de
        votre appareil.
      </p>

      {list.data && list.data.length > 0 ? (
        <ul className="mb-3 flex flex-col gap-2">
          {list.data.map((p) => (
            <li
              key={p.id}
              className="flex items-center justify-between rounded-[var(--radius-btn)] border border-[var(--color-border)] px-3 py-2 text-sm"
            >
              <span>
                {p.deviceName ?? 'Passkey'}
                <span className="text-[var(--color-muted)]">
                  {' '}
                  · ajoutée le {p.createdAt.slice(0, 10)}
                </span>
              </span>
              <button
                type="button"
                onClick={() => del.mutate(p.id)}
                disabled={del.isPending}
                className="text-xs text-[var(--color-danger)] underline disabled:opacity-50"
              >
                Retirer
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mb-3 text-sm text-[var(--color-muted)]">Aucune passkey enregistrée.</p>
      )}

      {supported ? (
        <Button
          type="button"
          variant="secondary"
          onClick={() => add.mutate()}
          disabled={add.isPending}
        >
          {add.isPending ? '…' : 'Ajouter une passkey'}
        </Button>
      ) : (
        <p className="text-xs text-[var(--color-muted)]">
          Votre navigateur ne prend pas en charge les passkeys.
        </p>
      )}
      {addError ? (
        <p className="mt-2 text-xs text-[var(--color-danger)]">{addError}</p>
      ) : null}
    </section>
  );
}

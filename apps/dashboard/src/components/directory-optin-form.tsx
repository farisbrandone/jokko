'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@jokko/ui';
import { patch } from '@/lib/client';
import type { ShopProfile } from '@/lib/types';

export function DirectoryOptInForm({ initial }: { initial: ShopProfile }) {
  const router = useRouter();
  const [listed, setListed] = useState(initial.listed);
  const [tagline, setTagline] = useState(initial.tagline ?? '');
  const [state, setState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setState('saving');
    try {
      await patch(`/api/proxy/shops/${initial.id}`, {
        listed,
        tagline: tagline.trim() || null,
      });
      setState('saved');
      router.refresh();
    } catch {
      setState('error');
    }
  };

  return (
    <form onSubmit={save} className="flex max-w-lg flex-col gap-3">
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={listed}
          onChange={(e) => setListed(e.target.checked)}
        />
        Figurer dans l&apos;annuaire public Jokko
      </label>
      <input
        placeholder="Phrase d'accroche (140 caractères max.)"
        maxLength={140}
        value={tagline}
        onChange={(e) => setTagline(e.target.value)}
        className="rounded-[var(--radius-btn)] border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm"
      />
      <Button type="submit" disabled={state === 'saving'}>
        {state === 'saving' ? '…' : 'Enregistrer'}
      </Button>
      {state === 'saved' ? (
        <p className="text-xs text-[var(--color-good)]">Enregistré.</p>
      ) : null}
      {state === 'error' ? (
        <p className="text-xs text-[var(--color-danger)]">Échec de l&apos;enregistrement.</p>
      ) : null}
    </form>
  );
}

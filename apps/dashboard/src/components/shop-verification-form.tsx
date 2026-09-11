'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { post } from '@/lib/client';
import type { ShopVerification } from '@/lib/types';

interface UploadUrl {
  uploadUrl: string;
  publicUrl: string;
}

const field =
  'rounded-[var(--radius-btn)] border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm';

export function ShopVerificationForm({
  shopId,
  initial,
}: {
  shopId: string;
  initial: ShopVerification;
}) {
  const router = useRouter();
  const [f, setF] = useState({
    legalName: initial.legalName ?? '',
    registryNumber: initial.registryNumber ?? '',
    note: initial.note ?? '',
    proofImageUrl: initial.proofImageUrl,
  });
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const onFile = async (file: File | null) => {
    if (!file) return;
    setUploading(true);
    setErr(null);
    try {
      const { uploadUrl, publicUrl } = await post<UploadUrl>(
        `/api/proxy/shops/${shopId}/media/upload-url`,
        { contentType: file.type, filename: file.name },
      );
      const put = await fetch(uploadUrl, {
        method: 'PUT',
        headers: { 'content-type': file.type },
        body: file,
      });
      if (!put.ok) throw new Error(`Téléversement échoué (${put.status})`);
      setF((p) => ({ ...p, proofImageUrl: publicUrl }));
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setUploading(false);
    }
  };

  const submit = async () => {
    setBusy(true);
    setErr(null);
    try {
      await post(`/api/proxy/shops/${shopId}/verification`, {
        legalName: f.legalName.trim(),
        registryNumber: f.registryNumber.trim(),
        note: f.note.trim() || null,
        proofImageUrl: f.proofImageUrl,
      });
      router.refresh();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  if (initial.status === 'verified') {
    return (
      <div className="flex max-w-lg items-center gap-2 rounded-[var(--radius-card)] border border-[var(--color-good)] bg-[var(--color-good)]/10 px-4 py-3 text-sm">
        <span aria-hidden>✓</span>
        <span>
          Boutique vérifiée — le badge « Boutique vérifiée » est visible sur votre vitrine et
          dans l&apos;annuaire.
        </span>
      </div>
    );
  }

  if (initial.status === 'pending') {
    return (
      <div className="max-w-lg rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4 text-sm">
        <p className="font-medium">Demande en cours d&apos;examen</p>
        <p className="mt-1 text-[var(--color-muted)]">
          {f.legalName} — {f.registryNumber}
        </p>
        <p className="mt-2 text-xs text-[var(--color-faint)]">
          Envoyée le {initial.submittedAt ? new Date(initial.submittedAt).toLocaleDateString('fr') : '—'}.
          L&apos;équipe Jokko l&apos;examine généralement sous quelques jours.
        </p>
      </div>
    );
  }

  return (
    <div className="flex max-w-lg flex-col gap-3">
      {initial.status === 'rejected' ? (
        <div className="rounded-[var(--radius-card)] border border-[var(--color-danger)] bg-[var(--color-danger)]/10 px-4 py-3 text-sm">
          <p className="font-medium">Demande refusée</p>
          {initial.decisionNote ? <p className="mt-1">{initial.decisionNote}</p> : null}
          <p className="mt-1 text-[var(--color-muted)]">Vous pouvez soumettre une nouvelle demande.</p>
        </div>
      ) : null}

      <label className="flex flex-col gap-1 text-sm">
        Raison sociale
        <input
          value={f.legalName}
          onChange={(e) => setF((p) => ({ ...p, legalName: e.target.value }))}
          placeholder="Ex. Awa Mode SARL"
          maxLength={140}
          className={field}
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Numéro de registre de commerce
        <input
          value={f.registryNumber}
          onChange={(e) => setF((p) => ({ ...p, registryNumber: e.target.value }))}
          placeholder="Ex. RC/DLA/2024/B/1234"
          maxLength={60}
          className={field}
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Précisions (facultatif)
        <textarea
          rows={2}
          value={f.note}
          onChange={(e) => setF((p) => ({ ...p, note: e.target.value }))}
          maxLength={500}
          className={field}
        />
      </label>

      <div className="flex flex-col gap-1 text-sm">
        <span>Photo du justificatif (registre, autorisation…) — facultatif</span>
        {f.proofImageUrl ? (
          <a
            href={f.proofImageUrl}
            target="_blank"
            rel="noreferrer"
            className="text-[var(--color-brand)] underline"
          >
            Voir le fichier envoyé
          </a>
        ) : null}
        <input
          type="file"
          accept="image/*"
          onChange={(e) => void onFile(e.target.files?.[0] ?? null)}
          disabled={uploading}
          className="text-sm"
        />
      </div>

      {err ? <p className="text-sm text-[var(--color-danger)]">{err}</p> : null}
      <button
        type="button"
        onClick={submit}
        disabled={busy || uploading || !f.legalName.trim() || !f.registryNumber.trim()}
        className="w-fit rounded-[var(--radius-btn)] bg-[var(--color-brand)] px-4 py-2 text-sm font-medium text-[var(--color-brand-ink)] disabled:opacity-50"
      >
        {busy ? '…' : 'Soumettre la demande'}
      </button>
    </div>
  );
}

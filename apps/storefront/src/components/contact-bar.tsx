'use client';

import { smsLink, telLink, whatsappLink } from '@jokko/ui';

interface Props {
  shopName: string;
  whatsapp: string | null;
  productName: string;
  productUrl: string;
}

export function ContactBar({ shopName, whatsapp, productName, productUrl }: Props) {
  const message = `Bonjour ${shopName}, je suis intéressé(e) par « ${productName} » : ${productUrl}`;

  const share = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: productName, url: productUrl });
      } catch {
        /* annulé */
      }
    } else {
      await navigator.clipboard.writeText(productUrl);
    }
  };

  return (
    <div className="flex flex-wrap gap-2">
      {whatsapp ? (
        <a
          href={whatsappLink(whatsapp, message)}
          target="_blank"
          rel="noreferrer"
          className="rounded-[var(--radius-btn)] bg-[var(--color-brand)] text-[var(--color-brand-ink)] px-4 py-2.5 text-sm font-medium"
        >
          Commander sur WhatsApp
        </a>
      ) : null}
      {whatsapp ? (
        <a
          href={smsLink(whatsapp, message)}
          className="rounded-[var(--radius-btn)] border border-[var(--color-border)] px-4 py-2.5 text-sm"
        >
          SMS
        </a>
      ) : null}
      {whatsapp ? (
        <a
          href={telLink(whatsapp)}
          className="rounded-[var(--radius-btn)] border border-[var(--color-border)] px-4 py-2.5 text-sm"
        >
          Appeler
        </a>
      ) : null}
      <button
        type="button"
        onClick={share}
        className="rounded-[var(--radius-btn)] border border-[var(--color-border)] px-4 py-2.5 text-sm"
      >
        Partager
      </button>
    </div>
  );
}

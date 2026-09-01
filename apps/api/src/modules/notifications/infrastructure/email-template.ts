export function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => {
    switch (c) {
      case '&':
        return '&amp;';
      case '<':
        return '&lt;';
      case '>':
        return '&gt;';
      case '"':
        return '&quot;';
      default:
        return '&#39;';
    }
  });
}

export interface EmailContent {
  /** Titre affiché en gras en haut du corps + utilisé comme `<title>`. */
  title: string;
  /** Paragraphes de texte (échappés automatiquement). */
  lines: string[];
  /** Citation optionnelle mise en avant (ex. aperçu d'un message). */
  quote?: string;
  /** Bouton d'action optionnel. */
  cta?: { label: string; url: string };
  /** Ligne de pied de page (par défaut : mention Jokko). */
  footnote?: string;
}

const BRAND = '#0f172a';
const ACCENT = '#2563eb';
const MUTED = '#64748b';
const DEFAULT_FOOTNOTE =
  'Vous recevez cet e-mail parce que vous gérez une boutique sur Jokko.';

/**
 * Gabarit d'e-mail transactionnel : HTML compatible clients de messagerie
 * (tableaux, styles en ligne, largeur bornée) + repli texte brut.
 */
export function renderEmail(c: EmailContent): { html: string; text: string } {
  const title = escapeHtml(c.title);
  const paragraphs = c.lines
    .map(
      (l) =>
        `<p style="margin:0 0 14px;font-size:15px;line-height:1.55;color:#1e293b">${escapeHtml(
          l,
        )}</p>`,
    )
    .join('');

  const quote = c.quote
    ? `<blockquote style="margin:0 0 18px;padding:12px 16px;border-left:3px solid ${ACCENT};background:#f1f5f9;font-size:15px;line-height:1.55;color:#1e293b">${escapeHtml(
        c.quote,
      )}</blockquote>`
    : '';

  const cta = c.cta
    ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:8px 0 4px"><tr><td style="border-radius:8px;background:${ACCENT}">
         <a href="${encodeURI(c.cta.url)}" style="display:inline-block;padding:11px 20px;font-size:14px;font-weight:600;color:#ffffff;text-decoration:none">${escapeHtml(
           c.cta.label,
         )}</a>
       </td></tr></table>`
    : '';

  const footnote = escapeHtml(c.footnote ?? DEFAULT_FOOTNOTE);

  const html = `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${title}</title></head>
<body style="margin:0;padding:0;background:#f8fafc">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:24px 12px">
    <tr><td align="center">
      <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="max-width:480px;width:100%;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e2e8f0">
        <tr><td style="background:${BRAND};padding:16px 24px">
          <span style="font-size:16px;font-weight:700;color:#ffffff;letter-spacing:0.2px">Jokko</span>
        </td></tr>
        <tr><td style="padding:24px">
          <h1 style="margin:0 0 16px;font-size:17px;line-height:1.4;color:#0f172a">${title}</h1>
          ${paragraphs}
          ${quote}
          ${cta}
        </td></tr>
        <tr><td style="padding:16px 24px;border-top:1px solid #e2e8f0">
          <p style="margin:0;font-size:12px;line-height:1.5;color:${MUTED}">${footnote}</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;

  const text = [
    c.title,
    '',
    ...c.lines,
    ...(c.quote ? ['', `« ${c.quote} »`] : []),
    ...(c.cta ? ['', `${c.cta.label} : ${c.cta.url}`] : []),
    '',
    '—',
    c.footnote ?? DEFAULT_FOOTNOTE,
  ].join('\n');

  return { html, text };
}

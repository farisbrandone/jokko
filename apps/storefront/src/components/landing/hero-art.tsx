/** Illustration décorative du hero : un téléphone-boutique et des cartes flottantes.
 *  Purement CSS/SVG, sans image externe — s'adapte au thème via les tokens. */
export function HeroArt() {
  return (
    <svg
      viewBox="0 0 420 400"
      role="img"
      aria-label="Une boutique en ligne sur un téléphone"
      className="w-full h-auto"
    >
      <defs>
        <linearGradient id="jk-bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="var(--color-brand)" stopOpacity="0.18" />
          <stop offset="1" stopColor="var(--color-brand)" stopOpacity="0.02" />
        </linearGradient>
        <linearGradient id="jk-brand" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="var(--color-brand)" />
          <stop offset="1" stopColor="var(--color-brand)" stopOpacity="0.75" />
        </linearGradient>
      </defs>

      <circle cx="210" cy="200" r="190" fill="url(#jk-bg)" />

      {/* Téléphone */}
      <g transform="translate(120 44)">
        <rect
          x="0"
          y="0"
          width="180"
          height="312"
          rx="26"
          fill="var(--color-surface)"
          stroke="var(--color-border)"
          strokeWidth="2"
        />
        <rect x="14" y="18" width="152" height="46" rx="12" fill="url(#jk-brand)" />
        <circle cx="34" cy="41" r="10" fill="var(--color-brand-ink)" opacity="0.9" />
        <rect x="52" y="33" width="76" height="7" rx="3.5" fill="var(--color-brand-ink)" opacity="0.9" />
        <rect x="52" y="46" width="52" height="6" rx="3" fill="var(--color-brand-ink)" opacity="0.6" />

        {/* grille produits */}
        {[0, 1, 2, 3].map((i) => {
          const x = 14 + (i % 2) * 80;
          const y = 78 + Math.floor(i / 2) * 96;
          return (
            <g key={i} transform={`translate(${x} ${y})`}>
              <rect width="72" height="86" rx="10" fill="var(--color-surface-2)" />
              <rect x="8" y="8" width="56" height="42" rx="6" fill="var(--color-brand)" opacity={0.15 + i * 0.12} />
              <rect x="8" y="58" width="44" height="6" rx="3" fill="var(--color-ink)" opacity="0.55" />
              <rect x="8" y="70" width="26" height="6" rx="3" fill="var(--color-brand)" />
            </g>
          );
        })}

        <rect x="14" y="276" width="152" height="24" rx="12" fill="url(#jk-brand)" />
        <rect x="62" y="285" width="56" height="6" rx="3" fill="var(--color-brand-ink)" />
      </g>

      {/* Carte flottante : commande payée */}
      <g transform="translate(20 96)">
        <rect width="140" height="58" rx="14" fill="var(--color-surface)" stroke="var(--color-border)" strokeWidth="1.5" />
        <circle cx="30" cy="29" r="14" fill="var(--color-good)" opacity="0.15" />
        <path d="M24 29l4 4 8-9" stroke="var(--color-good)" strokeWidth="2.4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        <rect x="52" y="18" width="72" height="7" rx="3.5" fill="var(--color-ink)" opacity="0.7" />
        <rect x="52" y="32" width="46" height="6" rx="3" fill="var(--color-muted)" />
      </g>

      {/* Carte flottante : lien partagé */}
      <g transform="translate(266 250)">
        <rect width="150" height="58" rx="14" fill="var(--color-surface)" stroke="var(--color-border)" strokeWidth="1.5" />
        <circle cx="30" cy="29" r="14" fill="var(--color-brand)" opacity="0.16" />
        <path
          d="M25 29l4-4M35 29l-4 4M27 24l6 0M27 34l6 0"
          stroke="var(--color-brand)"
          strokeWidth="2.2"
          strokeLinecap="round"
        />
        <rect x="52" y="17" width="84" height="7" rx="3.5" fill="var(--color-ink)" opacity="0.7" />
        <rect x="52" y="31" width="58" height="6" rx="3" fill="var(--color-muted)" />
      </g>

      {/* Bulle WhatsApp */}
      <g transform="translate(300 70)">
        <path
          d="M20 4a20 20 0 0 0-17 30L1 44l10-2A20 20 0 1 0 20 4Z"
          fill="var(--color-surface)"
          stroke="var(--color-border)"
          strokeWidth="1.5"
        />
        <path
          d="M14 15c0 8 5 13 13 13 2 0 3-2 2-3l-3-2-2 2c-2-1-4-3-5-5l2-2-2-3c-1-1-3 0-3 2Z"
          fill="var(--color-good)"
        />
      </g>
    </svg>
  );
}

/** Icônes décoratives de la page d'accueil (trait, héritent de currentColor). */
type P = { className?: string };

const base = 'h-6 w-6';
const svg = (className?: string) => ({
  className: `${base} ${className ?? ''}`.trim(),
  viewBox: '0 0 24 24',
  fill: 'none' as const,
  stroke: 'currentColor',
  strokeWidth: 1.6,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
});

export function IconStorefront({ className }: P) {
  return (
    <svg {...svg(className)}>
      <path d="M4 9 5.2 4.8A1 1 0 0 1 6.2 4h11.6a1 1 0 0 1 1 .8L20 9" />
      <path d="M4 9v10a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1V9" />
      <path d="M4 9a2.5 2.5 0 0 0 5 0 2.5 2.5 0 0 0 5 0 2.5 2.5 0 0 0 5 0" />
      <path d="M9 20v-5h6v5" />
    </svg>
  );
}
export function IconLink({ className }: P) {
  return (
    <svg {...svg(className)}>
      <path d="M9 15 15 9" />
      <path d="M11 6.5 12.6 5a4 4 0 0 1 5.7 5.7l-1.6 1.6" />
      <path d="M13 17.5 11.4 19a4 4 0 0 1-5.7-5.7l1.6-1.6" />
    </svg>
  );
}
export function IconWallet({ className }: P) {
  return (
    <svg {...svg(className)}>
      <path d="M4 7a2 2 0 0 1 2-2h11a1 1 0 0 1 1 1v2" />
      <path d="M4 7v10a2 2 0 0 0 2 2h13a1 1 0 0 0 1-1V9a1 1 0 0 0-1-1H6a2 2 0 0 1-2-1Z" />
      <circle cx="16.5" cy="13" r="1.2" />
    </svg>
  );
}
export function IconTag({ className }: P) {
  return (
    <svg {...svg(className)}>
      <path d="M4 13 12.6 4.4a2 2 0 0 1 1.4-.6H19a1 1 0 0 1 1 1v5a2 2 0 0 1-.6 1.4L10.8 20a2 2 0 0 1-2.8 0l-4-4a2 2 0 0 1 0-2.8Z" />
      <circle cx="15.5" cy="8.5" r="1.2" />
    </svg>
  );
}
export function IconChat({ className }: P) {
  return (
    <svg {...svg(className)}>
      <path d="M20 15a2 2 0 0 1-2 2H8l-4 4V6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2Z" />
      <path d="M8 9h8M8 12.5h5" />
    </svg>
  );
}
export function IconUsers({ className }: P) {
  return (
    <svg {...svg(className)}>
      <circle cx="9" cy="8" r="3" />
      <path d="M3.5 19a5.5 5.5 0 0 1 11 0" />
      <path d="M16 6.2A3 3 0 0 1 16 12" />
      <path d="M17 14.3a5.5 5.5 0 0 1 3.5 5.1" />
    </svg>
  );
}
export function IconScale({ className }: P) {
  return (
    <svg {...svg(className)}>
      <path d="M12 4v16M7 20h10" />
      <path d="M5 8h14M5 8l-2.5 5a3 3 0 0 0 5 0Zm14 0-2.5 5a3 3 0 0 0 5 0Z" />
    </svg>
  );
}
export function IconShieldCheck({ className }: P) {
  return (
    <svg {...svg(className)}>
      <path d="M12 3.5 19 6v5c0 4.5-3 8-7 9.5C8 19 5 15.5 5 11V6Z" />
      <path d="m9 12 2 2 4-4.5" />
    </svg>
  );
}
export function IconSparkles({ className }: P) {
  return (
    <svg {...svg(className)}>
      <path d="M12 4c.6 3.2 1.8 4.4 5 5-3.2.6-4.4 1.8-5 5-.6-3.2-1.8-4.4-5-5 3.2-.6 4.4-1.8 5-5Z" />
      <path d="M18.5 13c.3 1.4.8 1.9 2.2 2.2-1.4.3-1.9.8-2.2 2.2-.3-1.4-.8-1.9-2.2-2.2 1.4-.3 1.9-.8 2.2-2.2Z" />
    </svg>
  );
}
export function IconTruck({ className }: P) {
  return (
    <svg {...svg(className)}>
      <path d="M3 7h10v9H3z" />
      <path d="M13 10h4l3 3v3h-7z" />
      <circle cx="7" cy="18" r="1.6" />
      <circle cx="17" cy="18" r="1.6" />
    </svg>
  );
}
export function IconPin({ className }: P) {
  return (
    <svg {...svg(className)}>
      <path d="M12 21c4-4.5 7-7.6 7-11a7 7 0 0 0-14 0c0 3.4 3 6.5 7 11Z" />
      <circle cx="12" cy="10" r="2.4" />
    </svg>
  );
}
export function IconEye({ className }: P) {
  return (
    <svg {...svg(className)}>
      <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

export const SELLER_ICONS = [
  IconStorefront,
  IconLink,
  IconWallet,
  IconTag,
  IconChat,
  IconUsers,
];
export const BUYER_ICONS = [
  IconScale,
  IconEye,
  IconShieldCheck,
  IconChat,
  IconTruck,
  IconPin,
];

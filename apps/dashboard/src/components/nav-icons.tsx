/** Icônes de navigation du tableau de bord (trait, héritent de currentColor). */
export type IconProps = { className?: string };
type P = IconProps;
const p = (className?: string) => ({
  className: `h-5 w-5 ${className ?? ''}`.trim(),
  viewBox: '0 0 24 24',
  fill: 'none' as const,
  stroke: 'currentColor',
  strokeWidth: 1.7,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
});

export const IconShops = ({ className }: P) => (
  <svg {...p(className)}>
    <path d="M4 10v9a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-9" />
    <path d="M3 10 4.5 4.5A1 1 0 0 1 5.5 4h13a1 1 0 0 1 1 .5L21 10a2.4 2.4 0 0 1-4.5 1 2.4 2.4 0 0 1-4.5 0 2.4 2.4 0 0 1-4.5 0A2.4 2.4 0 0 1 3 10Z" />
    <path d="M9 20v-5h6v5" />
  </svg>
);
export const IconBox = ({ className }: P) => (
  <svg {...p(className)}>
    <path d="M21 8 12 3 3 8v8l9 5 9-5Z" />
    <path d="M3 8l9 5 9-5M12 13v8" />
  </svg>
);
export const IconOrders = ({ className }: P) => (
  <svg {...p(className)}>
    <path d="M6 6h15l-1.5 9h-12z" />
    <path d="M6 6 5 3H2" />
    <circle cx="9" cy="20" r="1.4" />
    <circle cx="17" cy="20" r="1.4" />
  </svg>
);
export const IconChat = ({ className }: P) => (
  <svg {...p(className)}>
    <path d="M20 15a2 2 0 0 1-2 2H8l-4 4V6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2Z" />
  </svg>
);
export const IconStar = ({ className }: P) => (
  <svg {...p(className)}>
    <path d="M12 4l2.4 4.9 5.4.8-3.9 3.8.9 5.3L12 16.3 7.2 18.8l.9-5.3L4.2 9.7l5.4-.8Z" />
  </svg>
);
export const IconChart = ({ className }: P) => (
  <svg {...p(className)}>
    <path d="M4 20V4M4 20h16" />
    <path d="M8 20v-6M13 20v-10M18 20v-4" />
  </svg>
);
export const IconUsers = ({ className }: P) => (
  <svg {...p(className)}>
    <circle cx="9" cy="8" r="3" />
    <path d="M3.5 19a5.5 5.5 0 0 1 11 0" />
    <path d="M16 6.2A3 3 0 0 1 16 12M17 14.3a5.5 5.5 0 0 1 3.5 5.1" />
  </svg>
);
export const IconCard = ({ className }: P) => (
  <svg {...p(className)}>
    <rect x="3" y="6" width="18" height="12" rx="2" />
    <path d="M3 10h18" />
  </svg>
);
export const IconSettings = ({ className }: P) => (
  <svg {...p(className)}>
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 13a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-2.7 1.1V21a2 2 0 0 1-4 0v-.2A1.6 1.6 0 0 0 7 19.4a1.6 1.6 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1A1.6 1.6 0 0 0 3.6 14H3a2 2 0 0 1 0-4h.2A1.6 1.6 0 0 0 4.6 7a1.6 1.6 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1A1.6 1.6 0 0 0 10 3.6V3a2 2 0 0 1 4 0v.2a1.6 1.6 0 0 0 2.7 1.1 1.6 1.6 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0-.3 1.8V7a1.6 1.6 0 0 0 1.4 1H21a2 2 0 0 1 0 4h-.2a1.6 1.6 0 0 0-1.4 1Z" />
  </svg>
);
export const IconUser = ({ className }: P) => (
  <svg {...p(className)}>
    <circle cx="12" cy="8" r="3.5" />
    <path d="M4.5 20a7.5 7.5 0 0 1 15 0" />
  </svg>
);
export const IconLogout = ({ className }: P) => (
  <svg {...p(className)}>
    <path d="M9 21H5a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h4" />
    <path d="M16 17l5-5-5-5M21 12H9" />
  </svg>
);
export const IconExternal = ({ className }: P) => (
  <svg {...p(className)}>
    <path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" />
  </svg>
);
export const IconTag = ({ className }: P) => (
  <svg {...p(className)}>
    <path d="M20.6 13.4 13.4 20.6a2 2 0 0 1-2.8 0l-7.2-7.2A2 2 0 0 1 3 12V4a1 1 0 0 1 1-1h8a2 2 0 0 1 1.4.6l7.2 7.2a2 2 0 0 1 0 2.8Z" />
    <circle cx="7.5" cy="7.5" r="1.5" />
  </svg>
);
export const IconFlag = ({ className }: P) => (
  <svg {...p(className)}>
    <path d="M5 21V4" />
    <path d="M5 4h13l-2.5 4L18 12H5" />
  </svg>
);

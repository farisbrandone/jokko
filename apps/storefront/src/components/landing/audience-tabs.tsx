'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { LandingContent } from '@/lib/landing-content';
import { SELLER_ICONS, BUYER_ICONS } from './icons';

type Group = LandingContent['audience']['seller'];

function Panel({
  group,
  icons,
  cta,
  ctaHref,
  external,
}: {
  group: Group;
  icons: typeof SELLER_ICONS;
  cta: string;
  ctaHref: string;
  external?: boolean;
}) {
  return (
    <div className="flex flex-col gap-6">
      <p className="max-w-2xl text-[var(--color-muted)]">{group.intro}</p>
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {group.points.map((p, i) => {
          const Icon = icons[i % icons.length];
          return (
            <li
              key={p.title}
              className="rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] p-5 transition-shadow hover:shadow-md"
            >
              <span className="mb-3 inline-grid h-10 w-10 place-items-center rounded-full bg-[var(--color-brand-soft)] text-[var(--color-brand)]">
                <Icon />
              </span>
              <h3 className="font-medium">{p.title}</h3>
              <p className="mt-1 text-sm text-[var(--color-muted)]">{p.body}</p>
            </li>
          );
        })}
      </ul>
      <div>
        {external ? (
          <a
            href={ctaHref}
            className="inline-flex rounded-[var(--radius-btn)] bg-[var(--color-brand)] px-5 py-2.5 text-sm font-semibold text-[var(--color-brand-ink)]"
          >
            {cta}
          </a>
        ) : (
          <Link
            href={ctaHref}
            className="inline-flex rounded-[var(--radius-btn)] border border-[var(--color-border)] px-5 py-2.5 text-sm font-semibold hover:bg-[var(--color-surface-2)]"
          >
            {cta}
          </Link>
        )}
      </div>
    </div>
  );
}

export function AudienceTabs({
  audience,
  dashboardUrl,
  boutiquesHref,
}: {
  audience: LandingContent['audience'];
  dashboardUrl: string;
  boutiquesHref: string;
}) {
  const [tab, setTab] = useState<'seller' | 'buyer'>('seller');
  const active = audience[tab];

  const tabBtn = (key: 'seller' | 'buyer', label: string) => (
    <button
      key={key}
      type="button"
      onClick={() => setTab(key)}
      aria-pressed={tab === key}
      className={`rounded-full px-5 py-2 text-sm font-medium transition-colors ${
        tab === key
          ? 'bg-[var(--color-brand)] text-[var(--color-brand-ink)]'
          : 'border border-[var(--color-border)] text-[var(--color-muted)] hover:text-[var(--color-ink)]'
      }`}
    >
      {label}
    </button>
  );

  return (
    <div className="flex flex-col gap-7">
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="font-[family-name:var(--font-display)] text-2xl font-bold sm:text-3xl">
          {active.title}
        </h2>
        <div className="flex gap-2">
          {tabBtn('seller', audience.sellerTab)}
          {tabBtn('buyer', audience.buyerTab)}
        </div>
      </div>

      {tab === 'seller' ? (
        <Panel
          group={audience.seller}
          icons={SELLER_ICONS}
          cta={audience.seller.cta}
          ctaHref={dashboardUrl}
          external
        />
      ) : (
        <Panel
          group={audience.buyer}
          icons={BUYER_ICONS}
          cta={audience.buyer.cta}
          ctaHref={boutiquesHref}
        />
      )}
    </div>
  );
}

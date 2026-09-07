import Link from 'next/link';
import type { DirectoryShop } from '@jokko/contracts';
import type { AppLocale } from '@/i18n/request';
import { DASHBOARD_URL, landingContent } from '@/lib/landing-content';
import { AudienceTabs } from './audience-tabs';
import { HeroArt } from './hero-art';

const BOUTIQUES = '/boutiques';

function shopUrl(apex: string, slug: string): string {
  return apex.replace('://', `://${slug}.`);
}

export function LandingPage({
  locale,
  apex,
  featured,
}: {
  locale: AppLocale;
  apex: string;
  featured: DirectoryShop[];
}) {
  const c = landingContent(locale);

  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        name: 'Jokko',
        url: apex,
        description: c.meta.description,
        slogan: c.hero.eyebrow,
      },
      {
        '@type': 'WebSite',
        name: 'Jokko',
        url: apex,
        inLanguage: locale,
        potentialAction: {
          '@type': 'SearchAction',
          target: `${apex}${BOUTIQUES}?q={search_term_string}`,
          'query-input': 'required name=search_term_string',
        },
      },
      {
        '@type': 'FAQPage',
        mainEntity: c.faq.items.map((it) => ({
          '@type': 'Question',
          name: it.q,
          acceptedAnswer: { '@type': 'Answer', text: it.a },
        })),
      },
    ],
  };

  return (
    <div className="flex flex-col gap-20 py-2">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      {/* HERO */}
      <section className="grid items-center gap-10 md:grid-cols-[1.1fr_0.9fr]">
        <div className="flex flex-col gap-5">
          <span className="inline-flex w-fit items-center gap-2 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-1 text-xs font-medium text-[var(--color-muted)]">
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-brand)]" />
            {c.hero.eyebrow}
          </span>
          <h1 className="font-[family-name:var(--font-display)] text-4xl font-bold leading-[1.1] sm:text-5xl">
            {c.hero.title} <span className="text-[var(--color-brand)]">{c.hero.highlight}</span>
          </h1>
          <p className="max-w-xl text-lg text-[var(--color-muted)]">{c.hero.subtitle}</p>
          <div className="flex flex-wrap gap-3">
            <a
              href={DASHBOARD_URL}
              className="rounded-[var(--radius-btn)] bg-[var(--color-brand)] px-6 py-3 text-sm font-semibold text-[var(--color-brand-ink)] shadow-sm transition-transform hover:-translate-y-0.5"
            >
              {c.hero.ctaPrimary}
            </a>
            <Link
              href={BOUTIQUES}
              className="rounded-[var(--radius-btn)] border border-[var(--color-border)] bg-[var(--color-surface)] px-6 py-3 text-sm font-semibold hover:bg-[var(--color-surface-2)]"
            >
              {c.hero.ctaSecondary}
            </Link>
          </div>
          <p className="text-xs text-[var(--color-faint)]">{c.hero.reassurance}</p>
        </div>
        <div className="mx-auto w-full max-w-sm md:max-w-none">
          <HeroArt />
        </div>
      </section>

      {/* PILIERS */}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {c.pillars.map((p) => (
          <div
            key={p.label}
            className="rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] p-5"
          >
            <div className="font-[family-name:var(--font-display)] text-2xl font-bold text-[var(--color-brand)]">
              {p.value}
            </div>
            <div className="mt-1 text-sm text-[var(--color-muted)]">{p.label}</div>
          </div>
        ))}
      </section>

      {/* AUDIENCE (client) */}
      <section>
        <AudienceTabs audience={c.audience} dashboardUrl={DASHBOARD_URL} boutiquesHref={BOUTIQUES} />
      </section>

      {/* COMMENT ÇA MARCHE */}
      <section className="flex flex-col gap-8">
        <h2 className="font-[family-name:var(--font-display)] text-2xl font-bold sm:text-3xl">
          {c.how.title}
        </h2>
        <div className="grid gap-10 md:grid-cols-2">
          {[
            { title: c.how.sellerTitle, steps: c.how.sellerSteps },
            { title: c.how.buyerTitle, steps: c.how.buyerSteps },
          ].map((col) => (
            <div key={col.title} className="flex flex-col gap-4">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-[var(--color-faint)]">
                {col.title}
              </h3>
              <ol className="flex flex-col gap-4">
                {col.steps.map((s, i) => (
                  <li key={s.title} className="flex gap-4">
                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[var(--color-brand-soft)] text-sm font-semibold text-[var(--color-brand)]">
                      {i + 1}
                    </span>
                    <div>
                      <div className="font-medium">{s.title}</div>
                      <p className="text-sm text-[var(--color-muted)]">{s.body}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          ))}
        </div>
      </section>

      {/* BOUTIQUES EN VEDETTE */}
      <section className="flex flex-col gap-5">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 className="font-[family-name:var(--font-display)] text-2xl font-bold sm:text-3xl">
              {c.featured.title}
            </h2>
            <p className="mt-1 text-[var(--color-muted)]">{c.featured.subtitle}</p>
          </div>
          <Link href={BOUTIQUES} className="text-sm font-medium text-[var(--color-brand)] hover:underline">
            {c.featured.seeAll} →
          </Link>
        </div>
        {featured.length === 0 ? (
          <p className="rounded-[var(--radius-card)] border border-dashed border-[var(--color-border)] p-8 text-center text-[var(--color-muted)]">
            {c.featured.empty}
          </p>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {featured.slice(0, 6).map((s) => (
              <li key={s.slug}>
                <a
                  href={shopUrl(apex, s.slug)}
                  className="flex h-full flex-col rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4 transition-shadow hover:shadow-md"
                >
                  <div className="flex items-center gap-2">
                    <span
                      aria-hidden
                      className="h-3 w-3 rounded-full"
                      style={{ background: s.brandColor ?? 'var(--color-brand)' }}
                    />
                    <span className="font-medium">{s.name}</span>
                  </div>
                  {s.tagline ? (
                    <p className="mt-1 line-clamp-2 text-sm text-[var(--color-muted)]">{s.tagline}</p>
                  ) : null}
                  <p className="mt-auto pt-2 text-xs text-[var(--color-faint)]">
                    {c.featured.productsLabel(s.products)}
                  </p>
                </a>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* FAQ */}
      <section className="flex flex-col gap-5">
        <h2 className="font-[family-name:var(--font-display)] text-2xl font-bold sm:text-3xl">
          {c.faq.title}
        </h2>
        <div className="divide-y divide-[var(--color-border)] rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)]">
          {c.faq.items.map((it) => (
            <details key={it.q} className="group px-5 py-4">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-medium">
                {it.q}
                <span className="text-[var(--color-faint)] transition-transform group-open:rotate-45">+</span>
              </summary>
              <p className="mt-2 text-sm text-[var(--color-muted)]">{it.a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* CTA FINAL */}
      <section className="rounded-[var(--radius-card)] bg-[var(--color-brand-soft)] px-6 py-12 text-center">
        <h2 className="font-[family-name:var(--font-display)] text-2xl font-bold sm:text-3xl">
          {c.finalCta.title}
        </h2>
        <p className="mx-auto mt-2 max-w-xl text-[var(--color-muted)]">{c.finalCta.subtitle}</p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <a
            href={DASHBOARD_URL}
            className="rounded-[var(--radius-btn)] bg-[var(--color-brand)] px-6 py-3 text-sm font-semibold text-[var(--color-brand-ink)]"
          >
            {c.finalCta.button}
          </a>
          <Link href={BOUTIQUES} className="text-sm font-medium text-[var(--color-brand)] hover:underline">
            {c.finalCta.secondary}
          </Link>
        </div>
      </section>
    </div>
  );
}

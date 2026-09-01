import type { LegalDocument } from '@jokko/ui';

export function LegalView({ doc }: { doc: LegalDocument }) {
  return (
    <article className="mx-auto max-w-2xl">
      <h1 className="font-[family-name:var(--font-display)] text-2xl font-bold">{doc.title}</h1>
      <p className="mt-1 text-sm text-[var(--color-muted)]">
        Dernière mise à jour : {doc.updated}
      </p>
      {doc.intro ? <p className="mt-4 text-sm leading-relaxed">{doc.intro}</p> : null}
      <div className="mt-6 flex flex-col gap-6">
        {doc.sections.map((s, i) => (
          <section key={i}>
            {s.heading ? <h2 className="mb-2 font-semibold">{s.heading}</h2> : null}
            <div className="flex flex-col gap-2 text-sm leading-relaxed">
              {s.paragraphs.map((p, j) => (
                <p key={j}>{p}</p>
              ))}
            </div>
          </section>
        ))}
      </div>
    </article>
  );
}

import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { LEGAL_DOCUMENTS, LEGAL_SLUGS, type LegalSlug } from '@jokko/ui';
import { LegalView } from '@/components/legal-view';

export function generateStaticParams() {
  return LEGAL_SLUGS.map((slug) => ({ slug }));
}

type Params = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const doc = LEGAL_DOCUMENTS[slug as LegalSlug];
  return { title: doc ? doc.title : 'Introuvable' };
}

export default async function LegalPage({ params }: Params) {
  const { slug } = await params;
  const doc = LEGAL_DOCUMENTS[slug as LegalSlug];
  if (!doc) notFound();
  return <LegalView doc={doc} />;
}

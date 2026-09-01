import type { Metadata } from 'next';
import { LEGAL_DOCUMENTS } from '@jokko/ui';
import { LegalView } from '@/components/legal-view';

const doc = LEGAL_DOCUMENTS['mentions-legales'];

export const metadata: Metadata = { title: doc.title };

export default function MentionsLegalesPage() {
  return <LegalView doc={doc} />;
}

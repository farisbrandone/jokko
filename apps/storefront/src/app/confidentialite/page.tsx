import type { Metadata } from 'next';
import { LEGAL_DOCUMENTS } from '@jokko/ui';
import { LegalView } from '@/components/legal-view';

const doc = LEGAL_DOCUMENTS['confidentialite'];

export const metadata: Metadata = { title: doc.title };

export default function ConfidentialitePage() {
  return <LegalView doc={doc} />;
}

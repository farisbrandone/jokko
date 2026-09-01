import type { Metadata } from 'next';
import { LEGAL_DOCUMENTS } from '@jokko/ui';
import { LegalView } from '@/components/legal-view';

const doc = LEGAL_DOCUMENTS['cgu'];

export const metadata: Metadata = { title: doc.title };

export default function CguPage() {
  return <LegalView doc={doc} />;
}

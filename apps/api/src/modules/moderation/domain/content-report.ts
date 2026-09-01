import type { ReportStatus } from '@jokko/contracts';

export type ResolveAction = 'dismiss' | 'takedown';

/** Statut cible d'un signalement selon la décision de modération. */
export function statusForAction(action: ResolveAction): Extract<ReportStatus, 'actioned' | 'dismissed'> {
  return action === 'takedown' ? 'actioned' : 'dismissed';
}

export const REPORT_REASON_LABELS: Record<string, string> = {
  counterfeit: 'Contrefaçon',
  prohibited: 'Produit interdit',
  scam: 'Arnaque',
  offensive: 'Contenu choquant',
  spam: 'Spam',
  other: 'Autre',
};

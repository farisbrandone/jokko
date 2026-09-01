import { z } from 'zod';
import { IdSchema, paginated } from './common';

export const reportTargetSchema = z.enum(['product', 'shop']);
export type ReportTarget = z.infer<typeof reportTargetSchema>;

export const reportReasonSchema = z.enum([
  'counterfeit', // contrefaçon
  'prohibited', // produit interdit / illégal
  'scam', // arnaque / fraude
  'offensive', // contenu choquant
  'spam', // spam / doublon
  'other',
]);
export type ReportReason = z.infer<typeof reportReasonSchema>;

export const reportStatusSchema = z.enum(['pending', 'actioned', 'dismissed']);
export type ReportStatus = z.infer<typeof reportStatusSchema>;

/** Signalement déposé depuis la vitrine (public, sans compte). */
export const createReportSchema = z.object({
  targetType: reportTargetSchema,
  targetId: IdSchema,
  reason: reportReasonSchema,
  note: z.string().trim().max(500).optional(),
  /** Identifiant d'appareil/session généré par la vitrine (dédoublonnage). */
  reporterKey: z.string().trim().max(120).optional(),
});
export type CreateReportInput = z.infer<typeof createReportSchema>;

export const resolveReportSchema = z.object({
  action: z.enum(['dismiss', 'takedown']),
});
export type ResolveReportInput = z.infer<typeof resolveReportSchema>;

export const adminReportRowSchema = z.object({
  id: IdSchema,
  shopId: IdSchema,
  shopName: z.string(),
  shopSlug: z.string(),
  targetType: reportTargetSchema,
  targetId: IdSchema,
  targetLabel: z.string().nullable(),
  reason: reportReasonSchema,
  note: z.string().nullable(),
  status: reportStatusSchema,
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type AdminReportRow = z.infer<typeof adminReportRowSchema>;

export const adminReportListSchema = paginated(adminReportRowSchema);
export type AdminReportList = z.infer<typeof adminReportListSchema>;

import { z } from 'zod';
import { IdSchema } from './common';

export const DisputeReasonSchema = z.enum([
  'not_received',
  'not_as_described',
  'damaged',
  'wrong_item',
  'other',
]);
export type DisputeReason = z.infer<typeof DisputeReasonSchema>;

export const DisputeStatusSchema = z.enum([
  'open',
  'seller_responded',
  'resolved',
  'escalated',
  'closed',
]);
export type DisputeStatus = z.infer<typeof DisputeStatusSchema>;

export const DisputeResolutionSchema = z.enum(['refund', 'replacement', 'rejected']);
export type DisputeResolution = z.infer<typeof DisputeResolutionSchema>;

export const DisputeSchema = z.object({
  id: IdSchema,
  shopId: IdSchema,
  orderId: IdSchema,
  buyerPhone: z.string(),
  reason: DisputeReasonSchema,
  description: z.string(),
  status: DisputeStatusSchema,
  sellerResponse: z.string().nullable(),
  resolution: DisputeResolutionSchema.nullable(),
  resolutionNote: z.string().nullable(),
  escalationNote: z.string().nullable(),
  adminNote: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  escalatedAt: z.string().nullable(),
  closedAt: z.string().nullable(),
});
export type Dispute = z.infer<typeof DisputeSchema>;

export const OpenDisputeSchema = z.object({
  reason: DisputeReasonSchema,
  description: z.string().trim().min(10).max(1000),
});
export type OpenDisputeInput = z.infer<typeof OpenDisputeSchema>;

export const RespondDisputeSchema = z.object({
  response: z.string().trim().min(2).max(1000),
  resolution: DisputeResolutionSchema.optional(),
  resolutionNote: z.string().trim().max(500).nullable().optional(),
});
export type RespondDisputeInput = z.infer<typeof RespondDisputeSchema>;

export const EscalateDisputeSchema = z.object({
  note: z.string().trim().max(500).nullable().optional(),
});
export type EscalateDisputeInput = z.infer<typeof EscalateDisputeSchema>;

export const MediateDisputeSchema = z.object({
  resolution: DisputeResolutionSchema,
  note: z.string().trim().max(500).nullable().optional(),
});
export type MediateDisputeInput = z.infer<typeof MediateDisputeSchema>;

/** Vue console plateforme : le litige + l'identité de la boutique concernée. */
export const AdminDisputeSchema = DisputeSchema.extend({
  shopName: z.string(),
  shopSlug: z.string(),
});
export type AdminDispute = z.infer<typeof AdminDisputeSchema>;

export const AdminDisputeListSchema = z.object({
  items: z.array(AdminDisputeSchema),
  total: z.number().int().nonnegative(),
  page: z.number().int().positive(),
  pageSize: z.number().int().positive(),
});
export type AdminDisputeList = z.infer<typeof AdminDisputeListSchema>;

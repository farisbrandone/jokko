import { z } from 'zod';

export const subscriptionPlanSchema = z.enum(['trial', 'pro']);
export type SubscriptionPlan = z.infer<typeof subscriptionPlanSchema>;

export const subscriptionStatusSchema = z.enum([
  'trialing',
  'active',
  'past_due',
  'canceled',
]);
export type SubscriptionStatus = z.infer<typeof subscriptionStatusSchema>;

export const billingSummarySchema = z.object({
  plan: subscriptionPlanSchema,
  status: subscriptionStatusSchema,
  currentPeriodEnd: z.string(),
  /** La boutique est-elle servie (période en cours ou dans la fenêtre de grâce) ? */
  entitled: z.boolean(),
  priceXof: z.number().int(),
  currency: z.literal('XOF'),
});
export type BillingSummary = z.infer<typeof billingSummarySchema>;

export const checkoutInputSchema = z.object({
  returnUrl: z.string().url().optional(),
});
export type CheckoutInput = z.infer<typeof checkoutInputSchema>;

export const checkoutResultSchema = z.object({ url: z.string().url() });
export type CheckoutResult = z.infer<typeof checkoutResultSchema>;

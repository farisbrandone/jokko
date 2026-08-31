import { z } from 'zod';

export const AnalyticsEventNameSchema = z.enum([
  'page_view',
  'product_view',
  'search',
  'contact_click',
]);
export type AnalyticsEventName = z.infer<typeof AnalyticsEventNameSchema>;

export const ContactChannelSchema = z.enum([
  'whatsapp',
  'sms',
  'call',
  'message',
  'share',
]);
export type ContactChannel = z.infer<typeof ContactChannelSchema>;

export const AnalyticsEventSchema = z.object({
  name: AnalyticsEventNameSchema,
  props: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])).default({}),
  sessionId: z.string().max(64).optional(),
  ts: z.string().datetime().optional(),
});
export type AnalyticsEventInput = z.infer<typeof AnalyticsEventSchema>;

export const IngestEventsSchema = z.object({
  events: z.array(AnalyticsEventSchema).min(1).max(30),
});
export type IngestEventsInput = z.infer<typeof IngestEventsSchema>;

export const AnalyticsSummarySchema = z.object({
  days: z.number().int().positive(),
  pageViews: z.number().int().nonnegative(),
  productViews: z.number().int().nonnegative(),
  searches: z.number().int().nonnegative(),
  sessions: z.number().int().nonnegative(),
  contactClicks: z.number().int().nonnegative(),
  contactByChannel: z.record(z.string(), z.number()),
  contactRate: z.number(), // contactClicks / pageViews
  topProducts: z.array(z.object({ slug: z.string(), name: z.string(), views: z.number() })),
  topSearches: z.array(z.object({ term: z.string(), count: z.number() })),
  byDay: z.array(z.object({ day: z.string(), views: z.number() })),
});
export type AnalyticsSummary = z.infer<typeof AnalyticsSummarySchema>;

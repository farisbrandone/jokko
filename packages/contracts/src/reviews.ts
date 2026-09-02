import { z } from 'zod';

export const reviewStatusSchema = z.enum(['pending', 'published', 'rejected']);
export type ReviewStatus = z.infer<typeof reviewStatusSchema>;

export const createReviewSchema = z.object({
  rating: z.number().int().min(1).max(5),
  title: z.string().trim().max(120).optional(),
  body: z.string().trim().min(3).max(2000),
  authorName: z.string().trim().min(2).max(80),
});
export type CreateReviewInput = z.infer<typeof createReviewSchema>;

export const moderateReviewSchema = z.object({
  action: z.enum(['publish', 'reject']),
});
export type ModerateReviewInput = z.infer<typeof moderateReviewSchema>;

export const reviewSchema = z.object({
  id: z.string(),
  productId: z.string(),
  rating: z.number(),
  title: z.string().nullable(),
  body: z.string(),
  authorName: z.string(),
  status: reviewStatusSchema,
  createdAt: z.string(),
});
export type Review = z.infer<typeof reviewSchema>;

export const reviewSummarySchema = z.object({
  average: z.number(),
  count: z.number(),
  /** Nombre d'avis publiés par note, de 1 à 5. */
  distribution: z.tuple([z.number(), z.number(), z.number(), z.number(), z.number()]),
});
export type ReviewSummary = z.infer<typeof reviewSummarySchema>;

export const publicReviewsSchema = z.object({
  summary: reviewSummarySchema,
  items: z.array(reviewSchema),
});
export type PublicReviews = z.infer<typeof publicReviewsSchema>;

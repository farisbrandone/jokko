import type { CreateReviewInput, Review, ReviewStatus, ReviewSummary } from '@jokko/contracts';

export const REVIEW_REPOSITORY = Symbol('REVIEW_REPOSITORY');

export interface ReviewRepository {
  create(shopId: string, productId: string, input: CreateReviewInput): Promise<Review>;
  /** Avis publiés d'un produit + agrégat de notes. */
  publicForProduct(shopId: string, productId: string): Promise<{ summary: ReviewSummary; items: Review[] }>;
  listForShop(shopId: string, status?: ReviewStatus): Promise<Review[]>;
  setStatus(shopId: string, id: string, status: ReviewStatus): Promise<Review | null>;
}

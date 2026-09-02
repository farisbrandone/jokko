import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import type {
  CreateReviewInput,
  ModerateReviewInput,
  PublicReviews,
  Review,
  ReviewStatus,
} from '@jokko/contracts';
import {
  PRODUCT_REPOSITORY,
  type ProductRepository,
} from '../../catalog/domain/ports/product.repository';
import { REVIEW_REPOSITORY, type ReviewRepository } from '../domain/ports';

@Injectable()
export class ReviewsService {
  constructor(
    @Inject(REVIEW_REPOSITORY) private readonly reviews: ReviewRepository,
    @Inject(PRODUCT_REPOSITORY) private readonly products: ProductRepository,
  ) {}

  /** Dépôt public : uniquement sur un produit publié ; l'avis part « en attente ». */
  async submit(shopId: string, productId: string, input: CreateReviewInput): Promise<Review> {
    const product = await this.products.findById(shopId, productId);
    if (!product || product.toSnapshot().status !== 'published') {
      throw new NotFoundException('Produit introuvable');
    }
    return this.reviews.create(shopId, productId, input);
  }

  publicForProduct(shopId: string, productId: string): Promise<PublicReviews> {
    return this.reviews.publicForProduct(shopId, productId);
  }

  listForShop(shopId: string, status?: ReviewStatus): Promise<Review[]> {
    return this.reviews.listForShop(shopId, status);
  }

  async moderate(shopId: string, id: string, input: ModerateReviewInput): Promise<Review> {
    const status: ReviewStatus = input.action === 'publish' ? 'published' : 'rejected';
    const updated = await this.reviews.setStatus(shopId, id, status);
    if (!updated) throw new NotFoundException('Avis introuvable');
    return updated;
  }
}

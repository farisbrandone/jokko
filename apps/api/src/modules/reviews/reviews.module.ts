import { Module } from '@nestjs/common';
import { IdentityModule } from '../identity/identity.module';
import { ShopModule } from '../shop/shop.module';
import { CatalogModule } from '../catalog/catalog.module';
import { ReviewsService } from './application/reviews.service';
import { ReviewsPublicController } from './presentation/reviews-public.controller';
import { ReviewsAdminController } from './presentation/reviews-admin.controller';
import { REVIEW_REPOSITORY } from './domain/ports';
import { MikroOrmReviewRepository } from './infrastructure/persistence/mikro-orm-review.repository';

@Module({
  imports: [IdentityModule, ShopModule, CatalogModule],
  controllers: [ReviewsPublicController, ReviewsAdminController],
  providers: [
    ReviewsService,
    { provide: REVIEW_REPOSITORY, useClass: MikroOrmReviewRepository },
  ],
})
export class ReviewsModule {}

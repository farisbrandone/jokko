import { Product } from '../../domain/product.aggregate';
import { ProductEntity } from './product.entity';

/** Traduction état persisté (ProductEntity) ↔ agrégat de domaine (Product). */
export const ProductMapper = {
  toDomain(entity: ProductEntity): Product {
    return Product.restore({
      id: entity.id,
      shopId: entity.shopId,
      slug: entity.slug,
      name: entity.name,
      description: entity.description,
      category: entity.category,
      price: entity.price,
      compareAtPrice: entity.compareAtPrice,
      stock: entity.stock,
      images: entity.images,
      attributes: entity.attributes,
      variants: entity.variants ?? [],
      status: entity.status,
      createdAt: entity.createdAt.toISOString(),
      updatedAt: entity.updatedAt.toISOString(),
    });
  },

  assign(entity: ProductEntity, product: Product): ProductEntity {
    const s = product.toSnapshot();
    entity.id = s.id;
    entity.shopId = s.shopId;
    entity.slug = s.slug;
    entity.name = s.name;
    entity.description = s.description;
    entity.category = s.category;
    entity.price = s.price;
    entity.compareAtPrice = s.compareAtPrice;
    entity.stock = s.stock;
    entity.images = s.images;
    entity.attributes = s.attributes;
    entity.variants = s.variants;
    entity.status = s.status;
    entity.createdAt = new Date(s.createdAt);
    entity.updatedAt = new Date(s.updatedAt);
    return entity;
  },
};

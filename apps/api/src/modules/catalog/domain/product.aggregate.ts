import { randomUUID } from 'node:crypto';
import { AggregateRoot, Guard, Result, UniqueId } from '@jokko/domain-kernel';
import type { DynamicAttributes, ProductStatus, ProductVariant } from '@jokko/contracts';
import { Money } from './value-objects/money';
import { Slug } from './value-objects/slug';
import {
  ProductCreated,
  ProductPublished,
  ProductUnpublished,
  ProductUpdated,
} from './product.events';

export interface ProductSnapshot {
  id: string;
  shopId: string;
  slug: string;
  name: string;
  description: string;
  category: string;
  price: { amount: number; currency: string };
  compareAtPrice: { amount: number; currency: string } | null;
  stock: number;
  images: string[];
  attributes: DynamicAttributes;
  variants: ProductVariant[];
  status: ProductStatus;
  createdAt: string;
  updatedAt: string;
}

interface CreateProps {
  shopId: string;
  name: string;
  description?: string;
  category: string;
  price: Money;
  compareAtPrice?: Money | null;
  stock?: number;
  images?: string[];
  attributes?: DynamicAttributes;
  variants?: ProductVariant[];
}

/** Nettoyage des déclinaisons : libellé trimé, dédup, stock/prix ≥ 0, id stable, plafond 60. */
export function normalizeVariants(list: readonly ProductVariant[]): ProductVariant[] {
  const seen = new Set<string>();
  const out: ProductVariant[] = [];
  for (const v of list) {
    const label = v.label.trim();
    if (!label) continue;
    const key = label.toLocaleLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({
      id: v.id && /^[\w-]{1,40}$/.test(v.id) ? v.id : randomUUID(),
      label: label.slice(0, 80),
      sku: v.sku?.trim() ? v.sku.trim().slice(0, 40) : null,
      priceAmount:
        v.priceAmount === null || v.priceAmount === undefined
          ? null
          : Math.max(0, Math.round(v.priceAmount)),
      stock: Math.max(0, Math.round(v.stock)),
    });
    if (out.length >= 60) break;
  }
  return out;
}

export class Product extends AggregateRoot {
  private constructor(
    id: UniqueId,
    private readonly shopId: string,
    private _slug: Slug,
    private _name: string,
    private _description: string,
    private _category: string,
    private _price: Money,
    private _compareAtPrice: Money | null,
    private _stock: number,
    private _images: string[],
    private _attributes: DynamicAttributes,
    private _variants: ProductVariant[],
    private _status: ProductStatus,
    private readonly _createdAt: Date,
    private _updatedAt: Date,
  ) {
    super(id);
  }

  static create(props: CreateProps): Result<Product> {
    const checks = Result.combine([
      Guard.againstEmpty(props.shopId, 'shopId'),
      Guard.againstEmpty(props.name, 'name'),
      Guard.againstEmpty(props.category, 'category'),
      Guard.atLeast(props.stock ?? 0, 0, 'stock'),
    ]);
    if (checks.isErr) return Result.err(String(checks.getError()));

    const slug = Slug.fromString(props.name);
    if (slug.isErr) return Result.err(slug.getError());

    const now = new Date();
    const variants = normalizeVariants(props.variants ?? []);
    const stock =
      variants.length > 0
        ? variants.reduce((s, v) => s + v.stock, 0)
        : (props.stock ?? 0);
    const product = new Product(
      UniqueId.create(),
      props.shopId,
      slug.unwrap(),
      props.name.trim(),
      props.description?.trim() ?? '',
      props.category.trim(),
      props.price,
      props.compareAtPrice ?? null,
      stock,
      props.images ?? [],
      props.attributes ?? {},
      variants,
      'draft',
      now,
      now,
    );
    product.addDomainEvent(new ProductCreated(product.shopId, product.toSnapshot()));
    return Result.ok(product);
  }

  /** Reconstruit un agrégat depuis un état persisté, sans émettre d'événement. */
  static restore(snap: ProductSnapshot): Product {
    const price = Money.create(snap.price.amount, snap.price.currency).unwrap();
    const compareAt = snap.compareAtPrice
      ? Money.create(snap.compareAtPrice.amount, snap.compareAtPrice.currency).unwrap()
      : null;
    const slug = Slug.fromString(snap.slug).unwrap();
    return new Product(
      UniqueId.create(snap.id),
      snap.shopId,
      slug,
      snap.name,
      snap.description,
      snap.category,
      price,
      compareAt,
      snap.stock,
      [...snap.images],
      { ...snap.attributes },
      (snap.variants ?? []).map((v) => ({ ...v })),
      snap.status,
      new Date(snap.createdAt),
      new Date(snap.updatedAt),
    );
  }

  publish(): Result<void> {
    if (this._status === 'published') return Result.ok(undefined);
    if (this._images.length === 0) {
      return Result.err('Au moins une image est requise pour publier');
    }
    this._status = 'published';
    this.touch();
    this.addDomainEvent(new ProductPublished(this.shopId, this.toSnapshot()));
    return Result.ok(undefined);
  }

  unpublish(): Result<void> {
    if (this._status !== 'published') return Result.ok(undefined);
    this._status = 'draft';
    this.touch();
    this.addDomainEvent(new ProductUnpublished(this.shopId, this.toSnapshot()));
    return Result.ok(undefined);
  }

  update(patch: {
    name?: string;
    description?: string;
    category?: string;
    price?: Money;
    compareAtPrice?: Money | null;
    stock?: number;
    images?: string[];
    attributes?: DynamicAttributes;
    variants?: ProductVariant[];
  }): Result<void> {
    if (patch.name !== undefined) {
      if (patch.name.trim().length < 2) return Result.err('Nom trop court');
      this._name = patch.name.trim();
    }
    if (patch.description !== undefined) this._description = patch.description.trim();
    if (patch.category !== undefined) {
      if (patch.category.trim().length === 0) return Result.err('Catégorie requise');
      this._category = patch.category.trim();
    }
    if (patch.price !== undefined) this._price = patch.price;
    if (patch.compareAtPrice !== undefined) this._compareAtPrice = patch.compareAtPrice;
    if (patch.variants !== undefined) {
      this._variants = normalizeVariants(patch.variants);
    }
    if (patch.stock !== undefined && this._variants.length === 0) {
      if (!Number.isInteger(patch.stock) || patch.stock < 0) {
        return Result.err('Stock invalide');
      }
      this._stock = patch.stock;
    }
    // Avec des déclinaisons, le stock produit = somme des stocks de déclinaison.
    if (this._variants.length > 0) {
      this._stock = this._variants.reduce((s, v) => s + v.stock, 0);
    }
    if (patch.images !== undefined) this._images = [...patch.images];
    if (patch.attributes !== undefined) this._attributes = { ...patch.attributes };

    // Un produit publié dont on retire toutes les images repasse en brouillon.
    if (this._status === 'published' && this._images.length === 0) {
      this._status = 'draft';
    }
    this.touch();
    this.addDomainEvent(new ProductUpdated(this.shopId, this.toSnapshot()));
    return Result.ok(undefined);
  }

  private touch(): void {
    this._updatedAt = new Date();
  }

  get slug(): string {
    return this._slug.value;
  }

  get status(): ProductStatus {
    return this._status;
  }

  get variants(): ProductVariant[] {
    return this._variants.map((v) => ({ ...v }));
  }

  get hasVariants(): boolean {
    return this._variants.length > 0;
  }

  /** Retire (ou ajoute, delta > 0) du stock au produit ou à une déclinaison. */
  adjustStock(delta: number, variantId?: string | null): Result<void> {
    if (variantId) {
      const v = this._variants.find((x) => x.id === variantId);
      if (!v) return Result.err('Déclinaison introuvable');
      v.stock = Math.max(0, v.stock + delta);
      this._stock = this._variants.reduce((s, x) => s + x.stock, 0);
    } else {
      this._stock = Math.max(0, this._stock + delta);
    }
    this.touch();
    this.addDomainEvent(new ProductUpdated(this.shopId, this.toSnapshot()));
    return Result.ok(undefined);
  }

  belongsTo(shopId: string): boolean {
    return this.shopId === shopId;
  }

  toSnapshot(): ProductSnapshot {
    return {
      id: this.id.value,
      shopId: this.shopId,
      slug: this._slug.value,
      name: this._name,
      description: this._description,
      category: this._category,
      price: this._price.toJSON(),
      compareAtPrice: this._compareAtPrice ? this._compareAtPrice.toJSON() : null,
      stock: this._stock,
      images: [...this._images],
      attributes: { ...this._attributes },
      variants: this._variants.map((v) => ({ ...v })),
      status: this._status,
      createdAt: this._createdAt.toISOString(),
      updatedAt: this._updatedAt.toISOString(),
    };
  }
}

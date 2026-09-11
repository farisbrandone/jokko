import { Entity, Index, PrimaryKey, Property, Unique } from '@mikro-orm/core';
import type { Vertical } from '@jokko/contracts';
import type { ShopStatus, ShopVerification, ThemePreset } from '../../domain/shop.aggregate';

const EMPTY_VERIFICATION: ShopVerification = {
  status: 'none',
  legalName: null,
  registryNumber: null,
  note: null,
  proofImageUrl: null,
  submittedAt: null,
  decidedAt: null,
  decisionNote: null,
};

@Entity({ tableName: 'shops' })
export class ShopEntity {
  @PrimaryKey({ type: 'uuid' })
  id!: string;

  @Unique()
  @Property({ type: 'string', length: 60 })
  slug!: string;

  @Property({ type: 'string', length: 80 })
  name!: string;

  @Property({ type: 'json' })
  verticals: Vertical[] = [];

  @Property({ type: 'string', length: 20, nullable: true })
  whatsapp: string | null = null;

  @Property({ type: 'string', length: 20, fieldName: 'theme_preset' })
  themePreset: ThemePreset = 'grid';

  @Property({ type: 'string', length: 7, fieldName: 'brand_color', nullable: true })
  brandColor: string | null = null;

  @Property({ type: 'string', length: 10 })
  locale = 'fr';

  @Property({ type: 'string', length: 3 })
  currency = 'XOF';

  @Index()
  @Property({ type: 'string', length: 255, fieldName: 'custom_domain', nullable: true })
  customDomain: string | null = null;

  @Property({ type: 'datetime', fieldName: 'custom_domain_verified_at', nullable: true })
  customDomainVerifiedAt: Date | null = null;

  @Property({ type: 'string', length: 64, fieldName: 'custom_domain_token', nullable: true })
  customDomainToken: string | null = null;

  @Property({ type: 'boolean' })
  listed = false;

  @Property({ type: 'string', length: 140, nullable: true })
  tagline: string | null = null;

  @Property({ type: 'json' })
  categories: string[] = [];

  @Property({ type: 'string', length: 80, fieldName: 'hero_title', nullable: true })
  heroTitle: string | null = null;

  @Property({ type: 'string', length: 160, fieldName: 'hero_subtitle', nullable: true })
  heroSubtitle: string | null = null;

  @Property({ type: 'string', length: 600, fieldName: 'hero_image_url', nullable: true })
  heroImageUrl: string | null = null;

  @Property({ type: 'string', length: 7, fieldName: 'accent_color', nullable: true })
  accentColor: string | null = null;

  @Property({ type: 'string', length: 160, nullable: true })
  announcement: string | null = null;

  @Property({ type: 'json', fieldName: 'delivery_zones' })
  deliveryZones: { id?: string; label: string; fee: number }[] = [];

  @Property({ type: 'integer', fieldName: 'low_stock_threshold' })
  lowStockThreshold = 3;

  @Property({ type: 'json' })
  verification: ShopVerification = { ...EMPTY_VERIFICATION };

  @Property({ type: 'string', length: 20 })
  status: ShopStatus = 'active';

  @Property({ type: 'datetime', fieldName: 'created_at' })
  createdAt: Date = new Date();

  @Property({ type: 'datetime', fieldName: 'updated_at', onUpdate: () => new Date() })
  updatedAt: Date = new Date();
}

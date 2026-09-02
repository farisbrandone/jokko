import { Entity, Index, PrimaryKey, Property, Unique } from '@mikro-orm/core';
import type { Vertical } from '@jokko/contracts';
import type { ShopStatus, ThemePreset } from '../../domain/shop.aggregate';

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

  @Property({ type: 'string', length: 20 })
  status: ShopStatus = 'active';

  @Property({ type: 'datetime', fieldName: 'created_at' })
  createdAt: Date = new Date();

  @Property({ type: 'datetime', fieldName: 'updated_at', onUpdate: () => new Date() })
  updatedAt: Date = new Date();
}

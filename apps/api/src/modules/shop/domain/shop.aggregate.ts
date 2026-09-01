import { AggregateRoot, Guard, Result, UniqueId } from '@jokko/domain-kernel';
import type { Vertical } from '@jokko/contracts';
import { Slug } from '../../catalog/domain/value-objects/slug';
import { ShopCreated } from './shop.events';

export type ThemePreset = 'grid' | 'editorial' | 'single' | 'dense';
export type ShopStatus = 'active' | 'suspended';

const BRAND_COLOR_RE = /^#[0-9a-f]{6}$/i;

export interface ShopSnapshot {
  id: string;
  slug: string;
  name: string;
  verticals: Vertical[];
  whatsapp: string | null;
  themePreset: ThemePreset;
  brandColor: string | null;
  locale: string;
  currency: string;
  customDomain: string | null;
  status: ShopStatus;
  createdAt: string;
  updatedAt: string;
}

interface CreateShopProps {
  name: string;
  slug?: string;
  verticals: Vertical[];
  whatsapp?: string;
  themePreset?: ThemePreset;
  brandColor?: string | null;
  ownerUserId: string;
}

export interface UpdateShopProfileProps {
  name?: string;
  whatsapp?: string | null;
  themePreset?: ThemePreset;
  brandColor?: string | null;
}

export class Shop extends AggregateRoot {
  private constructor(
    id: UniqueId,
    private _slug: Slug,
    private _name: string,
    private _verticals: Vertical[],
    private _whatsapp: string | null,
    private _themePreset: ThemePreset,
    private _brandColor: string | null,
    private _locale: string,
    private _currency: string,
    private _customDomain: string | null,
    private _status: ShopStatus,
    private readonly _createdAt: Date,
    private _updatedAt: Date,
  ) {
    super(id);
  }

  static create(props: CreateShopProps): Result<Shop> {
    const checks = Result.combine([
      Guard.againstEmpty(props.name, 'name'),
      Guard.againstEmpty(props.ownerUserId, 'ownerUserId'),
    ]);
    if (checks.isErr) return Result.err(String(checks.getError()));
    if (props.verticals.length === 0) return Result.err('Au moins une verticale est requise');

    const slug = Slug.fromString(props.slug?.trim() || props.name);
    if (slug.isErr) return Result.err(slug.getError());

    const brandColor = normalizeBrandColor(props.brandColor);
    if (brandColor.isErr) return Result.err(brandColor.getError());

    const now = new Date();
    const shop = new Shop(
      UniqueId.create(),
      slug.unwrap(),
      props.name.trim(),
      [...props.verticals],
      props.whatsapp?.trim() ?? null,
      props.themePreset ?? 'grid',
      brandColor.unwrap(),
      'fr',
      'XOF',
      null,
      'active',
      now,
      now,
    );
    shop.addDomainEvent(new ShopCreated(shop.id.value, shop._slug.value, props.ownerUserId));
    return Result.ok(shop);
  }

  static restore(snap: ShopSnapshot): Shop {
    return new Shop(
      UniqueId.create(snap.id),
      Slug.fromString(snap.slug).unwrap(),
      snap.name,
      [...snap.verticals],
      snap.whatsapp,
      snap.themePreset,
      snap.brandColor,
      snap.locale,
      snap.currency,
      snap.customDomain,
      snap.status,
      new Date(snap.createdAt),
      new Date(snap.updatedAt),
    );
  }

  get slug(): string {
    return this._slug.value;
  }

  /** Édition du profil par un membre autorisé (nom, WhatsApp, thème, couleur). */
  updateProfile(patch: UpdateShopProfileProps): Result<void> {
    if (patch.name !== undefined) {
      const name = patch.name.trim();
      if (name.length < 2) return Result.err('Le nom de la boutique est trop court');
      this._name = name;
    }
    if (patch.whatsapp !== undefined) {
      this._whatsapp = patch.whatsapp?.trim() || null;
    }
    if (patch.themePreset !== undefined) {
      this._themePreset = patch.themePreset;
    }
    if (patch.brandColor !== undefined) {
      const color = normalizeBrandColor(patch.brandColor);
      if (color.isErr) return Result.err(color.getError());
      this._brandColor = color.unwrap();
    }
    this._updatedAt = new Date();
    return Result.ok(undefined);
  }

  toSnapshot(): ShopSnapshot {
    return {
      id: this.id.value,
      slug: this._slug.value,
      name: this._name,
      verticals: [...this._verticals],
      whatsapp: this._whatsapp,
      themePreset: this._themePreset,
      brandColor: this._brandColor,
      locale: this._locale,
      currency: this._currency,
      customDomain: this._customDomain,
      status: this._status,
      createdAt: this._createdAt.toISOString(),
      updatedAt: this._updatedAt.toISOString(),
    };
  }
}

function normalizeBrandColor(value: string | null | undefined): Result<string | null> {
  if (value === undefined || value === null || value === '') return Result.ok(null);
  const hex = value.trim().toLowerCase();
  if (!BRAND_COLOR_RE.test(hex)) return Result.err('Couleur de marque invalide (#rrggbb attendu)');
  return Result.ok(hex);
}

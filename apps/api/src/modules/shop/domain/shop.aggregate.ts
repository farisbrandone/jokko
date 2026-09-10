import { randomUUID } from 'node:crypto';
import { AggregateRoot, Guard, Result, UniqueId } from '@jokko/domain-kernel';
import type { DeliveryZone, Vertical } from '@jokko/contracts';
import { Slug } from '../../catalog/domain/value-objects/slug';
import { ShopCreated } from './shop.events';

export type ThemePreset = 'grid' | 'editorial' | 'single' | 'dense';
export type ShopStatus = 'active' | 'suspended';

const BRAND_COLOR_RE = /^#[0-9a-f]{6}$/i;
// Nom d'hôte : 4–253 car., labels 1–63, pas de tiret en bordure, TLD alphabétique ≥ 2.
const HOSTNAME_RE = /^(?=.{4,253}$)(?!-)([a-z0-9-]{1,63}(?<!-)\.)+[a-z]{2,63}$/;

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
  customDomainVerifiedAt: string | null;
  customDomainToken: string | null;
  listed: boolean;
  tagline: string | null;
  categories: string[];
  heroTitle: string | null;
  heroSubtitle: string | null;
  heroImageUrl: string | null;
  accentColor: string | null;
  announcement: string | null;
  deliveryZones: DeliveryZone[];
  lowStockThreshold: number;
  status: ShopStatus;
  createdAt: string;
  updatedAt: string;
}

export interface ShopAppearance {
  heroTitle: string | null;
  heroSubtitle: string | null;
  heroImageUrl: string | null;
  accentColor: string | null;
  announcement: string | null;
}

const EMPTY_APPEARANCE: ShopAppearance = {
  heroTitle: null,
  heroSubtitle: null,
  heroImageUrl: null,
  accentColor: null,
  announcement: null,
};

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
  listed?: boolean;
  tagline?: string | null;
  categories?: string[];
  heroTitle?: string | null;
  heroSubtitle?: string | null;
  heroImageUrl?: string | null;
  accentColor?: string | null;
  announcement?: string | null;
  deliveryZones?: DeliveryZone[];
  lowStockThreshold?: number;
}

/** Nettoyage des zones de livraison : libellé trimé non vide, dédup par libellé, frais ≥ 0, id stable. */
export function normalizeDeliveryZones(list: readonly DeliveryZone[]): DeliveryZone[] {
  const seen = new Set<string>();
  const out: DeliveryZone[] = [];
  for (const z of list) {
    const label = z.label.trim();
    if (!label) continue;
    const key = label.toLocaleLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({
      id: z.id && /^[\w-]{1,40}$/.test(z.id) ? z.id : randomUUID(),
      label: label.slice(0, 60),
      fee: Math.max(0, Math.round(z.fee)),
    });
    if (out.length >= 40) break;
  }
  return out;
}

/** Nettoyage : trim, retrait des vides, déduplication insensible à la casse, plafond 50. */
export function normalizeCategories(list: readonly string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of list) {
    const value = raw.trim();
    if (!value) continue;
    const key = value.toLocaleLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(value.slice(0, 40));
    if (out.length >= 50) break;
  }
  return out;
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
    private _customDomainVerifiedAt: Date | null,
    private _customDomainToken: string | null,
    private _listed: boolean,
    private _tagline: string | null,
    private _categories: string[],
    private _appearance: ShopAppearance,
    private _deliveryZones: DeliveryZone[],
    private _lowStockThreshold: number,
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
      null,
      null,
      false,
      null,
      [],
      { ...EMPTY_APPEARANCE },
      [],
      3,
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
      snap.customDomainVerifiedAt ? new Date(snap.customDomainVerifiedAt) : null,
      snap.customDomainToken,
      snap.listed,
      snap.tagline,
      [...(snap.categories ?? [])],
      {
        heroTitle: snap.heroTitle ?? null,
        heroSubtitle: snap.heroSubtitle ?? null,
        heroImageUrl: snap.heroImageUrl ?? null,
        accentColor: snap.accentColor ?? null,
        announcement: snap.announcement ?? null,
      },
      (snap.deliveryZones ?? []).map((z) => ({ ...z })),
      snap.lowStockThreshold ?? 3,
      snap.status,
      new Date(snap.createdAt),
      new Date(snap.updatedAt),
    );
  }

  get slug(): string {
    return this._slug.value;
  }

  get deliveryZones(): DeliveryZone[] {
    return this._deliveryZones.map((z) => ({ ...z }));
  }

  get currency(): string {
    return this._currency;
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
    if (patch.listed !== undefined) {
      this._listed = patch.listed;
    }
    if (patch.tagline !== undefined) {
      this._tagline = patch.tagline?.trim() || null;
    }
    if (patch.categories !== undefined) {
      this._categories = normalizeCategories(patch.categories);
    }
    if (patch.heroTitle !== undefined) {
      this._appearance.heroTitle = patch.heroTitle?.trim() || null;
    }
    if (patch.heroSubtitle !== undefined) {
      this._appearance.heroSubtitle = patch.heroSubtitle?.trim() || null;
    }
    if (patch.heroImageUrl !== undefined) {
      this._appearance.heroImageUrl = patch.heroImageUrl?.trim() || null;
    }
    if (patch.announcement !== undefined) {
      this._appearance.announcement = patch.announcement?.trim() || null;
    }
    if (patch.accentColor !== undefined) {
      const color = normalizeBrandColor(patch.accentColor);
      if (color.isErr) return Result.err(color.getError());
      this._appearance.accentColor = color.unwrap();
    }
    if (patch.deliveryZones !== undefined) {
      this._deliveryZones = normalizeDeliveryZones(patch.deliveryZones);
    }
    if (patch.lowStockThreshold !== undefined) {
      this._lowStockThreshold = Math.max(0, Math.min(999, Math.round(patch.lowStockThreshold)));
    }
    this._updatedAt = new Date();
    return Result.ok(undefined);
  }

  get customDomain(): string | null {
    return this._customDomain;
  }

  get customDomainToken(): string | null {
    return this._customDomainToken;
  }

  isCustomDomainVerified(): boolean {
    return this._customDomainVerifiedAt != null;
  }

  /** Enregistre un domaine personnalisé à vérifier (état : non vérifié). */
  requestCustomDomain(domainRaw: string, token: string): Result<void> {
    const domain = domainRaw.trim().toLowerCase().replace(/\.$/, '');
    if (!HOSTNAME_RE.test(domain)) {
      return Result.err('Nom de domaine invalide (ex. boutique.exemple.com)');
    }
    this._customDomain = domain;
    this._customDomainToken = token;
    this._customDomainVerifiedAt = null;
    this._updatedAt = new Date();
    return Result.ok(undefined);
  }

  /** Marque le domaine comme vérifié (après contrôle DNS côté application). */
  confirmCustomDomain(now: Date): Result<void> {
    if (!this._customDomain) return Result.err('Aucun domaine personnalisé en attente');
    this._customDomainVerifiedAt = now;
    this._customDomainToken = null;
    this._updatedAt = new Date();
    return Result.ok(undefined);
  }

  clearCustomDomain(): void {
    this._customDomain = null;
    this._customDomainVerifiedAt = null;
    this._customDomainToken = null;
    this._updatedAt = new Date();
  }

  suspend(): void {
    if (this._status === 'suspended') return;
    this._status = 'suspended';
    this._updatedAt = new Date();
  }

  activate(): void {
    if (this._status === 'active') return;
    this._status = 'active';
    this._updatedAt = new Date();
  }

  get status(): ShopStatus {
    return this._status;
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
      customDomainVerifiedAt: this._customDomainVerifiedAt
        ? this._customDomainVerifiedAt.toISOString()
        : null,
      customDomainToken: this._customDomainToken,
      listed: this._listed,
      tagline: this._tagline,
      categories: [...this._categories],
      heroTitle: this._appearance.heroTitle,
      heroSubtitle: this._appearance.heroSubtitle,
      heroImageUrl: this._appearance.heroImageUrl,
      accentColor: this._appearance.accentColor,
      announcement: this._appearance.announcement,
      deliveryZones: this._deliveryZones.map((z) => ({ ...z })),
      lowStockThreshold: this._lowStockThreshold,
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

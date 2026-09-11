import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import type {
  AdminReportList,
  AdminShopDetail,
  AdminShopList,
  AdminShopVerificationList,
  DecideShopVerificationInput,
  ImpersonationGrant,
  PlatformOverview,
  ResolveReportInput,
  ShopVerification,
} from '@jokko/contracts';
import { ProductIndex } from '../../search/infrastructure/product-index';
import { TokenService } from '../../identity/infrastructure/security/token.service';
import { ADMIN_DB, type AdminDb } from '../../../shared/admin-db/admin-db';

/** Usurpation support : jeton d'accès court, sans refresh. */
const IMPERSONATION_TTL_SEC = 900;

@Injectable()
export class AdminService {
  constructor(
    @Inject(ADMIN_DB) private readonly db: AdminDb,
    private readonly index: ProductIndex,
    private readonly tokens: TokenService,
  ) {}

  async overview(): Promise<PlatformOverview> {
    const { rows } = await this.db.query<{
      shops_total: string;
      shops_active: string;
      shops_suspended: string;
      users: string;
      products_total: string;
      products_published: string;
      conv_open: string;
      events_7d: string;
      new_shops_7d: string;
      pending_reports: string;
      active_subscriptions: string;
    }>(`
      select
        (select count(*) from shops)                                   shops_total,
        (select count(*) from shops where status = 'active')           shops_active,
        (select count(*) from shops where status = 'suspended')        shops_suspended,
        (select count(*) from users)                                   users,
        (select count(*) from catalog_products)                        products_total,
        (select count(*) from catalog_products where status='published') products_published,
        (select count(*) from conversations where status = 'open')     conv_open,
        (select count(*) from analytics_events where created_at >= now() - interval '7 days') events_7d,
        (select count(*) from shops where created_at >= now() - interval '7 days')            new_shops_7d,
        (select count(*) from content_reports where status = 'pending') pending_reports,
        (select count(*) from subscriptions
           where status in ('active','trialing') and current_period_end > now())             active_subscriptions
    `);
    const r = rows[0];
    const n = (v: string) => Number(v);
    return {
      shops: { total: n(r.shops_total), active: n(r.shops_active), suspended: n(r.shops_suspended) },
      users: n(r.users),
      products: { total: n(r.products_total), published: n(r.products_published) },
      conversationsOpen: n(r.conv_open),
      eventsLast7d: n(r.events_7d),
      newShops7d: n(r.new_shops_7d),
      pendingReports: n(r.pending_reports),
      activeSubscriptions: n(r.active_subscriptions),
    };
  }

  async listShops(q: string | undefined, page: number, pageSize: number): Promise<AdminShopList> {
    const where = q ? `where s.slug ilike $1 or s.name ilike $1` : '';
    const params: unknown[] = q ? [`%${q}%`] : [];
    const off = (page - 1) * pageSize;

    const total = await this.db.query<{ c: string }>(
      `select count(*)::int c from shops s ${where}`,
      params,
    );
    const { rows } = await this.db.query(
      `select s.id, s.slug, s.name, s.status, s.created_at,
              (select u.email from shop_memberships m join users u on u.id = m.user_id
                 where m.shop_id = s.id and m.role = 'owner' limit 1) owner_email,
              (select count(*) from catalog_products p where p.shop_id = s.id) products,
              (select count(*) from conversations c where c.shop_id = s.id) conversations
         from shops s ${where}
         order by s.created_at desc
         limit ${pageSize} offset ${off}`,
      params,
    );

    return {
      items: rows.map((r) => ({
        id: r.id,
        slug: r.slug,
        name: r.name,
        status: r.status,
        ownerEmail: r.owner_email ?? null,
        products: Number(r.products),
        conversations: Number(r.conversations),
        createdAt: new Date(r.created_at).toISOString(),
      })),
      total: Number(total.rows[0].c),
      page,
      pageSize,
    };
  }

  async setShopStatus(shopId: string, status: 'active' | 'suspended'): Promise<void> {
    const res = await this.db.query(
      `update shops set status = $2, updated_at = now() where id = $1`,
      [shopId, status],
    );
    if (res.rowCount === 0) throw new NotFoundException('Boutique introuvable');
  }

  async shopDetail(id: string): Promise<AdminShopDetail> {
    const { rows } = await this.db.query<{
      id: string;
      slug: string;
      name: string;
      status: 'active' | 'suspended';
      created_at: Date;
      owner_id: string | null;
      owner_email: string | null;
      owner_name: string | null;
    }>(
      `select s.id, s.slug, s.name, s.status, s.created_at,
              o.owner_id, u.email owner_email, u.name owner_name
         from shops s
         left join lateral (
           select m.user_id as owner_id from shop_memberships m
            where m.shop_id = s.id and m.role = 'owner' limit 1
         ) o on true
         left join users u on u.id = o.owner_id
        where s.id = $1`,
      [id],
    );
    const r = rows[0];
    if (!r) throw new NotFoundException('Boutique introuvable');
    return {
      id: r.id,
      slug: r.slug,
      name: r.name,
      status: r.status,
      createdAt: new Date(r.created_at).toISOString(),
      owner: r.owner_id
        ? { id: r.owner_id, email: r.owner_email ?? '', name: r.owner_name ?? '' }
        : null,
    };
  }

  /** Émet un jeton court usurpant `targetUserId`, journalisé. */
  async impersonate(adminUserId: string, targetUserId: string): Promise<ImpersonationGrant> {
    const { rows } = await this.db.query<{ id: string; email: string; name: string }>(
      `select id, email, name from users where id = $1`,
      [targetUserId],
    );
    const target = rows[0];
    if (!target) throw new NotFoundException('Utilisateur introuvable');

    const token = await this.tokens.signAccess(
      { sub: target.id, email: target.email, act: adminUserId },
      { ttlSec: IMPERSONATION_TTL_SEC },
    );
    await this.db.query(
      `insert into impersonation_events (admin_user_id, target_user_id) values ($1, $2)`,
      [adminUserId, targetUserId],
    );

    return {
      token,
      expiresAt: new Date(Date.now() + IMPERSONATION_TTL_SEC * 1000).toISOString(),
      target: { id: target.id, email: target.email, name: target.name },
    };
  }

  async listReports(
    status: string | undefined,
    page: number,
    pageSize: number,
  ): Promise<AdminReportList> {
    const where = status ? `where r.status = $1` : '';
    const params: unknown[] = status ? [status] : [];
    const off = (page - 1) * pageSize;

    const total = await this.db.query<{ c: string }>(
      `select count(*)::int c from content_reports r ${where}`,
      params,
    );
    const { rows } = await this.db.query(
      `select r.id, r.shop_id, s.name shop_name, s.slug shop_slug,
              r.target_type, r.target_id, r.reason, r.note, r.status,
              r.created_at, r.updated_at,
              case r.target_type
                   when 'product' then (select p.name from catalog_products p where p.id = r.target_id)
                   when 'conversation' then (
                     select 'Conversation — ' || c.buyer_name from conversations c where c.id = r.target_id
                   )
                   else s.name end target_label
         from content_reports r
         join shops s on s.id = r.shop_id
         ${where}
         order by (r.status = 'pending') desc, r.created_at desc
         limit ${pageSize} offset ${off}`,
      params,
    );

    return {
      items: rows.map((r) => ({
        id: r.id,
        shopId: r.shop_id,
        shopName: r.shop_name,
        shopSlug: r.shop_slug,
        targetType: r.target_type,
        targetId: r.target_id,
        targetLabel: r.target_label ?? null,
        reason: r.reason,
        note: r.note ?? null,
        status: r.status,
        createdAt: new Date(r.created_at).toISOString(),
        updatedAt: new Date(r.updated_at).toISOString(),
      })),
      total: Number(total.rows[0].c),
      page,
      pageSize,
    };
  }

  async resolveReport(
    id: string,
    action: ResolveReportInput['action'],
  ): Promise<{ status: 'actioned' | 'dismissed' }> {
    const found = await this.db.query<{
      shop_id: string;
      target_type: 'product' | 'shop' | 'conversation';
      target_id: string;
      status: string;
    }>(`select shop_id, target_type, target_id, status from content_reports where id = $1`, [id]);
    const rep = found.rows[0];
    if (!rep) throw new NotFoundException('Signalement introuvable');
    if (rep.status !== 'pending') {
      throw new ConflictException('Signalement déjà traité');
    }

    if (action === 'dismiss') {
      await this.db.query(
        `update content_reports set status = 'dismissed', updated_at = now() where id = $1`,
        [id],
      );
      return { status: 'dismissed' };
    }

    // takedown
    if (rep.target_type === 'product') {
      await this.db.query(
        `update catalog_products set status = 'archived', updated_at = now() where id = $1`,
        [rep.target_id],
      );
      try {
        await this.index.remove(rep.target_id);
      } catch {
        /* réindexation best-effort — l'archivage en base fait foi */
      }
    } else if (rep.target_type === 'conversation') {
      await this.db.query(`update conversations set status = 'closed' where id = $1`, [
        rep.target_id,
      ]);
    } else {
      await this.db.query(
        `update shops set status = 'suspended', updated_at = now() where id = $1`,
        [rep.shop_id],
      );
    }

    await this.db.query(
      `update content_reports set status = 'actioned', updated_at = now() where id = $1`,
      [id],
    );
    // Clôt les autres signalements en attente sur la même cible.
    await this.db.query(
      `update content_reports set status = 'dismissed', updated_at = now()
         where shop_id = $1 and target_type = $2 and target_id = $3
           and status = 'pending' and id <> $4`,
      [rep.shop_id, rep.target_type, rep.target_id, id],
    );
    return { status: 'actioned' };
  }

  async listShopVerifications(
    status: string | undefined,
    page: number,
    pageSize: number,
  ): Promise<AdminShopVerificationList> {
    const where = status ? `where s.verification->>'status' = $1` : `where s.verification->>'status' <> 'none'`;
    const params: unknown[] = status ? [status] : [];
    const off = (page - 1) * pageSize;

    const total = await this.db.query<{ c: string }>(
      `select count(*)::int c from shops s ${where}`,
      params,
    );
    const { rows } = await this.db.query(
      `select s.id shop_id, s.name shop_name, s.slug shop_slug, s.verification
         from shops s
         ${where}
         order by (s.verification->>'status' = 'pending') desc, s.verification->>'submittedAt' desc
         limit ${pageSize} offset ${off}`,
      params,
    );

    return {
      items: rows.map((r) => {
        const v = r.verification as ShopVerification;
        return { shopId: r.shop_id, shopName: r.shop_name, shopSlug: r.shop_slug, ...v };
      }),
      total: Number(total.rows[0].c),
      page,
      pageSize,
    };
  }

  async decideShopVerification(
    shopId: string,
    input: DecideShopVerificationInput,
  ): Promise<ShopVerification> {
    const found = await this.db.query<{ verification: ShopVerification }>(
      `select verification from shops where id = $1`,
      [shopId],
    );
    const row = found.rows[0];
    if (!row) throw new NotFoundException('Boutique introuvable');
    if (row.verification.status !== 'pending') {
      throw new ConflictException('Aucune demande en attente pour cette boutique');
    }
    const next: ShopVerification = {
      ...row.verification,
      status: input.action === 'approve' ? 'verified' : 'rejected',
      decidedAt: new Date().toISOString(),
      decisionNote: input.note?.trim() || null,
    };
    await this.db.query(
      `update shops set verification = $2::jsonb, updated_at = now() where id = $1`,
      [shopId, JSON.stringify(next)],
    );
    return next;
  }
}

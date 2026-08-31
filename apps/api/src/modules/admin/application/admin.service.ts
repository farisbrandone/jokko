import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { AdminShopList, PlatformOverview } from '@jokko/contracts';
import { ADMIN_DB, type AdminDb } from '../infrastructure/admin-db';

@Injectable()
export class AdminService {
  constructor(@Inject(ADMIN_DB) private readonly db: AdminDb) {}

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
        (select count(*) from shops where created_at >= now() - interval '7 days')            new_shops_7d
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
}

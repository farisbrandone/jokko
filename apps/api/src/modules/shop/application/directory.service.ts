import { Inject, Injectable } from '@nestjs/common';
import type { DirectoryQuery, DirectoryResult, Vertical } from '@jokko/contracts';
import { ADMIN_DB, type AdminDb } from '../../../shared/admin-db/admin-db';

const PAGE_SIZE = 24;

/**
 * Annuaire public des boutiques ayant explicitement choisi d'y figurer
 * (`shops.listed = true`). Lecture transverse aux boutiques → pool propriétaire.
 */
@Injectable()
export class DirectoryService {
  constructor(@Inject(ADMIN_DB) private readonly db: AdminDb) {}

  async list(q: DirectoryQuery): Promise<DirectoryResult> {
    const params: unknown[] = [];
    const where: string[] = ["s.listed = true", "s.status = 'active'"];

    if (q.q) {
      params.push(`%${q.q}%`);
      where.push(`(s.name ilike $${params.length} or coalesce(s.tagline, '') ilike $${params.length})`);
    }
    if (q.vertical) {
      params.push(JSON.stringify([q.vertical]));
      where.push(`s.verticals @> $${params.length}::jsonb`);
    }
    const whereSql = where.join(' and ');
    const offset = (q.page - 1) * PAGE_SIZE;

    const total = (
      await this.db.query<{ n: number }>(
        `select count(*)::int as n from shops s where ${whereSql}`,
        params,
      )
    ).rows[0].n;

    const rows = (
      await this.db.query(
        `select s.slug, s.name, s.tagline, s.verticals, s.brand_color as "brandColor",
                (select count(*) from catalog_products p
                   where p.shop_id = s.id and p.status = 'published')::int as products
           from shops s
          where ${whereSql}
          order by products desc, s.created_at desc
          limit ${PAGE_SIZE} offset ${offset}`,
        params,
      )
    ).rows;

    return {
      items: rows.map((r) => ({
        slug: r.slug as string,
        name: r.name as string,
        tagline: (r.tagline as string | null) ?? null,
        verticals: ((r.verticals as Vertical[]) ?? []),
        brandColor: (r.brandColor as string | null) ?? null,
        products: r.products as number,
      })),
      total,
      page: q.page,
      pageSize: PAGE_SIZE,
    };
  }
}

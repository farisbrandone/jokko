import { Injectable } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import type { AnalyticsSummary, IngestEventsInput } from '@jokko/contracts';
import { TenantContext } from '../../../shared/tenant/tenant-context';
import { AnalyticsEventEntity } from '../infrastructure/analytics-event.entity';

@Injectable()
export class AnalyticsService {
  constructor(
    private readonly em: EntityManager,
    private readonly tenant: TenantContext,
  ) {}

  private withTenant<T>(fn: (em: EntityManager) => Promise<T>): Promise<T> {
    const shopId = this.tenant.getShopId();
    return this.em.transactional(async (em) => {
      await em.execute("select set_config('app.current_shop_id', ?, true)", [shopId]);
      em.setFilterParams('tenant', { shopId });
      return fn(em);
    });
  }

  async ingest(input: IngestEventsInput): Promise<void> {
    const shopId = this.tenant.getShopId();
    await this.withTenant(async (em) => {
      for (const ev of input.events) {
        const row = new AnalyticsEventEntity();
        row.shopId = shopId;
        row.name = ev.name;
        row.props = ev.props;
        row.sessionId = ev.sessionId ?? null;
        row.createdAt = ev.ts ? new Date(ev.ts) : new Date();
        em.persist(row);
      }
    });
  }

  async summary(days: number): Promise<AnalyticsSummary> {
    const shopId = this.tenant.getShopId();
    return this.withTenant(async (em) => {
      const q = <T = Record<string, unknown>>(sql: string, params: unknown[]): Promise<T[]> =>
        em.execute(sql, [shopId, days, ...params]) as Promise<T[]>;

      const window = `created_at >= now() - make_interval(days => ?::int)`;

      // Séquentiel : toutes ces requêtes partagent la connexion de la transaction.
      const counts = await q<{ name: string; c: number }>(
        `select name, count(*)::int "c" from analytics_events where shop_id = ? and ${window} group by name`,
        [],
      );
      const sessions = await q<{ c: number }>(
        `select count(distinct session_id)::int "c" from analytics_events
           where shop_id = ? and ${window} and session_id is not null`,
        [],
      );
      const channels = await q<{ ch: string; c: number }>(
        `select coalesce(props->>'channel','autre') "ch", count(*)::int "c" from analytics_events
           where name = 'contact_click' and shop_id = ? and ${window} group by 1`,
        [],
      );
      const products = await q<{ slug: string; name: string; c: number }>(
        `select props->>'slug' "slug", coalesce(props->>'name','') "name", count(*)::int "c"
           from analytics_events where name = 'product_view' and shop_id = ? and ${window}
           and coalesce(props->>'slug','') <> '' group by 1,2 order by 3 desc limit 5`,
        [],
      );
      const searches = await q<{ term: string; c: number }>(
        `select lower(props->>'term') "term", count(*)::int "c" from analytics_events
           where name = 'search' and shop_id = ? and ${window}
           and coalesce(props->>'term','') <> '' group by 1 order by 2 desc limit 5`,
        [],
      );
      const byDay = await q<{ day: string; views: number }>(
        `select to_char(date_trunc('day', created_at),'YYYY-MM-DD') "day",
                count(*) filter (where name = 'page_view')::int "views"
           from analytics_events where shop_id = ? and ${window} group by 1 order by 1`,
        [],
      );

      const byName = Object.fromEntries(counts.map((r) => [r.name, r.c]));
      const pageViews = byName.page_view ?? 0;
      const contactByChannel = Object.fromEntries(channels.map((r) => [r.ch, r.c]));
      const contactClicks = channels.reduce((s, r) => s + r.c, 0);

      return {
        days,
        pageViews,
        productViews: byName.product_view ?? 0,
        searches: byName.search ?? 0,
        sessions: sessions[0]?.c ?? 0,
        contactClicks,
        contactByChannel,
        contactRate: pageViews > 0 ? Math.round((contactClicks / pageViews) * 1000) / 1000 : 0,
        topProducts: products.map((r) => ({ slug: r.slug, name: r.name, views: r.c })),
        topSearches: searches.map((r) => ({ term: r.term, count: r.c })),
        byDay: byDay.map((r) => ({ day: r.day, views: r.views })),
      };
    });
  }
}

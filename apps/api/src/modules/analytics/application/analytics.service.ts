import { Injectable } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import type { AnalyticsSummary, IngestEventsInput } from '@jokko/contracts';
import { TenantContext } from '../../../shared/tenant/tenant-context';
import { AnalyticsEventEntity } from '../infrastructure/analytics-event.entity';
import { toCsv } from '../infrastructure/csv';

/**
 * Statuts au-delà de « en attente de paiement » : la vente est acquise pour le
 * vendeur. Constante interne (pas d'entrée utilisateur) — inlinée en SQL pour
 * éviter toute ambiguïté de sérialisation d'un tableau JS en paramètre lié.
 */
const CONFIRMED_STATUSES_SQL = `array['to_deliver','paid','fulfilled']`;

const STATUS_LABEL: Record<string, string> = {
  pending_payment: 'En attente de paiement',
  to_deliver: 'À livrer',
  paid: 'Payée',
  fulfilled: 'Terminée',
  canceled: 'Annulée',
};

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

      // `orders` n'a pas de RLS (filtrage explicite par shop_id) : pas besoin du
      // contexte tenant ci-dessus, mais on réutilise la même transaction/connexion.
      const orderWindow = `created_at >= now() - make_interval(days => ?::int)`;
      const confirmed = `status = any(${CONFIRMED_STATUSES_SQL})`;

      const orderCounts = await em.execute(
        `select count(*)::int "created",
                count(*) filter (where ${confirmed})::int "confirmed"
           from orders where shop_id = ? and ${orderWindow}`,
        [shopId, days],
      );
      const revenueByDay = await em.execute(
        `select to_char(date_trunc('day', created_at),'YYYY-MM-DD') "day",
                sum(greatest(subtotal - discount_amount + delivery_fee, 0))::int "amount"
           from orders
          where shop_id = ? and ${orderWindow} and ${confirmed}
          group by 1 order by 1`,
        [shopId, days],
      );
      const currencyRow = await em.execute(
        `select currency from orders where shop_id = ? order by created_at desc limit 1`,
        [shopId],
      );
      const topSales = await em.execute(
        `select l->>'productId' "productId",
                min(split_part(l->>'name', ' — ', 1)) "name",
                sum((l->>'qty')::int)::int "qty",
                sum((l->>'unitAmount')::int * (l->>'qty')::int)::int "revenue"
           from orders, jsonb_array_elements(lines) as l
          where shop_id = ? and ${orderWindow} and ${confirmed}
          group by 1 order by 4 desc limit 5`,
        [shopId, days],
      );
      const repeatRow = await em.execute(
        `select count(*) filter (where c > 1)::int "repeat", count(*)::int "total" from (
           select buyer_phone, count(*) c from orders
            where shop_id = ? and ${confirmed}
            group by buyer_phone
         ) s`,
        [shopId],
      );

      const revenueTotal = (revenueByDay as { amount: number }[]).reduce(
        (s, r) => s + (r.amount ?? 0),
        0,
      );
      const repeat = (repeatRow as { repeat: number; total: number }[])[0] ?? {
        repeat: 0,
        total: 0,
      };

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
        funnel: {
          productViews: byName.product_view ?? 0,
          addToCart: byName.add_to_cart ?? 0,
          ordersCreated: (orderCounts as { created: number }[])[0]?.created ?? 0,
          ordersConfirmed: (orderCounts as { confirmed: number }[])[0]?.confirmed ?? 0,
        },
        revenue: {
          currency: (currencyRow as { currency: string }[])[0]?.currency ?? 'XOF',
          total: revenueTotal,
          byDay: (revenueByDay as { day: string; amount: number }[]).map((r) => ({
            day: r.day,
            amount: r.amount ?? 0,
          })),
        },
        topProductsBySales: (
          topSales as { productId: string; name: string; qty: number; revenue: number }[]
        ).map((r) => ({ productId: r.productId, name: r.name, qty: r.qty, revenue: r.revenue })),
        repeatPurchaseRate: repeat.total > 0 ? Math.round((repeat.repeat / repeat.total) * 1000) / 1000 : 0,
      };
    });
  }

  /** Export CSV des commandes de la période (pour comptabilité / suivi vendeur). */
  async exportOrdersCsv(days: number): Promise<string> {
    const shopId = this.tenant.getShopId();
    return this.withTenant(async (em) => {
      const rows = (await em.execute(
        `select to_char(o.created_at, 'YYYY-MM-DD"T"HH24:MI:SS') "created_at",
                o.id, o.buyer_name, o.buyer_phone, o.status, o.payment_method,
                o.delivery_method, o.subtotal, o.discount_amount, o.delivery_fee, o.currency,
                coalesce((select sum((l->>'qty')::int) from jsonb_array_elements(o.lines) l), 0)::int "items"
           from orders o
          where o.shop_id = ? and o.created_at >= now() - make_interval(days => ?::int)
          order by o.created_at desc`,
        [shopId, days],
      )) as {
        created_at: string;
        id: string;
        buyer_name: string;
        buyer_phone: string;
        status: string;
        payment_method: string;
        delivery_method: string;
        subtotal: number;
        discount_amount: number;
        delivery_fee: number;
        currency: string;
        items: number;
      }[];

      return toCsv(
        [
          'Date',
          'Référence',
          'Client',
          'Téléphone',
          'Statut',
          'Paiement',
          'Livraison',
          'Articles',
          'Sous-total',
          'Remise',
          'Frais de livraison',
          'Total',
          'Devise',
        ],
        rows.map((r) => {
          const total = Math.max(0, r.subtotal - r.discount_amount + r.delivery_fee);
          return [
            r.created_at.slice(0, 10),
            r.id.slice(0, 8).toUpperCase(),
            r.buyer_name,
            r.buyer_phone,
            STATUS_LABEL[r.status] ?? r.status,
            r.payment_method === 'cash_on_delivery' ? 'À la livraison' : 'En ligne',
            r.delivery_method === 'delivery' ? 'Livraison' : 'Retrait',
            r.items,
            r.subtotal,
            r.discount_amount,
            r.delivery_fee,
            total,
            r.currency,
          ];
        }),
      );
    });
  }
}

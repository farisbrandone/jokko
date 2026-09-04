import { Inject, Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import type { AppConfig } from '../../../config/configuration';
import { ADMIN_DB, type AdminDb } from '../../../shared/admin-db/admin-db';

export type RetentionSummary = Record<string, number>;

/** Purge quotidienne des données périmées (RGPD / hygiène). Rôle propriétaire. */
@Injectable()
export class RetentionCron {
  private readonly logger = new Logger(RetentionCron.name);
  private readonly cfg: AppConfig['retention'];

  constructor(
    @Inject(ADMIN_DB) private readonly db: AdminDb,
    config: ConfigService<AppConfig, true>,
  ) {
    this.cfg = config.get('retention', { infer: true });
  }

  @Cron(CronExpression.EVERY_DAY_AT_2AM, { name: 'data-retention' })
  async purge(): Promise<RetentionSummary> {
    if (!this.cfg.enabled) return {};
    const del = async (label: string, sql: string, params: unknown[] = []): Promise<number> => {
      const res = await this.db.query(sql, params);
      const n = res.rowCount ?? 0;
      if (n > 0) this.logger.log(`purge ${label}: ${n} ligne(s)`);
      return n;
    };

    const summary: RetentionSummary = {
      otpChallenges: await del(
        'otp_challenges',
        `delete from otp_challenges where expires_at < now() - interval '1 day'`,
      ),
      authSessions: await del(
        'auth_sessions',
        `delete from auth_sessions
          where (revoked_at is not null or expires_at < now())
            and created_at < now() - interval '30 days'`,
      ),
      outboxMessages: await del(
        'outbox_messages',
        `delete from outbox_messages
          where processed_at is not null and processed_at < now() - interval '7 days'`,
      ),
      analyticsEvents: await del(
        'analytics_events',
        `delete from analytics_events where created_at < now() - ($1 || ' days')::interval`,
        [this.cfg.analyticsDays],
      ),
      dispatchLog: await del(
        'notification_dispatch_log',
        `delete from notification_dispatch_log where sent_at < now() - ($1 || ' days')::interval`,
        [this.cfg.dispatchLogDays],
      ),
      impersonationEvents: await del(
        'impersonation_events',
        `delete from impersonation_events where created_at < now() - ($1 || ' days')::interval`,
        [this.cfg.impersonationDays],
      ),
      closedConversations: await del(
        'conversations',
        `delete from conversations
          where status = 'closed' and last_message_at < now() - ($1 || ' days')::interval`,
        [this.cfg.conversationDays],
      ),
      finishedOrders: await del(
        'orders',
        `delete from orders
          where status in ('fulfilled', 'canceled')
            and created_at < now() - ($1 || ' days')::interval`,
        [this.cfg.orderDays],
      ),
    };
    return summary;
  }
}

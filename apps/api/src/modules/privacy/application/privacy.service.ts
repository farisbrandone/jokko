import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { ADMIN_DB, type AdminDb } from '../../../shared/admin-db/admin-db';

export interface UserDataExport {
  generatedAt: string;
  user: Record<string, unknown>;
  memberships: Record<string, unknown>[];
  sessions: Record<string, unknown>[];
  pushSubscriptions: Record<string, unknown>[];
  notificationSettings: Record<string, unknown>[];
  billing: Record<string, unknown>[];
  buyerConversations: Record<string, unknown>[];
  buyerMessages: Record<string, unknown>[];
}

/**
 * RGPD : portabilité (export) et droit à l'effacement (suppression de compte).
 * Utilise le pool propriétaire (hors RLS) car les données de l'acheteur sont
 * réparties dans des tables cloisonnées par boutique.
 */
@Injectable()
export class PrivacyService {
  constructor(@Inject(ADMIN_DB) private readonly db: AdminDb) {}

  async exportForUser(userId: string): Promise<UserDataExport> {
    const user = (
      await this.db.query(
        `select id, email, name, phone, is_platform_admin, created_at, updated_at
           from users where id = $1`,
        [userId],
      )
    ).rows[0];
    if (!user) throw new NotFoundException('utilisateur introuvable');

    const memberships = (
      await this.db.query(
        `select m.shop_id, s.name as shop_name, s.slug, m.role, m.created_at
           from shop_memberships m join shops s on s.id = m.shop_id
          where m.user_id = $1 order by m.created_at`,
        [userId],
      )
    ).rows;
    const shopIds = memberships.map((m) => m.shop_id as string);

    const sessions = (
      await this.db.query(
        `select id, user_agent, created_at, expires_at, revoked_at
           from auth_sessions where user_id = $1 order by created_at desc`,
        [userId],
      )
    ).rows;
    const pushSubscriptions = (
      await this.db.query(
        `select endpoint, user_agent, created_at from push_subscriptions where user_id = $1`,
        [userId],
      )
    ).rows;
    const notificationSettings = shopIds.length
      ? (
          await this.db.query(
            `select * from notification_settings where shop_id = any($1::uuid[])`,
            [shopIds],
          )
        ).rows
      : [];
    const billing = shopIds.length
      ? (await this.db.query(`select * from subscriptions where shop_id = any($1::uuid[])`, [shopIds]))
          .rows
      : [];

    const buyerConversations = (
      await this.db.query(
        `select id, shop_id, buyer_name, buyer_phone, buyer_email, product_name, status,
                created_at, last_message_at
           from conversations
          where buyer_email is not null and lower(buyer_email) = lower($1)
          order by created_at`,
        [user.email],
      )
    ).rows;
    const convIds = buyerConversations.map((c) => c.id as string);
    const buyerMessages = convIds.length
      ? (
          await this.db.query(
            `select conversation_id, sender, body, created_at from messages
              where conversation_id = any($1::uuid[]) order by created_at`,
            [convIds],
          )
        ).rows
      : [];

    return {
      generatedAt: new Date().toISOString(),
      user,
      memberships,
      sessions,
      pushSubscriptions,
      notificationSettings,
      billing,
      buyerConversations,
      buyerMessages,
    };
  }

  /**
   * Efface le compte. Refuse si l'utilisateur possède encore une boutique
   * (rôle `owner`) : il doit d'abord transférer ou fermer ses boutiques.
   */
  async deleteAccount(userId: string): Promise<void> {
    const client = await this.db.connect();
    try {
      await client.query('begin');
      const u = (
        await client.query('select email, phone from users where id = $1 for update', [userId])
      ).rows[0];
      if (!u) throw new NotFoundException('utilisateur introuvable');

      const owned = (
        await client.query(
          `select count(*)::int as n from shop_memberships where user_id = $1 and role = 'owner'`,
          [userId],
        )
      ).rows[0];
      if (owned.n > 0) {
        throw new ConflictException(
          'Vous possédez encore des boutiques. Transférez la propriété ou supprimez-les avant de fermer le compte.',
        );
      }

      await client.query('delete from push_subscriptions where user_id = $1', [userId]);
      await client.query('delete from auth_sessions where user_id = $1', [userId]);
      if (u.phone) await client.query('delete from otp_challenges where phone = $1', [u.phone]);
      await client.query('delete from shop_memberships where user_id = $1', [userId]);
      await client.query(
        `update conversations
            set buyer_name = 'Utilisateur supprimé', buyer_email = null
          where buyer_email is not null and lower(buyer_email) = lower($1)`,
        [u.email],
      );
      await client.query('delete from users where id = $1', [userId]);
      await client.query('commit');
    } catch (err) {
      await client.query('rollback').catch(() => undefined);
      throw err;
    } finally {
      client.release();
    }
  }
}

import { Injectable } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import { DEFAULT_NOTIFICATION_SETTINGS, type NotificationSettings } from '@jokko/contracts';
import type { NotificationSettingsRepository } from '../../domain/ports';
import { NotificationSettingsEntity } from './notification.entity';

/**
 * Accès aux préférences de notification. Le `shopId` est explicite (et non lu
 * dans le TenantContext) : ce dépôt est aussi utilisé depuis le relais d'Outbox,
 * hors contexte de requête HTTP. Le `set_config` maintient l'isolation RLS.
 */
@Injectable()
export class MikroOrmNotificationSettingsRepository implements NotificationSettingsRepository {
  constructor(private readonly em: EntityManager) {}

  // Fork dédié : ce dépôt est appelé depuis le relais d'Outbox, où l'EM de
  // contexte est partagé et non ré-entrant. Un fork isole la transaction.
  private withShop<T>(shopId: string, fn: (em: EntityManager) => Promise<T>): Promise<T> {
    return this.em.fork().transactional(async (em) => {
      await em.execute("select set_config('app.current_shop_id', ?, true)", [shopId]);
      em.setFilterParams('tenant', { shopId });
      return fn(em);
    });
  }

  private toDomain(row: NotificationSettingsEntity): NotificationSettings {
    return {
      emailEnabled: row.emailEnabled,
      whatsappEnabled: row.whatsappEnabled,
      smsEnabled: row.smsEnabled,
      cooldownSeconds: row.cooldownSeconds,
    };
  }

  async get(shopId: string): Promise<NotificationSettings> {
    return this.withShop(shopId, async (em) => {
      const row = await em.findOne(NotificationSettingsEntity, { shopId });
      return row ? this.toDomain(row) : { ...DEFAULT_NOTIFICATION_SETTINGS };
    });
  }

  async update(
    shopId: string,
    patch: Partial<NotificationSettings>,
  ): Promise<NotificationSettings> {
    return this.withShop(shopId, async (em) => {
      let row = await em.findOne(NotificationSettingsEntity, { shopId });
      if (!row) {
        row = new NotificationSettingsEntity();
        row.shopId = shopId;
        Object.assign(row, DEFAULT_NOTIFICATION_SETTINGS);
      }
      if (patch.emailEnabled !== undefined) row.emailEnabled = patch.emailEnabled;
      if (patch.whatsappEnabled !== undefined) row.whatsappEnabled = patch.whatsappEnabled;
      if (patch.smsEnabled !== undefined) row.smsEnabled = patch.smsEnabled;
      if (patch.cooldownSeconds !== undefined) row.cooldownSeconds = patch.cooldownSeconds;
      row.updatedAt = new Date();
      await em.persistAndFlush(row);
      return this.toDomain(row);
    });
  }
}

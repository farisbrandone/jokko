import { Inject, Injectable } from '@nestjs/common';
import type { NotificationSettings, UpdateNotificationSettingsInput } from '@jokko/contracts';
import {
  NOTIFICATION_SETTINGS_REPOSITORY,
  type NotificationSettingsRepository,
} from '../domain/ports';

@Injectable()
export class NotificationSettingsService {
  constructor(
    @Inject(NOTIFICATION_SETTINGS_REPOSITORY)
    private readonly repo: NotificationSettingsRepository,
  ) {}

  get(shopId: string): Promise<NotificationSettings> {
    return this.repo.get(shopId);
  }

  update(
    shopId: string,
    patch: UpdateNotificationSettingsInput,
  ): Promise<NotificationSettings> {
    return this.repo.update(shopId, patch);
  }
}

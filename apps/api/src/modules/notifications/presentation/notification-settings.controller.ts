import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import {
  updateNotificationSettingsSchema,
  type UpdateNotificationSettingsInput,
} from '@jokko/contracts';
import { ZodValidationPipe } from '../../../shared/zod-validation.pipe';
import { TenantContext } from '../../../shared/tenant/tenant-context';
import { TenantGuard } from '../../shop/tenant/tenant.guard';
import { AuthGuard } from '../../identity/guards/auth.guard';
import { PoliciesGuard } from '../../identity/guards/policies.guard';
import { CheckPolicies } from '../../identity/authz/check-policies.decorator';
import { NotificationSettingsService } from '../application/notification-settings.service';

/** Préférences de notification de la boutique (membre autorisé). */
@ApiTags('notifications')
@Controller('shops/:shopId/settings/notifications')
@UseGuards(TenantGuard, AuthGuard, PoliciesGuard)
export class NotificationSettingsController {
  constructor(
    private readonly tenant: TenantContext,
    private readonly settings: NotificationSettingsService,
  ) {}

  @Get()
  @CheckPolicies((a) => a.can('read', 'Shop'))
  get() {
    return this.settings.get(this.tenant.getShopId());
  }

  @Patch()
  @CheckPolicies((a) => a.can('update', 'Shop'))
  update(
    @Body(new ZodValidationPipe(updateNotificationSettingsSchema))
    body: UpdateNotificationSettingsInput,
  ) {
    return this.settings.update(this.tenant.getShopId(), body);
  }
}

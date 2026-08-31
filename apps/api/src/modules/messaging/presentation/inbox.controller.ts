import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { z } from 'zod';
import {
  PostMessageSchema,
  type PostMessageInput,
} from '@jokko/contracts';
import { ZodValidationPipe } from '../../../shared/zod-validation.pipe';
import { TenantContext } from '../../../shared/tenant/tenant-context';
import { TenantGuard } from '../../shop/tenant/tenant.guard';
import { AuthGuard } from '../../identity/guards/auth.guard';
import { PoliciesGuard } from '../../identity/guards/policies.guard';
import { CheckPolicies } from '../../identity/authz/check-policies.decorator';
import { MessagingService } from '../application/messaging.service';

const InboxQuerySchema = z.object({
  status: z.enum(['open', 'closed']).optional(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(30),
});
type InboxQuery = z.infer<typeof InboxQuerySchema>;

/** Boîte de réception côté vendeur (membre autorisé). */
@ApiTags('messaging')
@Controller('shops/:shopId/inbox')
@UseGuards(TenantGuard, AuthGuard, PoliciesGuard)
export class InboxController {
  constructor(
    private readonly tenant: TenantContext,
    private readonly messaging: MessagingService,
  ) {}

  @Get()
  @CheckPolicies((a) => a.can('read', 'Message'))
  list(@Query(new ZodValidationPipe(InboxQuerySchema)) query: InboxQuery) {
    return this.messaging.list(this.tenant.getShopId(), query);
  }

  @Get(':id')
  @CheckPolicies((a) => a.can('read', 'Message'))
  thread(@Param('id', ParseUUIDPipe) id: string) {
    return this.messaging.thread(this.tenant.getShopId(), id);
  }

  @Post(':id/messages')
  @CheckPolicies((a) => a.can('update', 'Message'))
  reply(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(PostMessageSchema)) body: PostMessageInput,
  ) {
    return this.messaging.sellerReply(this.tenant.getShopId(), id, body.body);
  }

  @Post(':id/close')
  @CheckPolicies((a) => a.can('update', 'Message'))
  close(@Param('id', ParseUUIDPipe) id: string) {
    return this.messaging.close(this.tenant.getShopId(), id);
  }
}

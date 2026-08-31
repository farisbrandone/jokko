import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UnprocessableEntityException,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import {
  PostMessageSchema,
  StartConversationSchema,
  type PostMessageInput,
  type StartConversationInput,
} from '@jokko/contracts';
import { ZodValidationPipe } from '../../../shared/zod-validation.pipe';
import { TenantContext } from '../../../shared/tenant/tenant-context';
import { TenantGuard } from '../../shop/tenant/tenant.guard';
import { MessagingService } from '../application/messaging.service';

/** Conversations côté acheteur (vitrine) : ouverture + suivi par jeton, sans compte. */
@ApiTags('messaging')
@Controller('shops/:shopId/conversations')
@UseGuards(TenantGuard)
export class PublicConversationController {
  constructor(
    private readonly tenant: TenantContext,
    private readonly messaging: MessagingService,
  ) {}

  @Post()
  async start(
    @Body(new ZodValidationPipe(StartConversationSchema)) body: StartConversationInput,
  ) {
    const res = await this.messaging.start(this.tenant.getShopId(), body);
    if (res.isErr) throw new UnprocessableEntityException(res.getError());
    return res.unwrap();
  }

  @Get(':id')
  view(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('token') token?: string,
  ) {
    if (!token) throw new BadRequestException('token requis');
    return this.messaging.buyerView(this.tenant.getShopId(), id, token);
  }

  @Post(':id/messages')
  async reply(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('token') token: string | undefined,
    @Body(new ZodValidationPipe(PostMessageSchema)) body: PostMessageInput,
  ) {
    if (!token) throw new BadRequestException('token requis');
    await this.messaging.buyerReply(this.tenant.getShopId(), id, token, body.body);
    return { ok: true };
  }
}

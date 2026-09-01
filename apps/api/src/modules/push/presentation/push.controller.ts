import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  HttpCode,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import {
  pushSubscriptionSchema,
  pushUnsubscribeSchema,
  type PushSubscriptionInput,
  type PushUnsubscribeInput,
} from '@jokko/contracts';
import { ZodValidationPipe } from '../../../shared/zod-validation.pipe';
import { AuthGuard } from '../../identity/guards/auth.guard';
import { CurrentUser } from '../../identity/decorators/current-user.decorator';
import { PushService } from '../application/push.service';

@ApiTags('push')
@Controller('push')
@UseGuards(AuthGuard)
export class PushController {
  constructor(private readonly push: PushService) {}

  @Get('public-key')
  publicKey() {
    return { key: this.push.publicKey() };
  }

  @Post('subscriptions')
  @HttpCode(201)
  async subscribe(
    @CurrentUser() user: { id: string },
    @Body(new ZodValidationPipe(pushSubscriptionSchema)) body: PushSubscriptionInput,
    @Headers('user-agent') userAgent?: string,
  ) {
    await this.push.subscribe(user.id, body, userAgent);
    return { ok: true };
  }

  @Delete('subscriptions')
  @HttpCode(204)
  async unsubscribe(
    @CurrentUser() user: { id: string },
    @Body(new ZodValidationPipe(pushUnsubscribeSchema)) body: PushUnsubscribeInput,
  ) {
    await this.push.unsubscribe(user.id, body.endpoint);
  }
}

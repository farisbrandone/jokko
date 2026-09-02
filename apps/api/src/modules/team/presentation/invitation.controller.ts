import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { acceptInviteSchema, type AcceptInviteInput } from '@jokko/contracts';
import { ZodValidationPipe } from '../../../shared/zod-validation.pipe';
import { AuthGuard } from '../../identity/guards/auth.guard';
import { CurrentUser } from '../../identity/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../identity/guards/auth.guard';
import { TeamService } from '../application/team.service';

/** Cycle de vie d'une invitation, hors contexte boutique (jeton porteur). */
@ApiTags('team')
@Controller('invitations')
@Throttle({ default: { limit: 20, ttl: 60_000 } })
export class InvitationController {
  constructor(private readonly team: TeamService) {}

  /** Aperçu public (avant connexion) : nom de la boutique, rôle, invitant. */
  @Get(':token')
  preview(@Param('token') token: string) {
    return this.team.previewInvite(token);
  }

  @Post('accept')
  @UseGuards(AuthGuard)
  accept(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(acceptInviteSchema)) body: AcceptInviteInput,
  ) {
    return this.team.acceptInvite({ id: user.id, email: user.email }, body.token);
  }
}

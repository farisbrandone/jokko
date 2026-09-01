import {
  Controller,
  Delete,
  ForbiddenException,
  Get,
  HttpCode,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { FastifyReply } from 'fastify';
import {
  ACCESS_COOKIE,
  AuthGuard,
  REFRESH_COOKIE,
  type AuthenticatedUser,
} from '../../identity/guards/auth.guard';
import { CurrentUser } from '../../identity/decorators/current-user.decorator';
import { PrivacyService } from '../application/privacy.service';

@ApiTags('privacy')
@Controller('me')
@UseGuards(AuthGuard)
// Opérations sensibles et coûteuses : plafond strict.
@Throttle({ default: { limit: 6, ttl: 60_000 } })
export class PrivacyController {
  constructor(private readonly privacy: PrivacyService) {}

  /** Portabilité RGPD : archive JSON des données personnelles. */
  @Get('export')
  async export(
    @CurrentUser() user: AuthenticatedUser,
    @Res({ passthrough: true }) res: FastifyReply,
  ) {
    const bundle = await this.privacy.exportForUser(user.id);
    const day = new Date().toISOString().slice(0, 10);
    res.header('content-disposition', `attachment; filename="jokko-export-${day}.json"`);
    return bundle;
  }

  /** Droit à l'effacement : supprime le compte et déconnecte. */
  @Delete()
  @HttpCode(200)
  async deleteAccount(
    @CurrentUser() user: AuthenticatedUser,
    @Res({ passthrough: true }) res: FastifyReply,
  ) {
    if (user.impersonatedBy) {
      throw new ForbiddenException('suppression impossible pendant une session support');
    }
    await this.privacy.deleteAccount(user.id);
    res.clearCookie(ACCESS_COOKIE, { path: '/' });
    res.clearCookie(REFRESH_COOKIE, { path: '/' });
    return { deleted: true };
  }
}

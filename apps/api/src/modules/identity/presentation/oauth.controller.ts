import { randomBytes, timingSafeEqual } from 'node:crypto';
import {
  BadRequestException,
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  Post,
  Query,
  Req,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiExcludeController } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { FastifyReply, FastifyRequest } from 'fastify';
import type { AppConfig } from '../../../config/configuration';
import { SocialAuthService } from '../application/social-auth.service';
import { TokenService } from '../infrastructure/security/token.service';

const STATE_COOKIE = 'jk_oauth_state';
const KNOWN = new Set(['google', 'facebook', 'fake']);

function safeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  return ba.length === bb.length && timingSafeEqual(ba, bb);
}

@ApiExcludeController()
@Controller('auth/oauth')
@Throttle({ default: { limit: 20, ttl: 60_000 } })
export class OAuthController {
  constructor(
    private readonly social: SocialAuthService,
    private readonly tokens: TokenService,
    private readonly config: ConfigService<AppConfig, true>,
  ) {}

  private redirectUri(provider: string): string {
    return `${this.config.get('oauth', { infer: true }).redirectBaseUrl}/auth/oauth/${provider}/callback`;
  }

  /** Liste des fournisseurs actifs (pour n'afficher que les boutons pertinents). */
  @Get('providers')
  providers(): { providers: string[] } {
    return { providers: this.social.available() };
  }

  @Get(':provider/start')
  start(@Param('provider') provider: string, @Res() res: FastifyReply): void {
    if (!KNOWN.has(provider) || !this.social.isEnabled(provider)) {
      throw new NotFoundException(`connexion ${provider} indisponible`);
    }
    const state = randomBytes(16).toString('hex');
    res.setCookie(STATE_COOKIE, state, {
      httpOnly: true,
      sameSite: 'lax',
      secure: false,
      path: '/',
      maxAge: 600,
    });
    const url = this.social.authorizeUrl(provider, state, this.redirectUri(provider));
    res.status(302).header('location', url).send();
  }

  @Get(':provider/callback')
  async callback(
    @Param('provider') provider: string,
    @Query('code') code: string | undefined,
    @Query('state') state: string | undefined,
    @Req() req: FastifyRequest,
    @Res() res: FastifyReply,
  ): Promise<void> {
    const cookieState = req.cookies?.[STATE_COOKIE];
    res.clearCookie(STATE_COOKIE, { path: '/' });
    if (!code || !state || !cookieState || !safeEqual(state, cookieState)) {
      throw new BadRequestException('état OAuth invalide ou expiré');
    }
    const userId = await this.social.completeLogin(provider, code, this.redirectUri(provider));
    const ticket = await this.tokens.signHandoff(userId);
    const base = this.config.get('oauth', { infer: true }).postLoginUrl;
    res
      .status(302)
      .header('location', `${base}/oauth/callback?ticket=${encodeURIComponent(ticket)}`)
      .send();
  }

  /** Échange serveur-à-serveur : le BFF du dashboard troque le ticket contre une session. */
  @Post('exchange')
  async exchange(@Body() body: { ticket?: string }, @Req() req: FastifyRequest) {
    if (!body?.ticket) throw new BadRequestException('ticket manquant');
    let userId: string;
    try {
      userId = await this.tokens.verifyHandoff(body.ticket);
    } catch {
      throw new UnauthorizedException('ticket invalide ou expiré');
    }
    return this.social.sessionFor(userId, req.headers['user-agent']);
  }
}

import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { FastifyReply, FastifyRequest } from 'fastify';
import type {
  AuthenticationResponseJSON,
  RegistrationResponseJSON,
} from '@simplewebauthn/server';
import { WebAuthnService } from '../application/webauthn.service';
import type { AuthResult } from '../application/auth.service';
import { TokenService } from '../infrastructure/security/token.service';
import { AuthGuard, ACCESS_COOKIE, REFRESH_COOKIE, type AuthenticatedUser } from '../guards/auth.guard';
import { CurrentUser } from '../decorators/current-user.decorator';

@ApiTags('auth')
@Controller('auth/webauthn')
@Throttle({ default: { limit: 20, ttl: 60_000 } })
export class WebAuthnController {
  constructor(
    private readonly webauthn: WebAuthnService,
    private readonly tokens: TokenService,
  ) {}

  // ── Enregistrement d'une passkey (utilisateur connecté) ────────────────────
  @Post('register/options')
  @UseGuards(AuthGuard)
  registerOptions(@CurrentUser() user: AuthenticatedUser) {
    return this.webauthn.startRegistration(user.id);
  }

  @Post('register/verify')
  @UseGuards(AuthGuard)
  async registerVerify(
    @CurrentUser() user: AuthenticatedUser,
    @Body()
    body: { response: RegistrationResponseJSON; challengeToken: string; deviceName?: string },
  ) {
    const credential = await this.webauthn.finishRegistration(
      user.id,
      body.response,
      body.challengeToken,
      body.deviceName,
    );
    return { verified: true, credential };
  }

  // ── Connexion par passkey (aucune session requise) ────────────────────────
  @Post('login/options')
  @HttpCode(200)
  loginOptions() {
    return this.webauthn.startAuthentication();
  }

  @Post('login/verify')
  async loginVerify(
    @Body() body: { response: AuthenticationResponseJSON; challengeToken: string },
    @Req() req: FastifyRequest,
    @Res({ passthrough: true }) res: FastifyReply,
  ) {
    const userId = await this.webauthn.finishAuthentication(body.response, body.challengeToken);
    const result = await this.webauthn.sessionFor(userId, req.headers['user-agent']);
    this.setCookies(res, result);
    return result;
  }

  // ── Gestion des passkeys ─────────────────────────────────────────────────
  @Get('credentials')
  @UseGuards(AuthGuard)
  list(@CurrentUser() user: AuthenticatedUser) {
    return this.webauthn.list(user.id);
  }

  @Delete('credentials/:id')
  @UseGuards(AuthGuard)
  async remove(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    const removed = await this.webauthn.remove(user.id, id);
    return { removed };
  }

  private setCookies(res: FastifyReply, result: AuthResult): void {
    const base = { httpOnly: true, sameSite: 'lax' as const, secure: false, path: '/' };
    res.setCookie(ACCESS_COOKIE, result.tokens.accessToken, {
      ...base,
      maxAge: this.tokens.accessTtlSeconds,
    });
    res.setCookie(REFRESH_COOKIE, result.tokens.refreshToken, {
      ...base,
      maxAge: 60 * 60 * 24 * 30,
    });
  }
}

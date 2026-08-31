import { Body, Controller, Get, Post, Req, Res, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { FastifyReply, FastifyRequest } from 'fastify';
import {
  LoginSchema,
  RegisterSchema,
  type LoginInput,
  type RegisterInput,
} from '@jokko/contracts';
import { ZodValidationPipe } from '../../../shared/zod-validation.pipe';
import { AuthService, type AuthResult } from '../application/auth.service';
import { AuthGuard, ACCESS_COOKIE, REFRESH_COOKIE } from '../guards/auth.guard';
import { CurrentUser } from '../decorators/current-user.decorator';
import { TokenService } from '../infrastructure/security/token.service';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly tokens: TokenService,
  ) {}

  @Post('register')
  async register(
    @Body(new ZodValidationPipe(RegisterSchema)) body: RegisterInput,
    @Req() req: FastifyRequest,
    @Res({ passthrough: true }) res: FastifyReply,
  ) {
    const result = await this.auth.register(body, req.headers['user-agent']);
    this.setCookies(res, result);
    return result;
  }

  @Post('login')
  async login(
    @Body(new ZodValidationPipe(LoginSchema)) body: LoginInput,
    @Req() req: FastifyRequest,
    @Res({ passthrough: true }) res: FastifyReply,
  ) {
    const result = await this.auth.login(body, req.headers['user-agent']);
    this.setCookies(res, result);
    return result;
  }

  @Post('refresh')
  async refresh(
    @Req() req: FastifyRequest,
    @Res({ passthrough: true }) res: FastifyReply,
    @Body() body: { refreshToken?: string },
  ) {
    const token = req.cookies?.[REFRESH_COOKIE] ?? body?.refreshToken ?? '';
    const result = await this.auth.refresh(token, req.headers['user-agent']);
    this.setCookies(res, result);
    return result;
  }

  @Post('logout')
  async logout(
    @Req() req: FastifyRequest,
    @Res({ passthrough: true }) res: FastifyReply,
    @Body() body: { refreshToken?: string },
  ) {
    await this.auth.logout(req.cookies?.[REFRESH_COOKIE] ?? body?.refreshToken);
    res.clearCookie(ACCESS_COOKIE, { path: '/' });
    res.clearCookie(REFRESH_COOKIE, { path: '/' });
    return { ok: true };
  }

  @Get('me')
  @UseGuards(AuthGuard)
  me(@CurrentUser() user: { id: string }) {
    return this.auth.me(user.id);
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

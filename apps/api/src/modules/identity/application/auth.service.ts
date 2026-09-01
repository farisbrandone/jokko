import {
  ConflictException,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { LoginInput, RegisterInput, SessionUser, TokenPair } from '@jokko/contracts';
import { User } from '../domain/user.aggregate';
import {
  MEMBERSHIP_REPOSITORY,
  SESSION_REPOSITORY,
  USER_REPOSITORY,
  type MembershipRepository,
  type SessionRepository,
  type UserRepository,
} from '../domain/ports';
import { PasswordService } from '../infrastructure/security/password.service';
import { TokenService } from '../infrastructure/security/token.service';

export interface AuthResult {
  user: SessionUser;
  tokens: TokenPair;
}

@Injectable()
export class AuthService {
  constructor(
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    @Inject(MEMBERSHIP_REPOSITORY) private readonly memberships: MembershipRepository,
    @Inject(SESSION_REPOSITORY) private readonly sessions: SessionRepository,
    private readonly passwords: PasswordService,
    private readonly tokens: TokenService,
  ) {}

  async register(input: RegisterInput, userAgent?: string): Promise<AuthResult> {
    const existing = await this.users.findByEmail(input.email);
    if (existing) throw new ConflictException('Un compte existe déjà pour cet e-mail');

    const passwordHash = await this.passwords.hash(input.password);
    const created = User.create({ email: input.email, name: input.name, passwordHash });
    if (created.isErr) throw new ConflictException(created.getError());

    const user = created.unwrap();
    await this.users.save(user);
    return this.issueSession(user.id.value, userAgent);
  }

  async login(input: LoginInput, userAgent?: string): Promise<AuthResult> {
    const user = await this.users.findByEmail(input.email);
    if (
      !user ||
      !user.passwordHash ||
      !(await this.passwords.verify(input.password, user.passwordHash))
    ) {
      throw new UnauthorizedException('E-mail ou mot de passe invalide');
    }
    return this.issueSession(user.id.value, userAgent);
  }

  /** Ouvre une session pour un utilisateur déjà authentifié (OTP, OAuth…). */
  sessionFor(userId: string, userAgent?: string): Promise<AuthResult> {
    return this.issueSession(userId, userAgent);
  }

  async refresh(refreshToken: string, userAgent?: string): Promise<AuthResult> {
    const hash = this.tokens.hashRefresh(refreshToken);
    const session = await this.sessions.findValidByHash(hash);
    if (!session) throw new UnauthorizedException('Session expirée ou invalide');
    await this.sessions.revokeByHash(hash); // rotation
    return this.issueSession(session.userId, userAgent);
  }

  async logout(refreshToken: string | undefined): Promise<void> {
    if (refreshToken) await this.sessions.revokeByHash(this.tokens.hashRefresh(refreshToken));
  }

  async me(userId: string, impersonatedBy?: string): Promise<SessionUser> {
    const user = await this.buildSessionUser(userId);
    return { ...user, impersonatedBy: impersonatedBy ?? null };
  }

  private async issueSession(userId: string, userAgent?: string): Promise<AuthResult> {
    const sessionUser = await this.buildSessionUser(userId);
    const accessToken = await this.tokens.signAccess({
      sub: sessionUser.id,
      email: sessionUser.email,
    });
    const refresh = this.tokens.newRefreshToken();
    await this.sessions.create({
      userId,
      refreshTokenHash: refresh.hash,
      expiresAt: refresh.expiresAt,
      userAgent,
    });
    return {
      user: sessionUser,
      tokens: {
        accessToken,
        refreshToken: refresh.token,
        expiresIn: this.tokens.accessTtlSeconds,
      },
    };
  }

  private async buildSessionUser(userId: string): Promise<SessionUser> {
    const user = await this.users.findById(userId);
    if (!user) throw new UnauthorizedException('Utilisateur introuvable');
    const memberships = await this.memberships.listByUser(userId);
    return {
      id: user.id.value,
      email: user.email,
      name: user.name,
      isPlatformAdmin: user.isPlatformAdmin,
      memberships: memberships.map((m) => ({ shopId: m.shopId, slug: m.slug, role: m.role })),
    };
  }
}

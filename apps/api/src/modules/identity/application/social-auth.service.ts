import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { User } from '../domain/user.aggregate';
import {
  OAUTH_IDENTITY_REPOSITORY,
  OAUTH_PROVIDERS,
  USER_REPOSITORY,
  type OAuthIdentityRepository,
  type OAuthProviderRegistry,
  type UserRepository,
} from '../domain/ports';
import { AuthService, type AuthResult } from './auth.service';

@Injectable()
export class SocialAuthService {
  private readonly logger = new Logger(SocialAuthService.name);

  constructor(
    @Inject(OAUTH_PROVIDERS) private readonly registry: OAuthProviderRegistry,
    @Inject(OAUTH_IDENTITY_REPOSITORY) private readonly identities: OAuthIdentityRepository,
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    private readonly auth: AuthService,
  ) {}

  isEnabled(provider: string): boolean {
    return this.registry.get(provider) !== null;
  }

  available(): string[] {
    return this.registry.available();
  }

  authorizeUrl(provider: string, state: string, redirectUri: string): string {
    const p = this.registry.get(provider);
    if (!p) throw new BadRequestException(`fournisseur OAuth inconnu: ${provider}`);
    return p.authorizeUrl(state, redirectUri);
  }

  /**
   * Traite le retour du fournisseur : échange le `code`, retrouve ou crée le
   * compte, relie l'identité, et renvoie l'identifiant utilisateur.
   */
  async completeLogin(provider: string, code: string, redirectUri: string): Promise<string> {
    const p = this.registry.get(provider);
    if (!p) throw new BadRequestException(`fournisseur OAuth inconnu: ${provider}`);

    let profile;
    try {
      profile = await p.exchange(code, redirectUri);
    } catch (err) {
      this.logger.warn(`échange OAuth ${provider} échoué: ${(err as Error).message}`);
      throw new UnauthorizedException('authentification du fournisseur refusée');
    }
    if (!profile.emailVerified) {
      throw new UnauthorizedException('e-mail non vérifié chez le fournisseur');
    }

    const linked = await this.identities.find(provider, profile.providerAccountId);
    if (linked) return linked.userId;

    const email = profile.email.trim().toLowerCase();
    let user = await this.users.findByEmail(email);
    if (!user) {
      const created = User.createFromOAuth({ email, name: profile.name });
      if (created.isErr) throw new BadRequestException(created.getError());
      user = created.unwrap();
      await this.users.save(user);
    }

    await this.identities.link(user.id.value, provider, profile.providerAccountId, email);
    return user.id.value;
  }

  sessionFor(userId: string, userAgent?: string): Promise<AuthResult> {
    return this.auth.sessionFor(userId, userAgent);
  }
}

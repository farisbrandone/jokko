import { createHash, randomBytes } from 'node:crypto';
import type {
  OAuthProfile,
  OAuthProvider,
  OAuthProviderRegistry,
} from '../../domain/ports';

export interface OAuthClientConfig {
  clientId: string;
  clientSecret: string;
}

async function readJson(res: Response, ctx: string): Promise<Record<string, unknown>> {
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`${ctx} → HTTP ${res.status} ${text.slice(0, 200)}`);
  }
  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    throw new Error(`${ctx} → réponse non JSON`);
  }
}

/** Google (OpenID Connect). */
export class GoogleOAuthProvider implements OAuthProvider {
  readonly name = 'google';
  constructor(private readonly cfg: OAuthClientConfig) {}

  authorizeUrl(state: string, redirectUri: string): string {
    const q = new URLSearchParams({
      client_id: this.cfg.clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: 'openid email profile',
      state,
      prompt: 'select_account',
    });
    return `https://accounts.google.com/o/oauth2/v2/auth?${q.toString()}`;
  }

  async exchange(code: string, redirectUri: string): Promise<OAuthProfile> {
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: this.cfg.clientId,
        client_secret: this.cfg.clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });
    const token = await readJson(tokenRes, 'Google token');
    const accessToken = String(token.access_token ?? '');
    if (!accessToken) throw new Error('Google : access_token manquant');

    const infoRes = await fetch('https://openidconnect.googleapis.com/v1/userinfo', {
      headers: { authorization: `Bearer ${accessToken}` },
    });
    const info = await readJson(infoRes, 'Google userinfo');
    const email = String(info.email ?? '');
    if (!email) throw new Error('Google : e-mail absent du profil');
    return {
      providerAccountId: String(info.sub),
      email,
      emailVerified: info.email_verified === true || info.email_verified === 'true',
      name: String(info.name ?? info.given_name ?? email.split('@')[0]),
    };
  }
}

/** Facebook Login (Graph API). */
export class FacebookOAuthProvider implements OAuthProvider {
  readonly name = 'facebook';
  private readonly api = 'https://graph.facebook.com/v21.0';
  constructor(private readonly cfg: OAuthClientConfig) {}

  authorizeUrl(state: string, redirectUri: string): string {
    const q = new URLSearchParams({
      client_id: this.cfg.clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: 'email public_profile',
      state,
    });
    return `https://www.facebook.com/v21.0/dialog/oauth?${q.toString()}`;
  }

  async exchange(code: string, redirectUri: string): Promise<OAuthProfile> {
    const tokenRes = await fetch(
      `${this.api}/oauth/access_token?` +
        new URLSearchParams({
          client_id: this.cfg.clientId,
          client_secret: this.cfg.clientSecret,
          redirect_uri: redirectUri,
          code,
        }).toString(),
    );
    const token = await readJson(tokenRes, 'Facebook token');
    const accessToken = String(token.access_token ?? '');
    if (!accessToken) throw new Error('Facebook : access_token manquant');

    const meRes = await fetch(
      `${this.api}/me?` +
        new URLSearchParams({ fields: 'id,name,email', access_token: accessToken }).toString(),
    );
    const me = await readJson(meRes, 'Facebook me');
    const email = String(me.email ?? '');
    if (!email) throw new Error('Facebook : e-mail absent (permission « email » refusée ?)');
    return {
      providerAccountId: String(me.id),
      email,
      emailVerified: true, // Facebook ne renvoie l'e-mail que s'il est vérifié
      name: String(me.name ?? email.split('@')[0]),
    };
  }
}

/**
 * Fournisseur factice pour le développement et les tests : aucun appel réseau.
 * `authorizeUrl` renvoie directement vers l'URI de retour avec un `code`.
 */
export class FakeOAuthProvider implements OAuthProvider {
  readonly name = 'fake';

  authorizeUrl(state: string, redirectUri: string): string {
    const code = `fake-${randomBytes(6).toString('hex')}`;
    const q = new URLSearchParams({ code, state });
    return `${redirectUri}?${q.toString()}`;
  }

  async exchange(code: string): Promise<OAuthProfile> {
    // Déterministe : le même `code` → le même compte.
    const seed = createHash('sha256').update(code).digest('hex').slice(0, 12);
    return {
      providerAccountId: `fake-${seed}`,
      email: `oauth-${seed}@fake.jokko.local`,
      emailVerified: true,
      name: 'Compte OAuth',
    };
  }
}

export class OAuthProviderRegistryImpl implements OAuthProviderRegistry {
  private readonly byName = new Map<string, OAuthProvider>();

  constructor(providers: OAuthProvider[]) {
    for (const p of providers) this.byName.set(p.name, p);
  }

  get(name: string): OAuthProvider | null {
    return this.byName.get(name) ?? null;
  }

  available(): string[] {
    return [...this.byName.keys()];
  }
}

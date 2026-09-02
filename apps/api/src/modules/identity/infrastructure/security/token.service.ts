import { createHash, randomBytes } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SignJWT, jwtVerify } from 'jose';
import type { AppConfig } from '../../../../config/configuration';

export interface AccessClaims {
  sub: string;
  email: string;
  /** Usurpation : identifiant de l'administrateur agissant (RFC 8693 `act`). */
  act?: string;
}

@Injectable()
export class TokenService {
  private readonly secret: Uint8Array;
  private readonly accessTtlSec: number;
  private readonly refreshTtlMs: number;

  constructor(config: ConfigService<AppConfig, true>) {
    const auth = config.get('auth', { infer: true });
    this.secret = new TextEncoder().encode(auth.jwtSecret);
    this.accessTtlSec = auth.accessTtlMin * 60;
    this.refreshTtlMs = auth.refreshTtlDays * 24 * 60 * 60 * 1000;
  }

  get accessTtlSeconds(): number {
    return this.accessTtlSec;
  }

  async signAccess(claims: AccessClaims, opts?: { ttlSec?: number }): Promise<string> {
    const jwt = new SignJWT({
      email: claims.email,
      ...(claims.act ? { act: claims.act } : {}),
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setSubject(claims.sub)
      .setIssuedAt()
      .setIssuer('jokko')
      .setExpirationTime(`${opts?.ttlSec ?? this.accessTtlSec}s`);
    return jwt.sign(this.secret);
  }

  async verifyAccess(token: string): Promise<AccessClaims> {
    const { payload } = await jwtVerify(token, this.secret, { issuer: 'jokko' });
    return {
      sub: String(payload.sub),
      email: String(payload.email),
      act: payload.act ? String(payload.act) : undefined,
    };
  }

  /**
   * Jeton de transfert OAuth : court-vécu (90 s), échangé par le BFF du
   * dashboard contre une vraie session. Évite de faire transiter les jetons de
   * session dans une URL de redirection.
   */
  async signHandoff(userId: string): Promise<string> {
    return new SignJWT({ purpose: 'oauth_handoff' })
      .setProtectedHeader({ alg: 'HS256' })
      .setSubject(userId)
      .setIssuedAt()
      .setIssuer('jokko')
      .setExpirationTime('90s')
      .sign(this.secret);
  }

  async verifyHandoff(token: string): Promise<string> {
    const { payload } = await jwtVerify(token, this.secret, { issuer: 'jokko' });
    if (payload.purpose !== 'oauth_handoff') throw new Error('jeton de transfert invalide');
    return String(payload.sub);
  }

  /**
   * Jeton de défi WebAuthn (5 min) : porte le `challenge` d'une cérémonie
   * d'enregistrement ou d'authentification. Renvoyé au client dans la réponse et
   * redonné à la vérification — pas de cookie à traverser côté BFF.
   */
  async signChallenge(input: {
    challenge: string;
    kind: 'webauthn_reg' | 'webauthn_auth';
    sub?: string;
  }): Promise<string> {
    const jwt = new SignJWT({ purpose: input.kind, challenge: input.challenge })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setIssuer('jokko')
      .setExpirationTime('5m');
    if (input.sub) jwt.setSubject(input.sub);
    return jwt.sign(this.secret);
  }

  async verifyChallenge(
    token: string,
    kind: 'webauthn_reg' | 'webauthn_auth',
  ): Promise<{ challenge: string; sub?: string }> {
    const { payload } = await jwtVerify(token, this.secret, { issuer: 'jokko' });
    if (payload.purpose !== kind || typeof payload.challenge !== 'string') {
      throw new Error('jeton de défi invalide');
    }
    return {
      challenge: payload.challenge,
      sub: payload.sub ? String(payload.sub) : undefined,
    };
  }

  /** Refresh token opaque + son hash (stocké en base pour révocation). */
  newRefreshToken(): { token: string; hash: string; expiresAt: Date } {
    const token = randomBytes(32).toString('base64url');
    return {
      token,
      hash: this.hashRefresh(token),
      expiresAt: new Date(Date.now() + this.refreshTtlMs),
    };
  }

  hashRefresh(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }
}

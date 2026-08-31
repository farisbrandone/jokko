import { createHash, randomBytes } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SignJWT, jwtVerify } from 'jose';
import type { AppConfig } from '../../../../config/configuration';

export interface AccessClaims {
  sub: string;
  email: string;
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

  async signAccess(claims: AccessClaims): Promise<string> {
    return new SignJWT({ email: claims.email })
      .setProtectedHeader({ alg: 'HS256' })
      .setSubject(claims.sub)
      .setIssuedAt()
      .setIssuer('jokko')
      .setExpirationTime(`${this.accessTtlSec}s`)
      .sign(this.secret);
  }

  async verifyAccess(token: string): Promise<AccessClaims> {
    const { payload } = await jwtVerify(token, this.secret, { issuer: 'jokko' });
    return { sub: String(payload.sub), email: String(payload.email) };
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

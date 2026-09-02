import { BadRequestException, Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  generateAuthenticationOptions,
  generateRegistrationOptions,
  verifyAuthenticationResponse,
  verifyRegistrationResponse,
} from '@simplewebauthn/server';
import type {
  AuthenticationResponseJSON,
  AuthenticatorTransportFuture,
  RegistrationResponseJSON,
} from '@simplewebauthn/server';
import type { AppConfig } from '../../../config/configuration';
import {
  USER_REPOSITORY,
  WEBAUTHN_CREDENTIAL_REPOSITORY,
  type UserRepository,
  type WebAuthnCredentialRecord,
  type WebAuthnCredentialRepository,
} from '../domain/ports';
import { TokenService } from '../infrastructure/security/token.service';
import { AuthService, type AuthResult } from './auth.service';

export interface PublicCredential {
  id: string;
  deviceName: string | null;
  createdAt: string;
  lastUsedAt: string | null;
}

@Injectable()
export class WebAuthnService {
  private readonly rpId: string;
  private readonly rpName: string;
  private readonly origins: string[];

  constructor(
    config: ConfigService<AppConfig, true>,
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    @Inject(WEBAUTHN_CREDENTIAL_REPOSITORY)
    private readonly credentials: WebAuthnCredentialRepository,
    private readonly tokens: TokenService,
    private readonly auth: AuthService,
  ) {
    const w = config.get('webauthn', { infer: true });
    this.rpId = w.rpId;
    this.rpName = w.rpName;
    this.origins = w.origins;
  }

  async startRegistration(userId: string) {
    const user = await this.users.findById(userId);
    if (!user) throw new UnauthorizedException('utilisateur introuvable');
    const existing = await this.credentials.listByUser(userId);

    const options = await generateRegistrationOptions({
      rpName: this.rpName,
      rpID: this.rpId,
      userName: user.email,
      userDisplayName: user.name,
      userID: new TextEncoder().encode(userId),
      attestationType: 'none',
      excludeCredentials: existing.map((c) => ({
        id: c.credentialId,
        transports: c.transports as AuthenticatorTransportFuture[],
      })),
      authenticatorSelection: { residentKey: 'required', userVerification: 'preferred' },
    });

    const challengeToken = await this.tokens.signChallenge({
      challenge: options.challenge,
      kind: 'webauthn_reg',
      sub: userId,
    });
    return { options, challengeToken };
  }

  async finishRegistration(
    userId: string,
    response: RegistrationResponseJSON,
    challengeToken: string,
    deviceName?: string,
  ): Promise<PublicCredential> {
    let challenge: string;
    let sub: string | undefined;
    try {
      ({ challenge, sub } = await this.tokens.verifyChallenge(challengeToken, 'webauthn_reg'));
    } catch {
      throw new BadRequestException('défi WebAuthn invalide ou expiré');
    }
    if (sub !== userId) throw new BadRequestException('défi WebAuthn non lié à ce compte');

    let verification;
    try {
      verification = await verifyRegistrationResponse({
        response,
        expectedChallenge: challenge,
        expectedOrigin: this.origins,
        expectedRPID: this.rpId,
      });
    } catch (err) {
      throw new BadRequestException(`enregistrement de la passkey refusé : ${(err as Error).message}`);
    }
    if (!verification.verified || !verification.registrationInfo) {
      throw new BadRequestException('passkey non vérifiée');
    }

    const cred = verification.registrationInfo.credential;
    const existing = await this.credentials.findByCredentialId(cred.id);
    if (existing) {
      throw new BadRequestException('cette passkey est déjà enregistrée');
    }

    const saved = await this.credentials.create({
      userId,
      credentialId: cred.id,
      publicKey: Buffer.from(cred.publicKey).toString('base64url'),
      counter: cred.counter,
      transports: (cred.transports ?? []) as string[],
      deviceName: (deviceName ?? '').trim().slice(0, 120) || null,
    });
    return this.toPublic(saved);
  }

  async startAuthentication() {
    const options = await generateAuthenticationOptions({
      rpID: this.rpId,
      userVerification: 'preferred',
      allowCredentials: [], // clés découvrables : le navigateur propose le compte
    });
    const challengeToken = await this.tokens.signChallenge({
      challenge: options.challenge,
      kind: 'webauthn_auth',
    });
    return { options, challengeToken };
  }

  /** Vérifie l'assertion et renvoie l'identifiant de l'utilisateur authentifié. */
  async finishAuthentication(
    response: AuthenticationResponseJSON,
    challengeToken: string,
  ): Promise<string> {
    let challenge: string;
    try {
      ({ challenge } = await this.tokens.verifyChallenge(challengeToken, 'webauthn_auth'));
    } catch {
      throw new BadRequestException('défi WebAuthn invalide ou expiré');
    }

    const stored = await this.credentials.findByCredentialId(response.id);
    if (!stored) throw new UnauthorizedException('passkey inconnue');

    let verification;
    try {
      verification = await verifyAuthenticationResponse({
        response,
        expectedChallenge: challenge,
        expectedOrigin: this.origins,
        expectedRPID: this.rpId,
        credential: {
          id: stored.credentialId,
          publicKey: Buffer.from(stored.publicKey, 'base64url'),
          counter: stored.counter,
          transports: stored.transports as AuthenticatorTransportFuture[],
        },
      });
    } catch (err) {
      throw new UnauthorizedException(`authentification refusée : ${(err as Error).message}`);
    }
    if (!verification.verified) throw new UnauthorizedException('assertion non vérifiée');

    await this.credentials.updateOnUse(
      stored.credentialId,
      verification.authenticationInfo.newCounter,
    );
    return stored.userId;
  }

  sessionFor(userId: string, userAgent?: string): Promise<AuthResult> {
    return this.auth.sessionFor(userId, userAgent);
  }

  async list(userId: string): Promise<PublicCredential[]> {
    return (await this.credentials.listByUser(userId)).map((c) => this.toPublic(c));
  }

  async remove(userId: string, id: string): Promise<boolean> {
    return this.credentials.deleteForUser(userId, id);
  }

  private toPublic(c: WebAuthnCredentialRecord): PublicCredential {
    return {
      id: c.id,
      deviceName: c.deviceName,
      createdAt: c.createdAt.toISOString(),
      lastUsedAt: c.lastUsedAt ? c.lastUsedAt.toISOString() : null,
    };
  }
}

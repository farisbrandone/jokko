import type { ShopRole } from '@jokko/contracts';
import type { User } from './user.aggregate';

export interface MembershipRecord {
  id: string;
  userId: string;
  shopId: string;
  slug: string;
  role: ShopRole;
}

export interface SessionRecord {
  id: string;
  userId: string;
}

export interface UserRepository {
  save(user: User): Promise<void>;
  findById(id: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  findByPhone(phone: string): Promise<User | null>;
}

export interface OtpChallenge {
  id: string;
  codeHash: string;
  expiresAt: Date;
  attempts: number;
}

export const OTP_CHALLENGE_REPOSITORY = Symbol('OTP_CHALLENGE_REPOSITORY');
export interface OtpChallengeRepository {
  create(phone: string, codeHash: string, expiresAt: Date): Promise<void>;
  latest(phone: string): Promise<OtpChallenge | null>;
  incrementAttempts(id: string): Promise<void>;
  consume(id: string): Promise<void>;
  /** Nombre de codes demandés pour ce numéro depuis `sinceMs` (anti-abus). */
  countSince(phone: string, sinceMs: number): Promise<number>;
}

export const OTP_SMS_SENDER = Symbol('OTP_SMS_SENDER');
export interface OtpSmsSender {
  send(phone: string, code: string): Promise<boolean>;
}

export interface OAuthIdentityRecord {
  userId: string;
  provider: string;
  providerAccountId: string;
}

export const OAUTH_IDENTITY_REPOSITORY = Symbol('OAUTH_IDENTITY_REPOSITORY');
export interface OAuthIdentityRepository {
  find(provider: string, providerAccountId: string): Promise<OAuthIdentityRecord | null>;
  link(
    userId: string,
    provider: string,
    providerAccountId: string,
    email: string | null,
  ): Promise<void>;
}

/** Profil normalisé renvoyé par un fournisseur OAuth après échange du code. */
export interface OAuthProfile {
  providerAccountId: string;
  email: string;
  emailVerified: boolean;
  name: string;
}

export interface OAuthProvider {
  readonly name: string;
  /** URL du fournisseur vers laquelle rediriger l'utilisateur. */
  authorizeUrl(state: string, redirectUri: string): string;
  /** Échange le `code` reçu en retour contre un profil normalisé. */
  exchange(code: string, redirectUri: string): Promise<OAuthProfile>;
}

export const OAUTH_PROVIDERS = Symbol('OAUTH_PROVIDERS');
export interface OAuthProviderRegistry {
  get(name: string): OAuthProvider | null;
  available(): string[];
}

export interface WebAuthnCredentialRecord {
  id: string;
  userId: string;
  credentialId: string;
  publicKey: string;
  counter: number;
  transports: string[];
  deviceName: string | null;
  createdAt: Date;
  lastUsedAt: Date | null;
}

export const WEBAUTHN_CREDENTIAL_REPOSITORY = Symbol('WEBAUTHN_CREDENTIAL_REPOSITORY');
export interface WebAuthnCredentialRepository {
  create(input: {
    userId: string;
    credentialId: string;
    publicKey: string;
    counter: number;
    transports: string[];
    deviceName: string | null;
  }): Promise<WebAuthnCredentialRecord>;
  findByCredentialId(credentialId: string): Promise<WebAuthnCredentialRecord | null>;
  listByUser(userId: string): Promise<WebAuthnCredentialRecord[]>;
  updateOnUse(credentialId: string, counter: number): Promise<void>;
  deleteForUser(userId: string, id: string): Promise<boolean>;
}

export interface ShopMemberContact {
  userId: string;
  email: string;
  name: string;
  role: ShopRole;
}

export interface MembershipRepository {
  grant(userId: string, shopId: string, role: ShopRole): Promise<void>;
  listByUser(userId: string): Promise<MembershipRecord[]>;
  listMembers(shopId: string): Promise<ShopMemberContact[]>;
  find(userId: string, shopId: string): Promise<MembershipRecord | null>;
  remove(userId: string, shopId: string): Promise<boolean>;
}

export interface SessionRepository {
  create(input: {
    userId: string;
    refreshTokenHash: string;
    expiresAt: Date;
    userAgent?: string;
  }): Promise<SessionRecord>;
  findValidByHash(hash: string): Promise<SessionRecord | null>;
  revokeByHash(hash: string): Promise<void>;
  revokeAllForUser(userId: string): Promise<void>;
}

export const USER_REPOSITORY = Symbol('USER_REPOSITORY');
export const MEMBERSHIP_REPOSITORY = Symbol('MEMBERSHIP_REPOSITORY');
export const SESSION_REPOSITORY = Symbol('SESSION_REPOSITORY');

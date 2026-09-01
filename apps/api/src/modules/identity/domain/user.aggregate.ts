import { AggregateRoot, Guard, Result, UniqueId } from '@jokko/domain-kernel';

export interface UserSnapshot {
  id: string;
  email: string;
  phone: string | null;
  name: string;
  passwordHash: string | null;
  isPlatformAdmin: boolean;
  createdAt: string;
  updatedAt: string;
}

/** E-mail synthétique pour un compte créé par téléphone (garde la contrainte NOT NULL UNIQUE). */
export const syntheticEmailForPhone = (phone: string): string =>
  `${phone.replace(/[^\d]/g, '')}@phone.jokko.local`;

export class User extends AggregateRoot {
  private constructor(
    id: UniqueId,
    private _email: string,
    private _phone: string | null,
    private _name: string,
    private _passwordHash: string | null,
    private readonly _isPlatformAdmin: boolean,
    private readonly _createdAt: Date,
    private _updatedAt: Date,
  ) {
    super(id);
  }

  static create(props: { email: string; name: string; passwordHash: string }): Result<User> {
    const checks = Result.combine([
      Guard.againstEmpty(props.email, 'email'),
      Guard.againstEmpty(props.name, 'name'),
      Guard.againstEmpty(props.passwordHash, 'passwordHash'),
    ]);
    if (checks.isErr) return Result.err(String(checks.getError()));
    const now = new Date();
    return Result.ok(
      new User(
        UniqueId.create(),
        props.email.trim().toLowerCase(),
        null,
        props.name.trim(),
        props.passwordHash,
        false,
        now,
        now,
      ),
    );
  }

  /** Compte créé par vérification de numéro (OTP) — sans mot de passe. */
  static createWithPhone(props: { phone: string; name: string }): Result<User> {
    const phone = props.phone.trim();
    if (!/^\+[1-9]\d{6,14}$/.test(phone)) return Result.err('Numéro E.164 attendu');
    const now = new Date();
    return Result.ok(
      new User(
        UniqueId.create(),
        syntheticEmailForPhone(phone),
        phone,
        props.name.trim() || 'Client',
        null,
        false,
        now,
        now,
      ),
    );
  }

  /** Compte créé via un fournisseur OAuth (Google, Facebook…) — sans mot de passe. */
  static createFromOAuth(props: { email: string; name: string }): Result<User> {
    const email = props.email.trim().toLowerCase();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return Result.err('E-mail OAuth invalide');
    const now = new Date();
    return Result.ok(
      new User(
        UniqueId.create(),
        email,
        null,
        props.name.trim() || 'Compte',
        null,
        false,
        now,
        now,
      ),
    );
  }

  static restore(snap: UserSnapshot): User {
    return new User(
      UniqueId.create(snap.id),
      snap.email,
      snap.phone,
      snap.name,
      snap.passwordHash,
      snap.isPlatformAdmin,
      new Date(snap.createdAt),
      new Date(snap.updatedAt),
    );
  }

  get email(): string {
    return this._email;
  }
  get phone(): string | null {
    return this._phone;
  }
  get name(): string {
    return this._name;
  }
  get passwordHash(): string | null {
    return this._passwordHash;
  }
  get isPlatformAdmin(): boolean {
    return this._isPlatformAdmin;
  }

  toSnapshot(): UserSnapshot {
    return {
      id: this.id.value,
      email: this._email,
      phone: this._phone,
      name: this._name,
      passwordHash: this._passwordHash,
      isPlatformAdmin: this._isPlatformAdmin,
      createdAt: this._createdAt.toISOString(),
      updatedAt: this._updatedAt.toISOString(),
    };
  }
}

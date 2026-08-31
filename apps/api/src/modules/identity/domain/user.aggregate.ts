import { AggregateRoot, Guard, Result, UniqueId } from '@jokko/domain-kernel';

export interface UserSnapshot {
  id: string;
  email: string;
  name: string;
  passwordHash: string;
  isPlatformAdmin: boolean;
  createdAt: string;
  updatedAt: string;
}

export class User extends AggregateRoot {
  private constructor(
    id: UniqueId,
    private _email: string,
    private _name: string,
    private _passwordHash: string,
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
        props.name.trim(),
        props.passwordHash,
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
  get name(): string {
    return this._name;
  }
  get passwordHash(): string {
    return this._passwordHash;
  }
  get isPlatformAdmin(): boolean {
    return this._isPlatformAdmin;
  }

  toSnapshot(): UserSnapshot {
    return {
      id: this.id.value,
      email: this._email,
      name: this._name,
      passwordHash: this._passwordHash,
      isPlatformAdmin: this._isPlatformAdmin,
      createdAt: this._createdAt.toISOString(),
      updatedAt: this._updatedAt.toISOString(),
    };
  }
}

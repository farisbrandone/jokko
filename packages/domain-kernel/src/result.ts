/**
 * Result — représente le succès ou l'échec d'une opération métier attendue,
 * sans lever d'exception. Les exceptions restent réservées à l'exceptionnel.
 */
export class Result<T, E = string> {
  private constructor(
    public readonly isOk: boolean,
    private readonly _value?: T,
    private readonly _error?: E,
  ) {
    Object.freeze(this);
  }

  get isErr(): boolean {
    return !this.isOk;
  }

  static ok<T, E = string>(value: T): Result<T, E> {
    return new Result<T, E>(true, value, undefined);
  }

  static err<T = never, E = string>(error: E): Result<T, E> {
    return new Result<T, E>(false, undefined, error);
  }

  /** Récupère la valeur ou lève si l'opération a échoué. À n'utiliser qu'après un contrôle `isOk`. */
  unwrap(): T {
    if (!this.isOk) {
      throw new Error(`Result.unwrap() sur une erreur: ${String(this._error)}`);
    }
    return this._value as T;
  }

  unwrapOr(fallback: T): T {
    return this.isOk ? (this._value as T) : fallback;
  }

  getError(): E {
    if (this.isOk) {
      throw new Error('Result.getError() sur un succès');
    }
    return this._error as E;
  }

  map<U>(fn: (value: T) => U): Result<U, E> {
    return this.isOk ? Result.ok(fn(this._value as T)) : Result.err(this._error as E);
  }

  /** Combine plusieurs Result : premier échec rencontré, sinon ok(void). */
  static combine(results: Array<Result<unknown, unknown>>): Result<void, unknown> {
    for (const r of results) {
      if (r.isErr) return Result.err(r.getError());
    }
    return Result.ok(undefined);
  }
}

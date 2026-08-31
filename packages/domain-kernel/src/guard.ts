import { Result } from './result';

/** Petites vérifications réutilisables qui renvoient un Result plutôt que de lever. */
export const Guard = {
  againstNullOrUndefined(value: unknown, field: string): Result<void> {
    if (value === null || value === undefined) {
      return Result.err(`${field} est requis`);
    }
    return Result.ok(undefined);
  },

  againstEmpty(value: string | undefined | null, field: string): Result<void> {
    if (!value || value.trim().length === 0) {
      return Result.err(`${field} ne peut pas être vide`);
    }
    return Result.ok(undefined);
  },

  inRange(value: number, min: number, max: number, field: string): Result<void> {
    if (Number.isNaN(value) || value < min || value > max) {
      return Result.err(`${field} doit être entre ${min} et ${max}`);
    }
    return Result.ok(undefined);
  },

  atLeast(value: number, min: number, field: string): Result<void> {
    if (Number.isNaN(value) || value < min) {
      return Result.err(`${field} doit être au moins ${min}`);
    }
    return Result.ok(undefined);
  },
};

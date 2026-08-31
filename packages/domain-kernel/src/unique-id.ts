import { randomUUID } from 'node:crypto';

/**
 * Identifiant d'entité. Value object autour d'un UUID v4.
 */
export class UniqueId {
  private constructor(public readonly value: string) {
    Object.freeze(this);
  }

  static create(value?: string): UniqueId {
    return new UniqueId(value ?? randomUUID());
  }

  equals(other?: UniqueId): boolean {
    return !!other && other.value === this.value;
  }

  toString(): string {
    return this.value;
  }
}

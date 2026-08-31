/**
 * ValueObject — objet immuable défini par ses attributs, sans identité.
 * L'égalité est structurelle.
 */
export abstract class ValueObject<T extends object> {
  protected readonly props: Readonly<T>;

  protected constructor(props: T) {
    this.props = Object.freeze({ ...props });
  }

  equals(other?: ValueObject<T>): boolean {
    if (!other) return false;
    return JSON.stringify(this.props) === JSON.stringify(other.props);
  }
}

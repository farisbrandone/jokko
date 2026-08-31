import { UniqueId } from './unique-id';

/**
 * Entity — objet doté d'une identité stable dans le temps.
 * L'égalité repose sur l'identifiant, pas sur les attributs.
 */
export abstract class Entity {
  protected readonly _id: UniqueId;

  protected constructor(id?: UniqueId) {
    this._id = id ?? UniqueId.create();
  }

  get id(): UniqueId {
    return this._id;
  }

  equals(other?: Entity): boolean {
    if (!other) return false;
    if (this === other) return true;
    return this._id.equals(other._id);
  }
}

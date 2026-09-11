import { randomUUID } from 'node:crypto';

export interface BuyerAddress {
  id: string;
  label: string;
  address: string;
}

export interface BuyerSnapshot {
  id: string;
  phone: string;
  name: string | null;
  addresses: BuyerAddress[];
  createdAt: string;
}

const MAX_ADDRESSES = 5;

/** Trie/valide/borne la liste d'adresses enregistrées d'un acheteur. */
export function normalizeAddresses(
  list: { id?: string; label: string; address: string }[],
): BuyerAddress[] {
  const out: BuyerAddress[] = [];
  for (const a of list.slice(0, MAX_ADDRESSES)) {
    const label = a.label.trim().slice(0, 40);
    const address = a.address.trim().slice(0, 300);
    if (!label || !address) continue;
    const id = a.id && /^[\w-]{1,40}$/.test(a.id) ? a.id : randomUUID();
    out.push({ id, label, address });
  }
  return out;
}

/** Compte acheteur léger : identifié par téléphone vérifié par OTP, sans mot de passe. */
export class Buyer {
  private constructor(
    readonly id: string,
    private readonly _phone: string,
    private _name: string | null,
    private _addresses: BuyerAddress[],
    private readonly _createdAt: Date,
  ) {}

  static create(props: { phone: string; name?: string | null }): Buyer {
    return new Buyer(randomUUID(), props.phone, props.name?.trim() || null, [], new Date());
  }

  static restore(s: BuyerSnapshot): Buyer {
    return new Buyer(
      s.id,
      s.phone,
      s.name,
      s.addresses.map((a) => ({ ...a })),
      new Date(s.createdAt),
    );
  }

  get phone(): string {
    return this._phone;
  }
  get name(): string | null {
    return this._name;
  }
  get addresses(): BuyerAddress[] {
    return this._addresses;
  }

  updateProfile(patch: {
    name?: string | null;
    addresses?: { id?: string; label: string; address: string }[];
  }): void {
    if (patch.name !== undefined) this._name = patch.name?.trim() || null;
    if (patch.addresses !== undefined) this._addresses = normalizeAddresses(patch.addresses);
  }

  toSnapshot(): BuyerSnapshot {
    return {
      id: this.id,
      phone: this._phone,
      name: this._name,
      addresses: this._addresses,
      createdAt: this._createdAt.toISOString(),
    };
  }
}

import { Result, ValueObject } from '@jokko/domain-kernel';

interface MoneyProps {
  amount: number; // plus petite unité (XOF: franc entier)
  currency: string;
}

export class Money extends ValueObject<MoneyProps> {
  private constructor(props: MoneyProps) {
    super(props);
  }

  static create(amount: number, currency = 'XOF'): Result<Money> {
    if (!Number.isInteger(amount) || amount < 0) {
      return Result.err('Le montant doit être un entier positif (plus petite unité)');
    }
    if (currency.length !== 3) {
      return Result.err('Devise invalide (code ISO 4217 attendu)');
    }
    return Result.ok(new Money({ amount, currency: currency.toUpperCase() }));
  }

  get amount(): number {
    return this.props.amount;
  }

  get currency(): string {
    return this.props.currency;
  }

  toJSON(): MoneyProps {
    return { amount: this.props.amount, currency: this.props.currency };
  }
}

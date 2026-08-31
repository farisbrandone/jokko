import { Result, ValueObject } from '@jokko/domain-kernel';

interface SlugProps {
  value: string;
}

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const DIACRITICS_RE = /[̀-ͯ]/g;

export class Slug extends ValueObject<SlugProps> {
  private constructor(props: SlugProps) {
    super(props);
  }

  static fromString(raw: string): Result<Slug> {
    const value = Slug.normalize(raw);
    if (value.length < 3 || value.length > 60 || !SLUG_RE.test(value)) {
      return Result.err(`slug invalide dérivé de "${raw}"`);
    }
    return Result.ok(new Slug({ value }));
  }

  static normalize(raw: string): string {
    return raw
      .normalize('NFD')
      .replace(DIACRITICS_RE, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  get value(): string {
    return this.props.value;
  }

  override toString(): string {
    return this.props.value;
  }
}

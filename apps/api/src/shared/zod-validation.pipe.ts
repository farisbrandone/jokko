import { BadRequestException, PipeTransform } from '@nestjs/common';
import type { ZodTypeAny, infer as ZodInfer } from 'zod';

/**
 * Valide et transforme une entrée avec un schéma Zod (issu de @jokko/contracts).
 * Usage : @Body(new ZodValidationPipe(CreateProductSchema)) body: CreateProductInput
 */
export class ZodValidationPipe<T extends ZodTypeAny> implements PipeTransform {
  constructor(private readonly schema: T) {}

  transform(value: unknown): ZodInfer<T> {
    const result = this.schema.safeParse(value);
    if (!result.success) {
      throw new BadRequestException({
        message: 'Requête invalide',
        issues: result.error.issues.map((i) => ({
          path: i.path.join('.'),
          message: i.message,
        })),
      });
    }
    return result.data;
  }
}

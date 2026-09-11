import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import type { AuthenticatedBuyer } from '../guards/buyer.guard';

export const CurrentBuyer = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthenticatedBuyer | undefined => {
    return ctx.switchToHttp().getRequest<{ buyer?: AuthenticatedBuyer }>().buyer;
  },
);

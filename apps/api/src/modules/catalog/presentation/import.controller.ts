import { Body, Controller, HttpCode, Post, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import {
  importCsvSchema,
  importUrlSchema,
  type ImportCsvInput,
  type ImportUrlInput,
} from '@jokko/contracts';
import { ZodValidationPipe } from '../../../shared/zod-validation.pipe';
import { TenantContext } from '../../../shared/tenant/tenant-context';
import { TenantGuard } from '../../shop/tenant/tenant.guard';
import { AuthGuard } from '../../identity/guards/auth.guard';
import { PoliciesGuard } from '../../identity/guards/policies.guard';
import { CheckPolicies } from '../../identity/authz/check-policies.decorator';
import { ImportService } from '../application/import.service';

/** Import de produits depuis une URL (extraction JSON-LD / OpenGraph) ou un CSV. */
@ApiTags('catalog')
@Controller('shops/:shopId/import')
@UseGuards(TenantGuard, AuthGuard, PoliciesGuard)
@CheckPolicies((a) => a.can('create', 'Product'))
export class ImportController {
  constructor(
    private readonly tenant: TenantContext,
    private readonly imports: ImportService,
  ) {}

  @Post('url')
  @HttpCode(200)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  previewUrl(@Body(new ZodValidationPipe(importUrlSchema)) body: ImportUrlInput) {
    return this.imports.previewUrl(this.tenant.getShopId(), body.url);
  }

  @Post('csv')
  @HttpCode(200)
  importCsv(@Body(new ZodValidationPipe(importCsvSchema)) body: ImportCsvInput) {
    return this.imports.importCsv(this.tenant.getShopId(), body.csv);
  }
}

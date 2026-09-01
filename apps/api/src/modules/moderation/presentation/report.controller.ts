import { Body, Controller, HttpCode, Post, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { createReportSchema, type CreateReportInput } from '@jokko/contracts';
import { ZodValidationPipe } from '../../../shared/zod-validation.pipe';
import { TenantContext } from '../../../shared/tenant/tenant-context';
import { TenantGuard } from '../../shop/tenant/tenant.guard';
import { ReportService } from '../application/report.service';

/** Dépôt de signalement depuis la vitrine (public, boutique courante). */
@ApiTags('moderation')
@Controller('shops/:shopId/reports')
@UseGuards(TenantGuard)
export class ReportController {
  constructor(
    private readonly tenant: TenantContext,
    private readonly reports: ReportService,
  ) {}

  @Post()
  @HttpCode(202)
  async submit(
    @Body(new ZodValidationPipe(createReportSchema)) body: CreateReportInput,
  ) {
    const { created } = await this.reports.submit(this.tenant.getShopId(), body);
    return { ok: true, created };
  }
}

import { Body, Controller, Get, Post, Query, Res, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { z } from 'zod';
import type { FastifyReply } from 'fastify';
import { IngestEventsSchema, type IngestEventsInput } from '@jokko/contracts';
import { ZodValidationPipe } from '../../../shared/zod-validation.pipe';
import { TenantGuard } from '../../shop/tenant/tenant.guard';
import { AuthGuard } from '../../identity/guards/auth.guard';
import { PoliciesGuard } from '../../identity/guards/policies.guard';
import { CheckPolicies } from '../../identity/authz/check-policies.decorator';
import { AnalyticsService } from '../application/analytics.service';

const DaysQuerySchema = z.object({
  days: z.coerce.number().int().refine((v) => v === 7 || v === 30, 'days doit valoir 7 ou 30').default(7),
});

const ExportQuerySchema = z.object({
  days: z.coerce.number().int().min(1).max(365).default(90),
});

@ApiTags('analytics')
@Controller('shops/:shopId')
export class AnalyticsController {
  constructor(private readonly analytics: AnalyticsService) {}

  /** Collecte d'événements depuis la vitrine (public, boutille courante). */
  @Post('events')
  @UseGuards(TenantGuard)
  async ingest(
    @Body(new ZodValidationPipe(IngestEventsSchema)) body: IngestEventsInput,
  ) {
    await this.analytics.ingest(body);
    return { ok: true };
  }

  /** Synthèse pour le vendeur. */
  @Get('analytics/summary')
  @UseGuards(TenantGuard, AuthGuard, PoliciesGuard)
  @CheckPolicies((a) => a.can('read', 'Shop'))
  summary(@Query(new ZodValidationPipe(DaysQuerySchema)) query: { days: number }) {
    return this.analytics.summary(query.days);
  }

  /** Export CSV des commandes de la période (comptabilité / suivi). */
  @Get('analytics/export.csv')
  @UseGuards(TenantGuard, AuthGuard, PoliciesGuard)
  @CheckPolicies((a) => a.can('read', 'Shop'))
  async exportCsv(
    @Query(new ZodValidationPipe(ExportQuerySchema)) query: { days: number },
    @Res({ passthrough: true }) res: FastifyReply,
  ) {
    const csv = await this.analytics.exportOrdersCsv(query.days);
    const day = new Date().toISOString().slice(0, 10);
    res.header('content-type', 'text/csv; charset=utf-8');
    res.header('content-disposition', `attachment; filename="jokko-commandes-${day}.csv"`);
    return csv;
  }
}

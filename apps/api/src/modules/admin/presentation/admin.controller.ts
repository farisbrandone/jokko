import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { z } from 'zod';
import {
  impersonateSchema,
  resolveReportSchema,
  type ImpersonateInput,
  type ResolveReportInput,
} from '@jokko/contracts';
import { ZodValidationPipe } from '../../../shared/zod-validation.pipe';
import { AuthGuard } from '../../identity/guards/auth.guard';
import { CurrentUser } from '../../identity/decorators/current-user.decorator';
import { PlatformAdminGuard } from '../../identity/guards/platform-admin.guard';
import { AdminService } from '../application/admin.service';

const ListQuerySchema = z.object({
  q: z.string().trim().max(80).optional(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(30),
});
type ListQuery = z.infer<typeof ListQuerySchema>;

const ReportsQuerySchema = z.object({
  status: z.enum(['pending', 'actioned', 'dismissed']).optional(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(30),
});
type ReportsQuery = z.infer<typeof ReportsQuerySchema>;

const StatusSchema = z.object({ status: z.enum(['active', 'suspended']) });

@ApiTags('admin')
@Controller('admin')
@UseGuards(AuthGuard, PlatformAdminGuard)
export class AdminController {
  constructor(private readonly admin: AdminService) {}

  @Get('overview')
  overview() {
    return this.admin.overview();
  }

  @Get('shops')
  shops(@Query(new ZodValidationPipe(ListQuerySchema)) q: ListQuery) {
    return this.admin.listShops(q.q, q.page, q.pageSize);
  }

  @Get('shops/:id')
  shopDetail(@Param('id', ParseUUIDPipe) id: string) {
    return this.admin.shopDetail(id);
  }

  @Post('shops/:id/status')
  async setStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(StatusSchema)) body: { status: 'active' | 'suspended' },
  ) {
    await this.admin.setShopStatus(id, body.status);
    return { ok: true, status: body.status };
  }

  @Post('impersonate')
  impersonate(
    @CurrentUser() admin: { id: string },
    @Body(new ZodValidationPipe(impersonateSchema)) body: ImpersonateInput,
  ) {
    return this.admin.impersonate(admin.id, body.userId);
  }

  @Get('reports')
  reports(@Query(new ZodValidationPipe(ReportsQuerySchema)) q: ReportsQuery) {
    return this.admin.listReports(q.status, q.page, q.pageSize);
  }

  @Post('reports/:id/resolve')
  resolve(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(resolveReportSchema)) body: ResolveReportInput,
  ) {
    return this.admin.resolveReport(id, body.action);
  }
}

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
import { ZodValidationPipe } from '../../../shared/zod-validation.pipe';
import { AuthGuard } from '../../identity/guards/auth.guard';
import { PlatformAdminGuard } from '../../identity/guards/platform-admin.guard';
import { AdminService } from '../application/admin.service';

const ListQuerySchema = z.object({
  q: z.string().trim().max(80).optional(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(30),
});
type ListQuery = z.infer<typeof ListQuerySchema>;

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

  @Post('shops/:id/status')
  async setStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(StatusSchema)) body: { status: 'active' | 'suspended' },
  ) {
    await this.admin.setShopStatus(id, body.status);
    return { ok: true, status: body.status };
  }
}

import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { UploadUrlRequestSchema, type UploadUrlRequest } from '@jokko/contracts';
import { ZodValidationPipe } from '../../../shared/zod-validation.pipe';
import { TenantContext } from '../../../shared/tenant/tenant-context';
import { TenantGuard } from '../../shop/tenant/tenant.guard';
import { AuthGuard } from '../../identity/guards/auth.guard';
import { PoliciesGuard } from '../../identity/guards/policies.guard';
import { CheckPolicies } from '../../identity/authz/check-policies.decorator';
import { MediaService } from '../application/media.service';

@ApiTags('media')
@Controller('shops/:shopId/media')
export class MediaController {
  constructor(
    private readonly tenant: TenantContext,
    private readonly media: MediaService,
  ) {}

  /** Renvoie une URL PUT pré-signée : le client téléverse directement vers l'object store. */
  @Post('upload-url')
  @UseGuards(TenantGuard, AuthGuard, PoliciesGuard)
  @CheckPolicies((ability) => ability.can('create', 'Product'))
  uploadUrl(
    @Body(new ZodValidationPipe(UploadUrlRequestSchema)) body: UploadUrlRequest,
  ) {
    return this.media.createUploadUrl(this.tenant.getShopId(), body);
  }
}

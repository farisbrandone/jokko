import {
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UnprocessableEntityException,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import {
  CreateShopSchema,
  UpdateShopSchema,
  type CreateShopInput,
  type UpdateShopInput,
} from '@jokko/contracts';
import { ZodValidationPipe } from '../../../shared/zod-validation.pipe';
import { TenantContext } from '../../../shared/tenant/tenant-context';
import { AuthGuard } from '../../identity/guards/auth.guard';
import { PoliciesGuard } from '../../identity/guards/policies.guard';
import { CheckPolicies } from '../../identity/authz/check-policies.decorator';
import { CurrentUser } from '../../identity/decorators/current-user.decorator';
import { CreateShopUseCase } from '../application/use-cases/create-shop.usecase';
import { GetShopUseCase } from '../application/use-cases/get-shop.usecase';
import { UpdateShopUseCase } from '../application/use-cases/update-shop.usecase';
import { TenantGuard } from '../tenant/tenant.guard';
import { TenantResolver } from '../tenant/tenant-resolver';

@ApiTags('shop')
@Controller('shops')
export class ShopController {
  constructor(
    private readonly createShop: CreateShopUseCase,
    private readonly getShop: GetShopUseCase,
    private readonly updateShop: UpdateShopUseCase,
    private readonly resolver: TenantResolver,
    private readonly tenant: TenantContext,
  ) {}

  @Post()
  @UseGuards(AuthGuard)
  async create(
    @CurrentUser() user: { id: string },
    @Body(new ZodValidationPipe(CreateShopSchema)) body: CreateShopInput,
  ) {
    const result = await this.createShop.execute(user.id, body);
    if (result.isErr) throw new UnprocessableEntityException(result.getError());
    const shop = result.unwrap();
    // En-tête tenant signé prêt à l'emploi (frontend edge / clients API).
    return { shop, tenantHeader: this.resolver.signTenantHeader(shop.id) };
  }

  @Get(':slug')
  async bySlug(@Param('slug') slug: string) {
    const shop = await this.getShop.bySlug(slug);
    if (!shop) throw new NotFoundException('Boutique introuvable');
    return shop;
  }

  /** Édition du profil (nom, WhatsApp, thème, couleur de marque) par un membre. */
  @Patch(':shopId')
  @UseGuards(TenantGuard, AuthGuard, PoliciesGuard)
  @CheckPolicies((a) => a.can('update', 'Shop'))
  async update(
    @Param('shopId', ParseUUIDPipe) shopId: string,
    @Body(new ZodValidationPipe(UpdateShopSchema)) body: UpdateShopInput,
  ) {
    if (shopId !== this.tenant.getShopId()) {
      throw new UnprocessableEntityException('Incohérence de boutique');
    }
    const res = await this.updateShop.execute(shopId, body);
    if (res.isErr) throw new UnprocessableEntityException(res.getError());
    return res.unwrap();
  }
}

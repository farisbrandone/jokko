import {
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  Post,
  UnprocessableEntityException,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CreateShopSchema, type CreateShopInput } from '@jokko/contracts';
import { ZodValidationPipe } from '../../../shared/zod-validation.pipe';
import { AuthGuard } from '../../identity/guards/auth.guard';
import { CurrentUser } from '../../identity/decorators/current-user.decorator';
import { CreateShopUseCase } from '../application/use-cases/create-shop.usecase';
import { GetShopUseCase } from '../application/use-cases/get-shop.usecase';
import { TenantResolver } from '../tenant/tenant-resolver';

@ApiTags('shop')
@Controller('shops')
export class ShopController {
  constructor(
    private readonly createShop: CreateShopUseCase,
    private readonly getShop: GetShopUseCase,
    private readonly resolver: TenantResolver,
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
}

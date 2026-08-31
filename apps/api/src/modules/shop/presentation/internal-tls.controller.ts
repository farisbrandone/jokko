import {
  Controller,
  ForbiddenException,
  Get,
  Inject,
  Query,
} from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import type { AppConfig } from '../../../config/configuration';
import {
  SHOP_REPOSITORY,
  type ShopRepository,
} from '../domain/ports/shop.repository';

/**
 * Point d'autorisation pour l'« on-demand TLS » de Caddy : un certificat n'est
 * émis que si le domaine correspond à une boutique (domaine personnalisé) ou au
 * domaine racine des boutiques.
 *   on_demand_tls { ask http://api:3333/api/internal/tls-authorize }
 */
@ApiExcludeController()
@Controller('internal')
export class InternalTlsController {
  private readonly rootDomain: string;

  constructor(
    config: ConfigService<AppConfig, true>,
    @Inject(SHOP_REPOSITORY) private readonly shops: ShopRepository,
  ) {
    this.rootDomain = config.get('tenant', { infer: true }).rootDomain;
  }

  @Get('tls-authorize')
  async authorize(@Query('domain') domain?: string): Promise<{ ok: true }> {
    const host = (domain ?? '').toLowerCase().trim();
    if (host && (host === this.rootDomain || host.endsWith(`.${this.rootDomain}`))) {
      return { ok: true };
    }
    if (host && (await this.shops.findByCustomDomain(host))) {
      return { ok: true };
    }
    throw new ForbiddenException('Domaine non autorisé');
  }
}

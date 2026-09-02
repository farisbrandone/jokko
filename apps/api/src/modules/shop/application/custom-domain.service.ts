import { randomBytes } from 'node:crypto';
import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { CustomDomainStatus } from '@jokko/contracts';
import type { AppConfig } from '../../../config/configuration';
import { SHOP_REPOSITORY, type ShopRepository } from '../domain/ports/shop.repository';
import { DNS_VERIFIER, type DnsVerifier } from '../domain/ports/dns-verifier';

@Injectable()
export class CustomDomainService {
  private readonly rootDomain: string;

  constructor(
    config: ConfigService<AppConfig, true>,
    @Inject(SHOP_REPOSITORY) private readonly shops: ShopRepository,
    @Inject(DNS_VERIFIER) private readonly dns: DnsVerifier,
  ) {
    this.rootDomain = config.get('tenant', { infer: true }).rootDomain;
  }

  private challengeName(domain: string): string {
    return `_jokko-challenge.${domain}`;
  }

  async status(shopId: string): Promise<CustomDomainStatus> {
    const shop = await this.shops.findById(shopId);
    if (!shop) throw new NotFoundException('Boutique introuvable');
    const s = shop.toSnapshot();
    const pending = s.customDomain != null && s.customDomainVerifiedAt == null;
    return {
      domain: s.customDomain,
      verified: s.customDomainVerifiedAt != null,
      verification:
        pending && s.customDomainToken
          ? {
              recordName: this.challengeName(s.customDomain!),
              recordValue: s.customDomainToken,
              cnameTarget: `cname.${this.rootDomain}`,
            }
          : null,
    };
  }

  async request(shopId: string, domainRaw: string): Promise<CustomDomainStatus> {
    const shop = await this.shops.findById(shopId);
    if (!shop) throw new NotFoundException('Boutique introuvable');

    const domain = domainRaw
      .trim()
      .toLowerCase()
      .replace(/^https?:\/\//, '')
      .replace(/\/.*$/, '');
    if (domain === this.rootDomain || domain.endsWith(`.${this.rootDomain}`)) {
      throw new BadRequestException(
        `${this.rootDomain} vous fournit déjà un sous-domaine gratuit ; indiquez un domaine à vous.`,
      );
    }

    const token = `jokko-verify=${randomBytes(16).toString('hex')}`;
    const res = shop.requestCustomDomain(domain, token);
    if (res.isErr) throw new BadRequestException(res.getError());
    await this.shops.save(shop);
    return this.status(shopId);
  }

  async verify(shopId: string): Promise<CustomDomainStatus> {
    const shop = await this.shops.findById(shopId);
    if (!shop) throw new NotFoundException('Boutique introuvable');
    const s = shop.toSnapshot();
    if (!s.customDomain) throw new BadRequestException('Aucun domaine personnalisé à vérifier');
    if (s.customDomainVerifiedAt) return this.status(shopId);
    if (!s.customDomainToken) throw new BadRequestException('Jeton de vérification absent');

    const name = this.challengeName(s.customDomain);
    const records = await this.dns.txtRecords(name);
    if (!records.includes(s.customDomainToken)) {
      throw new BadRequestException(
        `Enregistrement TXT « ${name} » introuvable ou incorrect. La propagation DNS peut prendre quelques minutes.`,
      );
    }

    const confirmed = shop.confirmCustomDomain(new Date());
    if (confirmed.isErr) throw new BadRequestException(confirmed.getError());
    await this.shops.save(shop);
    return this.status(shopId);
  }

  async clear(shopId: string): Promise<void> {
    const shop = await this.shops.findById(shopId);
    if (!shop) throw new NotFoundException('Boutique introuvable');
    shop.clearCustomDomain();
    await this.shops.save(shop);
  }
}

import { createHash, randomInt } from 'node:crypto';
import {
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Buyer as BuyerDto } from '@jokko/contracts';
import type { AppConfig } from '../../../config/configuration';
import {
  OTP_CHALLENGE_REPOSITORY,
  OTP_SMS_SENDER,
  type OtpChallengeRepository,
  type OtpSmsSender,
} from '../../identity/domain/ports';
import { TokenService } from '../../identity/infrastructure/security/token.service';
import { Buyer } from '../domain/buyer.aggregate';
import { BUYER_REPOSITORY, type BuyerRepository } from '../domain/ports';

const MAX_ATTEMPTS = 5;
const sha256 = (v: string) => createHash('sha256').update(v).digest('hex');

function toDto(buyer: Buyer): BuyerDto {
  const s = buyer.toSnapshot();
  return { id: s.id, phone: s.phone, name: s.name, addresses: s.addresses, createdAt: s.createdAt };
}

/**
 * Authentification acheteur par téléphone + OTP — indépendante de l'identité
 * vendeur (`OtpService`/`User`). Réutilise volontairement le même mécanisme
 * de défi OTP (table + repository partagés), mais dupliqué ici : mêler les
 * comptes acheteur au modèle `User` (rôles, boutiques, RBAC) serait une
 * mauvaise séparation des responsabilités pour un gain de code minime.
 */
@Injectable()
export class BuyerAuthService {
  private readonly ttlSec: number;
  private readonly maxPerHour: number;
  private readonly devCode?: string;

  constructor(
    config: ConfigService<AppConfig, true>,
    @Inject(OTP_CHALLENGE_REPOSITORY) private readonly challenges: OtpChallengeRepository,
    @Inject(OTP_SMS_SENDER) private readonly sms: OtpSmsSender,
    @Inject(BUYER_REPOSITORY) private readonly buyers: BuyerRepository,
    private readonly tokens: TokenService,
  ) {
    const otp = config.get('otp', { infer: true });
    this.ttlSec = otp.ttlSec;
    this.maxPerHour = otp.maxPerHour;
    this.devCode = otp.devCode;
  }

  async request(phone: string): Promise<void> {
    const recent = await this.challenges.countSince(phone, 3_600_000);
    if (recent >= this.maxPerHour) {
      throw new HttpException(
        'Trop de demandes de code. Réessayez plus tard.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    const code = this.devCode ?? String(randomInt(0, 1_000_000)).padStart(6, '0');
    await this.challenges.create(phone, sha256(code), new Date(Date.now() + this.ttlSec * 1000));
    await this.sms.send(phone, code);
  }

  async verify(
    phone: string,
    code: string,
    name?: string,
  ): Promise<{ token: string; buyer: BuyerDto }> {
    const challenge = await this.challenges.latest(phone);
    if (!challenge || challenge.expiresAt.getTime() < Date.now()) {
      throw new UnauthorizedException('Code expiré ou introuvable — redemandez-en un');
    }
    if (challenge.attempts >= MAX_ATTEMPTS) {
      await this.challenges.consume(challenge.id);
      throw new UnauthorizedException('Trop de tentatives — redemandez un code');
    }
    if (sha256(code) !== challenge.codeHash) {
      await this.challenges.incrementAttempts(challenge.id);
      throw new UnauthorizedException('Code invalide');
    }
    await this.challenges.consume(challenge.id);

    let buyer = await this.buyers.findByPhone(phone);
    if (!buyer) {
      buyer = Buyer.create({ phone, name });
      await this.buyers.save(buyer);
    } else if (name && !buyer.name) {
      buyer.updateProfile({ name });
      await this.buyers.save(buyer);
    }

    const token = await this.tokens.signBuyer({ buyerId: buyer.id, phone: buyer.phone });
    return { token, buyer: toDto(buyer) };
  }
}

import { createHash, randomInt } from 'node:crypto';
import {
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { AppConfig } from '../../../config/configuration';
import { User } from '../domain/user.aggregate';
import {
  OTP_CHALLENGE_REPOSITORY,
  OTP_SMS_SENDER,
  USER_REPOSITORY,
  type OtpChallengeRepository,
  type OtpSmsSender,
  type UserRepository,
} from '../domain/ports';

const MAX_ATTEMPTS = 5;
const sha256 = (v: string) => createHash('sha256').update(v).digest('hex');

@Injectable()
export class OtpService {
  private readonly logger = new Logger(OtpService.name);
  private readonly ttlSec: number;
  private readonly maxPerHour: number;
  private readonly devCode?: string;

  constructor(
    config: ConfigService<AppConfig, true>,
    @Inject(OTP_CHALLENGE_REPOSITORY) private readonly challenges: OtpChallengeRepository,
    @Inject(OTP_SMS_SENDER) private readonly sms: OtpSmsSender,
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
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
    await this.challenges.create(
      phone,
      sha256(code),
      new Date(Date.now() + this.ttlSec * 1000),
    );
    await this.sms.send(phone, code);
  }

  /** Vérifie le code puis retourne l'id de l'utilisateur (créé si nécessaire). */
  async verify(phone: string, code: string, name?: string): Promise<string> {
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

    const existing = await this.users.findByPhone(phone);
    if (existing) return existing.id.value;

    const created = User.createWithPhone({ phone, name: name ?? 'Client' });
    if (created.isErr) throw new UnauthorizedException(created.getError());
    const user = created.unwrap();
    await this.users.save(user);
    this.logger.log(`compte créé par téléphone (${user.id.value})`);
    return user.id.value;
  }
}

import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import {
  OtpRequestSchema,
  OtpVerifySchema,
  type OtpRequestInput,
  type OtpVerifyInput,
} from '@jokko/contracts';
import { ZodValidationPipe } from '../../../shared/zod-validation.pipe';
import { BuyerAuthService } from '../application/buyer-auth.service';

/** Compte acheteur léger : connexion par téléphone + code SMS, sans mot de passe. */
@ApiTags('buyer')
@Controller('buyer/otp')
// Anti-énumération / force brute, comme l'OTP vendeur.
@Throttle({ default: { limit: 12, ttl: 60_000 } })
export class BuyerAuthController {
  constructor(private readonly auth: BuyerAuthService) {}

  @Post('request')
  @HttpCode(202)
  async request(@Body(new ZodValidationPipe(OtpRequestSchema)) body: OtpRequestInput) {
    await this.auth.request(body.phone);
    return { sent: true };
  }

  @Post('verify')
  async verify(@Body(new ZodValidationPipe(OtpVerifySchema)) body: OtpVerifyInput) {
    return this.auth.verify(body.phone, body.code, body.name);
  }
}

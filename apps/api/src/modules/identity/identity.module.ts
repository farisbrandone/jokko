import { Module, type Provider } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { AppConfig } from '../../config/configuration';
import { AuthService } from './application/auth.service';
import { OtpService } from './application/otp.service';
import { AuthController } from './presentation/auth.controller';
import { PasswordService } from './infrastructure/security/password.service';
import { TokenService } from './infrastructure/security/token.service';
import {
  LogOtpSmsSender,
  TermiiOtpSmsSender,
} from './infrastructure/security/otp-sms.sender';
import { AuthGuard } from './guards/auth.guard';
import { PoliciesGuard } from './guards/policies.guard';
import { PlatformAdminGuard } from './guards/platform-admin.guard';
import {
  MEMBERSHIP_REPOSITORY,
  OTP_CHALLENGE_REPOSITORY,
  OTP_SMS_SENDER,
  SESSION_REPOSITORY,
  USER_REPOSITORY,
} from './domain/ports';
import {
  MikroOrmMembershipRepository,
  MikroOrmOtpChallengeRepository,
  MikroOrmSessionRepository,
  MikroOrmUserRepository,
} from './infrastructure/persistence/identity.repositories';

const otpSmsProvider: Provider = {
  provide: OTP_SMS_SENDER,
  inject: [ConfigService],
  useFactory: (config: ConfigService<AppConfig, true>) => {
    const termii = config.get('notifications', { infer: true }).termii;
    return termii ? new TermiiOtpSmsSender(termii) : new LogOtpSmsSender();
  },
};

@Module({
  controllers: [AuthController],
  providers: [
    AuthService,
    OtpService,
    PasswordService,
    TokenService,
    AuthGuard,
    PoliciesGuard,
    PlatformAdminGuard,
    otpSmsProvider,
    { provide: USER_REPOSITORY, useClass: MikroOrmUserRepository },
    { provide: MEMBERSHIP_REPOSITORY, useClass: MikroOrmMembershipRepository },
    { provide: SESSION_REPOSITORY, useClass: MikroOrmSessionRepository },
    { provide: OTP_CHALLENGE_REPOSITORY, useClass: MikroOrmOtpChallengeRepository },
  ],
  exports: [
    AuthService,
    TokenService,
    AuthGuard,
    PoliciesGuard,
    PlatformAdminGuard,
    USER_REPOSITORY,
    MEMBERSHIP_REPOSITORY,
  ],
})
export class IdentityModule {}

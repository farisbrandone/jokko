import { Module, type Provider } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { AppConfig } from '../../config/configuration';
import { AuthService } from './application/auth.service';
import { OtpService } from './application/otp.service';
import { SocialAuthService } from './application/social-auth.service';
import { WebAuthnService } from './application/webauthn.service';
import { AuthController } from './presentation/auth.controller';
import { OAuthController } from './presentation/oauth.controller';
import { WebAuthnController } from './presentation/webauthn.controller';
import { PasswordService } from './infrastructure/security/password.service';
import { TokenService } from './infrastructure/security/token.service';
import {
  LogOtpSmsSender,
  TermiiOtpSmsSender,
} from './infrastructure/security/otp-sms.sender';
import {
  FacebookOAuthProvider,
  FakeOAuthProvider,
  GoogleOAuthProvider,
  OAuthProviderRegistryImpl,
} from './infrastructure/oauth/providers';
import { AuthGuard } from './guards/auth.guard';
import { PoliciesGuard } from './guards/policies.guard';
import { PlatformAdminGuard } from './guards/platform-admin.guard';
import {
  MEMBERSHIP_REPOSITORY,
  OAUTH_IDENTITY_REPOSITORY,
  OAUTH_PROVIDERS,
  OTP_CHALLENGE_REPOSITORY,
  OTP_SMS_SENDER,
  SESSION_REPOSITORY,
  USER_REPOSITORY,
  WEBAUTHN_CREDENTIAL_REPOSITORY,
  type OAuthProvider,
} from './domain/ports';
import {
  MikroOrmMembershipRepository,
  MikroOrmOAuthIdentityRepository,
  MikroOrmOtpChallengeRepository,
  MikroOrmSessionRepository,
  MikroOrmUserRepository,
  MikroOrmWebAuthnCredentialRepository,
} from './infrastructure/persistence/identity.repositories';

const otpSmsProvider: Provider = {
  provide: OTP_SMS_SENDER,
  inject: [ConfigService],
  useFactory: (config: ConfigService<AppConfig, true>) => {
    const termii = config.get('notifications', { infer: true }).termii;
    return termii ? new TermiiOtpSmsSender(termii) : new LogOtpSmsSender();
  },
};

const oauthRegistryProvider: Provider = {
  provide: OAUTH_PROVIDERS,
  inject: [ConfigService],
  useFactory: (config: ConfigService<AppConfig, true>) => {
    const o = config.get('oauth', { infer: true });
    const providers: OAuthProvider[] = [];
    if (o.google) providers.push(new GoogleOAuthProvider(o.google));
    if (o.facebook) providers.push(new FacebookOAuthProvider(o.facebook));
    if (o.allowFake) providers.push(new FakeOAuthProvider());
    return new OAuthProviderRegistryImpl(providers);
  },
};

@Module({
  controllers: [AuthController, OAuthController, WebAuthnController],
  providers: [
    AuthService,
    OtpService,
    SocialAuthService,
    WebAuthnService,
    PasswordService,
    TokenService,
    AuthGuard,
    PoliciesGuard,
    PlatformAdminGuard,
    otpSmsProvider,
    oauthRegistryProvider,
    { provide: USER_REPOSITORY, useClass: MikroOrmUserRepository },
    { provide: MEMBERSHIP_REPOSITORY, useClass: MikroOrmMembershipRepository },
    { provide: SESSION_REPOSITORY, useClass: MikroOrmSessionRepository },
    { provide: OTP_CHALLENGE_REPOSITORY, useClass: MikroOrmOtpChallengeRepository },
    { provide: OAUTH_IDENTITY_REPOSITORY, useClass: MikroOrmOAuthIdentityRepository },
    {
      provide: WEBAUTHN_CREDENTIAL_REPOSITORY,
      useClass: MikroOrmWebAuthnCredentialRepository,
    },
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

import { Module } from '@nestjs/common';
import { AuthService } from './application/auth.service';
import { AuthController } from './presentation/auth.controller';
import { PasswordService } from './infrastructure/security/password.service';
import { TokenService } from './infrastructure/security/token.service';
import { AuthGuard } from './guards/auth.guard';
import { PoliciesGuard } from './guards/policies.guard';
import { PlatformAdminGuard } from './guards/platform-admin.guard';
import {
  MEMBERSHIP_REPOSITORY,
  SESSION_REPOSITORY,
  USER_REPOSITORY,
} from './domain/ports';
import {
  MikroOrmMembershipRepository,
  MikroOrmSessionRepository,
  MikroOrmUserRepository,
} from './infrastructure/persistence/identity.repositories';

@Module({
  controllers: [AuthController],
  providers: [
    AuthService,
    PasswordService,
    TokenService,
    AuthGuard,
    PoliciesGuard,
    PlatformAdminGuard,
    { provide: USER_REPOSITORY, useClass: MikroOrmUserRepository },
    { provide: MEMBERSHIP_REPOSITORY, useClass: MikroOrmMembershipRepository },
    { provide: SESSION_REPOSITORY, useClass: MikroOrmSessionRepository },
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

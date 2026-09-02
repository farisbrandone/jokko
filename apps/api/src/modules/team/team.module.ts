import { Module } from '@nestjs/common';
import { IdentityModule } from '../identity/identity.module';
import { ShopModule } from '../shop/shop.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { TeamService } from './application/team.service';
import { TeamController } from './presentation/team.controller';
import { InvitationController } from './presentation/invitation.controller';
import { INVITATION_REPOSITORY } from './domain/ports';
import { MikroOrmInvitationRepository } from './infrastructure/persistence/mikro-orm-invitation.repository';

@Module({
  imports: [IdentityModule, ShopModule, NotificationsModule],
  controllers: [TeamController, InvitationController],
  providers: [
    TeamService,
    { provide: INVITATION_REPOSITORY, useClass: MikroOrmInvitationRepository },
  ],
})
export class TeamModule {}

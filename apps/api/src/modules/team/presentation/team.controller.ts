import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import {
  inviteMemberSchema,
  updateMemberRoleSchema,
  type InviteMemberInput,
  type UpdateMemberRoleInput,
} from '@jokko/contracts';
import { ZodValidationPipe } from '../../../shared/zod-validation.pipe';
import { TenantContext } from '../../../shared/tenant/tenant-context';
import { TenantGuard } from '../../shop/tenant/tenant.guard';
import { AuthGuard } from '../../identity/guards/auth.guard';
import { PoliciesGuard } from '../../identity/guards/policies.guard';
import { CheckPolicies } from '../../identity/authz/check-policies.decorator';
import { CurrentUser } from '../../identity/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../identity/guards/auth.guard';
import { TeamService } from '../application/team.service';

/** Gestion des membres et invitations d'une boutique (owner / admin). */
@ApiTags('team')
@Controller('shops/:shopId/members')
@UseGuards(TenantGuard, AuthGuard, PoliciesGuard)
export class TeamController {
  constructor(
    private readonly tenant: TenantContext,
    private readonly team: TeamService,
  ) {}

  @Get()
  @CheckPolicies((a) => a.can('read', 'Shop'))
  members(@CurrentUser() user: AuthenticatedUser) {
    return this.team.listMembers(this.tenant.getShopId(), user.id);
  }

  @Get('invitations')
  @CheckPolicies((a) => a.can('manage', 'Member'))
  invitations() {
    return this.team.listInvitations(this.tenant.getShopId());
  }

  @Post('invitations')
  @CheckPolicies((a) => a.can('manage', 'Member'))
  invite(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(inviteMemberSchema)) body: InviteMemberInput,
  ) {
    return this.team.invite(this.tenant.getShopId(), user.id, body.email, body.role);
  }

  @Delete('invitations/:id')
  @HttpCode(200)
  @CheckPolicies((a) => a.can('manage', 'Member'))
  async revoke(@Param('id') id: string) {
    await this.team.revokeInvitation(this.tenant.getShopId(), id);
    return { revoked: true };
  }

  @Patch(':userId')
  @CheckPolicies((a) => a.can('manage', 'Member'))
  async updateRole(
    @Param('userId') userId: string,
    @Body(new ZodValidationPipe(updateMemberRoleSchema)) body: UpdateMemberRoleInput,
  ) {
    await this.team.updateRole(this.tenant.getShopId(), userId, body.role);
    return { updated: true };
  }

  @Delete(':userId')
  @HttpCode(200)
  @CheckPolicies((a) => a.can('manage', 'Member'))
  async remove(@Param('userId') userId: string) {
    await this.team.removeMember(this.tenant.getShopId(), userId);
    return { removed: true };
  }
}

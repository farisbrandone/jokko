import { createHash, randomBytes } from 'node:crypto';
import {
  ConflictException,
  ForbiddenException,
  GoneException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Invitation, InvitePreview, Member, ShopRole } from '@jokko/contracts';
import type { AppConfig } from '../../../config/configuration';
import {
  MEMBERSHIP_REPOSITORY,
  USER_REPOSITORY,
  type MembershipRepository,
  type UserRepository,
} from '../../identity/domain/ports';
import { SHOP_REPOSITORY, type ShopRepository } from '../../shop/domain/ports/shop.repository';
import { Mailer } from '../../notifications/infrastructure/mailer';
import { renderEmail } from '../../notifications/infrastructure/email-template';
import {
  INVITATION_REPOSITORY,
  type InvitationRecord,
  type InvitationRepository,
} from '../domain/ports';

const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

const ROLE_LABEL: Record<ShopRole, string> = {
  owner: 'propriétaire',
  admin: 'administrateur',
  staff: 'équipier',
  viewer: 'observateur',
};

@Injectable()
export class TeamService {
  private readonly logger = new Logger(TeamService.name);
  private readonly appUrl: string;
  private readonly sha256 = (v: string) => createHash('sha256').update(v).digest('hex');

  constructor(
    config: ConfigService<AppConfig, true>,
    @Inject(INVITATION_REPOSITORY) private readonly invitations: InvitationRepository,
    @Inject(MEMBERSHIP_REPOSITORY) private readonly memberships: MembershipRepository,
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    @Inject(SHOP_REPOSITORY) private readonly shops: ShopRepository,
    private readonly mailer: Mailer,
  ) {
    this.appUrl = config.get('billing', { infer: true }).appPublicUrl.replace(/\/$/, '');
  }

  async listMembers(shopId: string, selfUserId: string): Promise<Member[]> {
    const members = await this.memberships.listMembers(shopId);
    return members.map((m) => ({
      userId: m.userId,
      email: m.email,
      name: m.name,
      role: m.role,
      isSelf: m.userId === selfUserId,
    }));
  }

  async listInvitations(shopId: string): Promise<Invitation[]> {
    const pending = await this.invitations.listPending(shopId);
    const inviterIds = [...new Set(pending.map((p) => p.invitedBy).filter((x): x is string => !!x))];
    const names = new Map<string, string>();
    for (const id of inviterIds) {
      const u = await this.users.findById(id);
      if (u) names.set(id, u.name);
    }
    return pending.map((p) => this.toInvitation(p, p.invitedBy ? (names.get(p.invitedBy) ?? null) : null));
  }

  async invite(
    shopId: string,
    inviterId: string,
    emailRaw: string,
    role: ShopRole,
  ): Promise<Invitation> {
    const email = emailRaw.trim().toLowerCase();
    const inviter = await this.users.findById(inviterId);
    const inviterName = inviter ? inviter.name : 'Un membre';

    const members = await this.memberships.listMembers(shopId);
    if (members.some((m) => m.email.toLowerCase() === email)) {
      throw new ConflictException('Cette personne est déjà membre de la boutique');
    }

    const token = randomBytes(24).toString('base64url');
    const record = await this.invitations.upsertPending({
      shopId,
      email,
      role,
      tokenHash: this.sha256(token),
      invitedBy: inviterId,
      expiresAt: new Date(Date.now() + INVITE_TTL_MS),
    });

    const shop = await this.shops.findById(shopId);
    const shopName = shop ? shop.toSnapshot().name : 'la boutique';
    const link = `${this.appUrl}/invite/${token}`;
    const { html, text } = renderEmail({
      title: `Rejoignez ${shopName} sur Jokko`,
      lines: [
        `${inviterName} vous invite à rejoindre la boutique ${shopName} en tant que ${ROLE_LABEL[role]}.`,
        "Le lien est valable 7 jours. Si vous n'avez pas de compte Jokko, créez-en un avec cette adresse e-mail, puis rouvrez le lien.",
      ],
      cta: { label: "Accepter l'invitation", url: link },
    });
    const ok = await this.mailer.send({
      to: email,
      subject: `Invitation à rejoindre ${shopName} sur Jokko`,
      text,
      html,
    });
    if (!ok) this.logger.warn(`invitation ${email} : e-mail non envoyé`);

    return this.toInvitation(record, inviterName);
  }

  async revokeInvitation(shopId: string, id: string): Promise<void> {
    const removed = await this.invitations.deletePending(id, shopId);
    if (!removed) throw new NotFoundException('Invitation introuvable');
  }

  async updateRole(shopId: string, targetUserId: string, role: ShopRole): Promise<void> {
    const members = await this.memberships.listMembers(shopId);
    const target = members.find((m) => m.userId === targetUserId);
    if (!target) throw new NotFoundException("Ce membre n'existe pas");

    if (target.role === 'owner' && role !== 'owner' && this.ownerCount(members) <= 1) {
      throw new ConflictException('La boutique doit garder au moins un propriétaire');
    }
    await this.memberships.grant(targetUserId, shopId, role);
  }

  async removeMember(shopId: string, targetUserId: string): Promise<void> {
    const members = await this.memberships.listMembers(shopId);
    const target = members.find((m) => m.userId === targetUserId);
    if (!target) throw new NotFoundException("Ce membre n'existe pas");

    if (target.role === 'owner' && this.ownerCount(members) <= 1) {
      throw new ConflictException('Impossible de retirer le dernier propriétaire');
    }
    await this.memberships.remove(targetUserId, shopId);
  }

  async previewInvite(token: string): Promise<InvitePreview> {
    const inv = await this.invitations.findByTokenHash(this.sha256(token));
    if (!inv) throw new NotFoundException('Invitation introuvable ou révoquée');
    const shop = await this.shops.findById(inv.shopId);
    const inviter = inv.invitedBy ? await this.users.findById(inv.invitedBy) : null;
    return {
      shopName: shop ? shop.toSnapshot().name : 'une boutique',
      role: inv.role,
      invitedByName: inviter ? inviter.name : null,
      email: inv.email,
      expired: this.isExpired(inv),
    };
  }

  /** L'utilisateur connecté accepte une invitation. Renvoie la boutique rejointe. */
  async acceptInvite(
    user: { id: string; email: string },
    token: string,
  ): Promise<{ shopId: string; role: ShopRole }> {
    const inv = await this.invitations.findByTokenHash(this.sha256(token));
    if (!inv) throw new NotFoundException('Invitation introuvable ou révoquée');
    if (inv.acceptedAt) throw new ConflictException('Cette invitation a déjà été acceptée');
    if (this.isExpired(inv)) throw new GoneException('Cette invitation a expiré');
    if (inv.email.toLowerCase() !== user.email.toLowerCase()) {
      throw new ForbiddenException('Cette invitation a été envoyée à une autre adresse e-mail');
    }

    await this.memberships.grant(user.id, inv.shopId, inv.role);
    await this.invitations.markAccepted(inv.id);
    return { shopId: inv.shopId, role: inv.role };
  }

  private ownerCount(members: { role: ShopRole }[]): number {
    return members.filter((m) => m.role === 'owner').length;
  }

  private isExpired(inv: InvitationRecord): boolean {
    return inv.acceptedAt != null || inv.expiresAt.getTime() < Date.now();
  }

  private toInvitation(rec: InvitationRecord, invitedByName: string | null): Invitation {
    return {
      id: rec.id,
      email: rec.email,
      role: rec.role,
      invitedByName,
      createdAt: rec.createdAt.toISOString(),
      expiresAt: rec.expiresAt.toISOString(),
    };
  }
}

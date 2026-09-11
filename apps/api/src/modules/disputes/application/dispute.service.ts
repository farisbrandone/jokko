import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type {
  Dispute as DisputeDto,
  DisputeStatus,
  OpenDisputeInput,
  RespondDisputeInput,
} from '@jokko/contracts';
import { ORDER_REPOSITORY, type OrderRepository } from '../../orders/domain/ports';
import { Dispute } from '../domain/dispute.aggregate';
import { DISPUTE_REPOSITORY, type DisputeRepository } from '../domain/ports';

const CONFIRMED_ORDER_STATUSES = new Set(['to_deliver', 'paid', 'fulfilled']);

function toDto(d: Dispute): DisputeDto {
  return d.toSnapshot();
}

@Injectable()
export class DisputeService {
  constructor(
    @Inject(DISPUTE_REPOSITORY) private readonly disputes: DisputeRepository,
    @Inject(ORDER_REPOSITORY) private readonly orders: OrderRepository,
  ) {}

  /** Acheteur : ouvre un litige sur l'une de ses commandes confirmées. */
  async openForOrder(
    orderId: string,
    buyerPhone: string,
    input: OpenDisputeInput,
  ): Promise<DisputeDto> {
    const order = await this.orders.findById(orderId);
    if (!order || order.toSnapshot().buyerPhone !== buyerPhone) {
      throw new NotFoundException('Commande introuvable');
    }
    if (!CONFIRMED_ORDER_STATUSES.has(order.status)) {
      throw new BadRequestException(
        'Cette commande ne peut pas faire l’objet d’un litige pour le moment',
      );
    }
    const existing = await this.disputes.findActiveByOrderId(orderId);
    if (existing) throw new ConflictException('Un litige est déjà en cours pour cette commande');

    const dispute = Dispute.open({
      shopId: order.shopId,
      orderId,
      buyerPhone,
      reason: input.reason,
      description: input.description,
    });
    await this.disputes.save(dispute);
    return toDto(dispute);
  }

  /** Acheteur : consulte le litige actif (non clos) de l'une de ses commandes. */
  async getForOrder(orderId: string, buyerPhone: string): Promise<DisputeDto> {
    const dispute = await this.disputes.findActiveByOrderId(orderId);
    if (!dispute || dispute.buyerPhone !== buyerPhone) {
      throw new NotFoundException('Aucun litige en cours pour cette commande');
    }
    return toDto(dispute);
  }

  /** Acheteur : transmet le litige à la médiation plateforme. */
  async escalate(disputeId: string, buyerPhone: string, note?: string | null): Promise<DisputeDto> {
    const dispute = await this.disputes.findById(disputeId);
    if (!dispute || dispute.buyerPhone !== buyerPhone) {
      throw new NotFoundException('Litige introuvable');
    }
    if (!dispute.canEscalate) {
      throw new ConflictException('Ce litige ne peut plus être transmis à la plateforme');
    }
    dispute.escalate(note);
    await this.disputes.save(dispute);
    return toDto(dispute);
  }

  /** Vendeur : file des litiges de sa boutique. */
  async listForShop(shopId: string, status?: DisputeStatus): Promise<DisputeDto[]> {
    const rows = await this.disputes.listForShop(shopId, status);
    return rows.map(toDto);
  }

  /** Vendeur : répond à un litige, avec ou sans résolution proposée. */
  async respond(
    shopId: string,
    disputeId: string,
    input: RespondDisputeInput,
  ): Promise<DisputeDto> {
    const dispute = await this.disputes.findById(disputeId);
    if (!dispute || dispute.shopId !== shopId) throw new NotFoundException('Litige introuvable');
    if (!dispute.canRespond) {
      throw new ConflictException('Ce litige ne peut plus recevoir de réponse du vendeur');
    }
    dispute.respond(input);
    await this.disputes.save(dispute);
    return toDto(dispute);
  }
}

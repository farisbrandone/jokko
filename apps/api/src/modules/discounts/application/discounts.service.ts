import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type {
  CreateDiscountCodeInput,
  DiscountCode as DiscountCodeDto,
  DiscountPreview,
} from '@jokko/contracts';
import { DiscountCode } from '../domain/discount-code.aggregate';
import { DISCOUNT_CODE_REPOSITORY, type DiscountCodeRepository } from '../domain/ports';

function toDto(d: DiscountCode): DiscountCodeDto {
  const s = d.toSnapshot();
  return {
    id: s.id,
    code: s.code,
    kind: s.kind,
    value: s.value,
    minSubtotal: s.minSubtotal,
    maxRedemptions: s.maxRedemptions,
    redeemedCount: s.redeemedCount,
    expiresAt: s.expiresAt,
    active: s.active,
    createdAt: s.createdAt,
  };
}

const label = (d: DiscountCodeDto): string =>
  d.kind === 'percent' ? `−${d.value} %` : `remise fixe`;

@Injectable()
export class DiscountsService {
  constructor(
    @Inject(DISCOUNT_CODE_REPOSITORY) private readonly repo: DiscountCodeRepository,
  ) {}

  async list(shopId: string): Promise<DiscountCodeDto[]> {
    const rows = await this.repo.listForShop(shopId);
    return rows.map(toDto);
  }

  async create(shopId: string, input: CreateDiscountCodeInput): Promise<DiscountCodeDto> {
    const existing = await this.repo.findByShopAndCode(shopId, input.code);
    if (existing) throw new ConflictException('Un code identique existe déjà');
    const discount = DiscountCode.create({
      shopId,
      code: input.code,
      kind: input.kind,
      value: input.value,
      minSubtotal: input.minSubtotal ?? null,
      maxRedemptions: input.maxRedemptions ?? null,
      expiresAt: input.expiresAt ?? null,
    });
    await this.repo.save(discount);
    return toDto(discount);
  }

  async setActive(shopId: string, id: string, active: boolean): Promise<DiscountCodeDto> {
    const discount = await this.repo.findByShopAndId(shopId, id);
    if (!discount) throw new NotFoundException('Code introuvable');
    discount.setActive(active);
    await this.repo.save(discount);
    return toDto(discount);
  }

  async remove(shopId: string, id: string): Promise<void> {
    const ok = await this.repo.delete(shopId, id);
    if (!ok) throw new NotFoundException('Code introuvable');
  }

  /** Vérifie un code au panier et renvoie le montant de remise (sans le consommer). */
  async preview(shopId: string, code: string, subtotal: number): Promise<DiscountPreview> {
    const discount = await this.repo.findByShopAndCode(shopId, code);
    if (!discount) throw new NotFoundException('Code inconnu');
    const reason = discount.rejectionReason(subtotal);
    if (reason) throw new BadRequestException(reason);
    const dto = toDto(discount);
    return {
      code: dto.code,
      kind: dto.kind,
      value: dto.value,
      discountAmount: discount.computeDiscount(subtotal),
      label: label(dto),
    };
  }
}

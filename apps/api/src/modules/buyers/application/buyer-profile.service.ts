import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { Buyer as BuyerDto, UpdateBuyerInput } from '@jokko/contracts';
import { Buyer } from '../domain/buyer.aggregate';
import { BUYER_REPOSITORY, type BuyerRepository } from '../domain/ports';

function toDto(buyer: Buyer): BuyerDto {
  const s = buyer.toSnapshot();
  return { id: s.id, phone: s.phone, name: s.name, addresses: s.addresses, createdAt: s.createdAt };
}

@Injectable()
export class BuyerProfileService {
  constructor(@Inject(BUYER_REPOSITORY) private readonly buyers: BuyerRepository) {}

  async get(buyerId: string): Promise<BuyerDto> {
    const buyer = await this.buyers.findById(buyerId);
    if (!buyer) throw new NotFoundException('Compte introuvable');
    return toDto(buyer);
  }

  async update(buyerId: string, patch: UpdateBuyerInput): Promise<BuyerDto> {
    const buyer = await this.buyers.findById(buyerId);
    if (!buyer) throw new NotFoundException('Compte introuvable');
    buyer.updateProfile(patch);
    await this.buyers.save(buyer);
    return toDto(buyer);
  }
}

import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { CsvImportResult, DraftProduct } from '@jokko/contracts';
import { SHOP_REPOSITORY, type ShopRepository } from '../../shop/domain/ports/shop.repository';
import { fetchDraftFromUrl } from '../infrastructure/import/url-fetcher';
import { parseProductCsv } from '../infrastructure/import/csv-parser';
import { CreateProductUseCase } from './use-cases/create-product.usecase';

@Injectable()
export class ImportService {
  constructor(
    @Inject(SHOP_REPOSITORY) private readonly shops: ShopRepository,
    private readonly createProduct: CreateProductUseCase,
  ) {}

  private async currency(shopId: string): Promise<string> {
    const shop = await this.shops.findById(shopId);
    if (!shop) throw new NotFoundException('Boutique introuvable');
    return shop.toSnapshot().currency;
  }

  async previewUrl(shopId: string, url: string): Promise<DraftProduct> {
    return fetchDraftFromUrl(url, await this.currency(shopId));
  }

  async importCsv(shopId: string, csv: string): Promise<CsvImportResult> {
    const currency = await this.currency(shopId);
    const rows = parseProductCsv(csv, currency);

    let created = 0;
    const skipped: { line: number; error: string }[] = [];

    for (const row of rows) {
      if (row.error || !row.draft) {
        skipped.push({ line: row.line, error: row.error ?? 'ligne invalide' });
        continue;
      }
      const d = row.draft;
      const res = await this.createProduct.execute(shopId, {
        name: d.name,
        description: d.description,
        category: d.category,
        price: { amount: d.priceAmount, currency: d.currency },
        stock: d.stock,
        images: d.images,
        attributes: {},
      });
      if (res.isErr) skipped.push({ line: row.line, error: res.getError() });
      else created += 1;
    }

    return { created, skipped };
  }
}

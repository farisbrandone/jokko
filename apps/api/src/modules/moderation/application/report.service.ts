import { HttpException, HttpStatus, Inject, Injectable } from '@nestjs/common';
import type { CreateReportInput } from '@jokko/contracts';
import { REPORT_REPOSITORY, type ReportRepository } from '../domain/ports';

const ONE_HOUR_MS = 3_600_000;
const MAX_REPORTS_PER_HOUR = 60;

@Injectable()
export class ReportService {
  constructor(@Inject(REPORT_REPOSITORY) private readonly repo: ReportRepository) {}

  async submit(shopId: string, input: CreateReportInput): Promise<{ created: boolean }> {
    const recent = await this.repo.countRecent(shopId, ONE_HOUR_MS);
    if (recent >= MAX_REPORTS_PER_HOUR) {
      throw new HttpException(
        'Trop de signalements pour cette boutique. Réessayez plus tard.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    return this.repo.create(shopId, input);
  }
}

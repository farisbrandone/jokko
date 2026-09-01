import type { CreateReportInput } from '@jokko/contracts';

export const REPORT_REPOSITORY = Symbol('REPORT_REPOSITORY');

export interface ReportRepository {
  /** Insère un signalement. `created: false` si un « pending » identique existe déjà. */
  create(shopId: string, input: CreateReportInput): Promise<{ created: boolean }>;
  /** Nombre de signalements déposés sur la boutique depuis `sinceMs` (anti-flood). */
  countRecent(shopId: string, sinceMs: number): Promise<number>;
}

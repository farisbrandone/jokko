import { Module } from '@nestjs/common';
import { ShopModule } from '../shop/shop.module';
import { ReportService } from './application/report.service';
import { REPORT_REPOSITORY } from './domain/ports';
import { MikroOrmReportRepository } from './infrastructure/persistence/mikro-orm-report.repository';
import { ReportController } from './presentation/report.controller';

@Module({
  imports: [ShopModule],
  controllers: [ReportController],
  providers: [ReportService, { provide: REPORT_REPOSITORY, useClass: MikroOrmReportRepository }],
})
export class ModerationModule {}

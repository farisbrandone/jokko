import { Module } from '@nestjs/common';
import { IdentityModule } from '../identity/identity.module';
import { AdminDbModule } from '../../shared/admin-db/admin-db.module';
import { PrivacyService } from './application/privacy.service';
import { RetentionCron } from './application/retention.cron';
import { PrivacyController } from './presentation/privacy.controller';

@Module({
  imports: [IdentityModule, AdminDbModule],
  controllers: [PrivacyController],
  providers: [PrivacyService, RetentionCron],
})
export class PrivacyModule {}

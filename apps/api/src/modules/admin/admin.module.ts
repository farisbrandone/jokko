import { Module } from '@nestjs/common';
import { IdentityModule } from '../identity/identity.module';
import { SearchModule } from '../search/search.module';
import { AdminDbModule } from '../../shared/admin-db/admin-db.module';
import { AdminService } from './application/admin.service';
import { AdminController } from './presentation/admin.controller';

@Module({
  imports: [IdentityModule, SearchModule, AdminDbModule],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}

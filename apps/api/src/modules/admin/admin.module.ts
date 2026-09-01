import { Module } from '@nestjs/common';
import { IdentityModule } from '../identity/identity.module';
import { SearchModule } from '../search/search.module';
import { adminDbProvider } from './infrastructure/admin-db';
import { AdminService } from './application/admin.service';
import { AdminController } from './presentation/admin.controller';

@Module({
  imports: [IdentityModule, SearchModule],
  controllers: [AdminController],
  providers: [adminDbProvider, AdminService],
})
export class AdminModule {}

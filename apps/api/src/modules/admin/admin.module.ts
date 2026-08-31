import { Module } from '@nestjs/common';
import { IdentityModule } from '../identity/identity.module';
import { adminDbProvider } from './infrastructure/admin-db';
import { AdminService } from './application/admin.service';
import { AdminController } from './presentation/admin.controller';

@Module({
  imports: [IdentityModule],
  controllers: [AdminController],
  providers: [adminDbProvider, AdminService],
})
export class AdminModule {}

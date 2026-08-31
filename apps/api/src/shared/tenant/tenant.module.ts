import { Global, Module } from '@nestjs/common';
import { TenantContext } from './tenant-context';
import { TenantInterceptor } from './tenant.interceptor';

@Global()
@Module({
  providers: [TenantContext, TenantInterceptor],
  exports: [TenantContext, TenantInterceptor],
})
export class TenantModule {}
